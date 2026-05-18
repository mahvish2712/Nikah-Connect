import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Shield, Lock, ArrowRight, Mail, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, registerWithEmail, createUserProfile, logout, auth, sendMagicLink, finishMagicLinkSignIn, sendPasswordReset } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import { toast } from 'sonner';

const FloatingHeart = ({ delay = 0, size = 20, x = '0' }: { delay?: number, size?: number, x?: string | number }) => (
  <motion.div
    initial={{ y: '110vh', opacity: 0, x }}
    animate={{ 
      y: '-10vh', 
      opacity: [0, 0.4, 0.4, 0],
      rotate: [0, 10, -10, 0]
    }}
    transition={{ 
      duration: 15, 
      repeat: Infinity, 
      delay,
      ease: "linear"
    }}
    className="absolute text-brand-primary pointer-events-none z-0"
  >
    <Heart size={size} fill="currentColor" />
  </motion.div>
);

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  // Handle Magic Link completion
  React.useEffect(() => {
    const checkMagicLink = async () => {
      try {
        const result = await finishMagicLinkSignIn();
        if (result && result.user) {
          const { user, isNewUser } = result;
          await createUserProfile(user.uid, {
            email: user.email,
            name: user.displayName || 'Anonymous',
            photoUrl: user.photoURL || '',
          });
          sessionStorage.setItem('nikaah_session_active', 'true');
          if (isNewUser) {
            console.log("DEBUG: Magic Link Login Sync Active - would trigger welcome mail");
            toast.success('Welcome! Your account is now synced with your email.');
          }
          navigate('/');
        }
      } catch (err: any) {
        setError('The magic link has expired or is invalid. Please request a new one.');
      }
    };
    checkMagicLink();
  }, [navigate]);

  // Auto-redirect if already logged in
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        sessionStorage.setItem('nikaah_session_active', 'true');
        navigate('/', { replace: true });
      }
    });
    return () => unsub();
  }, [navigate]);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('nikaah_remembered_email');
    const savedPassword = localStorage.getItem('nikaah_remembered_pass');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    let stillLoading = true;
    const timeoutId = setTimeout(() => {
      if (stillLoading) {
        setLoading(false);
        setError('Google Sign-in is taking too long. Your browser might be blocking the popup, or you closed it too early. Please try again.');
      }
    }, 20000);

    try {
      const result = await loginWithGoogle();
      stillLoading = false;
      clearTimeout(timeoutId);
      
      if (result && result.user) {
        const { user, isNewUser } = result;
        // For Google login, check if profile exists, if not create basic one
        await createUserProfile(user.uid, {
          email: user.email,
          name: user.displayName || 'Anonymous',
          photoUrl: user.photoURL || '',
        });
        sessionStorage.setItem('nikaah_session_active', 'true');
        
        if (isNewUser) {
          // Simulate "person gets the mail" for sync only for NEW users
          console.log("DEBUG: Google Login Sync Active - would trigger welcome mail");
          toast.success('Welcome! Your journey starts here. Sync mail sent.');
        }
        
        navigate('/');
      }
    } catch (err: any) {
      stillLoading = false;
      clearTimeout(timeoutId);
      console.error("DEBUG: Google Login Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('SIGN-IN CANCELLED: You closed the Google sign-in window.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('POPUP BLOCKED: Your browser blocked the Google sign-in window. Please enable popups for this site.');
      } else {
        setError('Google Sign-in failed. Please check your connection or try a different method.');
      }
    } finally {
      if (stillLoading) setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const handleMagicLinkRequest = async () => {
    if (!email) {
      setError('Please enter your email to receive a sign-in link.');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    setLoading(true);
    setError(null);
    try {
      await sendMagicLink(trimmedEmail);
      setMagicLinkSent(true);
    } catch (err: any) {
      setError('Failed to send magic link. ' + (err.message || 'Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please provide all required fields.');
      return;
    }
    setLoading(true);
    setError(null);

    // Use a ref-like approach for the loading state check in timeout
    let stillLoading = true;

    // Timeout safety
    const timeoutId = setTimeout(() => {
       if (stillLoading && !showSuccess) {
         setLoading(false);
         setError('Authentication is taking longer than expected. Please check your internet connection and try again.');
         console.error("DEBUG: Authentication timeout reached");
       }
    }, 25000);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (mode === 'signup') {
        const isEightDigits = /^\d{8}$/.test(password);
        if (!isEightDigits) {
          setError('REGISTRATION FAILED: Security Code must be exactly 8 digits.');
          setLoading(false);
          stillLoading = false;
          clearTimeout(timeoutId);
          return;
        }
        console.log("DEBUG: Attempting registration for:", trimmedEmail);
        const user = await registerWithEmail(trimmedEmail, password);
        console.log("DEBUG: Auth user created successfully:", user.uid);
        
        if (user) {
          try {
            await createUserProfile(user.uid, {
              email: user.email || trimmedEmail,
              name: name,
              photoUrl: '',
            });
            console.log("DEBUG: User profile created in Firestore");
          } catch (profileErr: any) {
             console.error("DEBUG: Profile creation failed (but user registered):", profileErr);
          }
          
          stillLoading = false;
          setShowSuccess(true);
          // Small delay to show "Account Created" message
          setTimeout(() => {
            sessionStorage.setItem('nikaah_session_active', 'true');
            navigate('/', { replace: true });
          }, 2000);
          return;
        }
      }
      if (mode === 'login') {
        console.log("DEBUG: Attempting login for:", trimmedEmail);
        if (rememberMe) {
          localStorage.setItem('nikaah_remembered_email', trimmedEmail);
          localStorage.setItem('nikaah_remembered_pass', password);
        } else {
          localStorage.removeItem('nikaah_remembered_email');
          localStorage.removeItem('nikaah_remembered_pass');
        }
        await loginWithEmail(trimmedEmail, password);
        console.log("DEBUG: Login successful");
      }
      stillLoading = false;
      sessionStorage.setItem('nikaah_session_active', 'true');
      console.log("DEBUG: Navigating to home");
      navigate('/', { replace: true });
    } catch (err: any) {
      stillLoading = false;
      console.error("DEBUG: Submit Error:", err);
      
      // Attempt to guide user if they might have forgotten password
      const isAuthError = err.code && err.code.startsWith('auth/');
      
      if (err.code === 'auth/email-already-in-use') {
        setError('THIS EMAIL IS ALREADY REGISTERED. If this is you, please switch to "Sign In" mode below.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('SIGN-IN METHOD DISABLED: This feature (like Magic Link) isn\'t active yet. Please use your 8-digit Security Code or "Continue with Google".');
      } else if (err.code === 'auth/too-many-requests') {
        setError('TOO MANY ATTEMPTS: Access is temporarily locked for security. Please wait a few minutes or reset your password.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        if (mode === 'login') {
          const isUni = email.toLowerCase().includes('.edu') || email.toLowerCase().includes('.ac.in');
          const isTargetUser = email.toLowerCase().includes('javed');
          if (isTargetUser) {
            setError('LOGIN FAILED: Incorrect code. If you previously used "Join with Google", please use that again. Otherwise, use "Forgot Password" to reset your 8-digit code.');
          } else {
            setError(`LOGIN FAILED: Incorrect email or password. ${isUni ? 'University account: Use the 8-digit code you created here, NOT your university portal password.' : 'Check your 8-digit code. If new, try the "Register" tab.'}`);
          }
        } else {
          setError('REGISTRATION ERROR: This email is already registered. Please switch to the "Sign In" tab.');
        }
      } else if (err.code === 'auth/weak-password') {
        setError('PASSWORD REJECTED: Choose a more complex 8-digit sequence.');
      } else if (err.code === 'auth/invalid-email') {
        setError('INVALID EMAIL: Please use a standard email format.');
      } else if (err.code === 'auth/network-request-failed' || (err.message && err.message.includes('offline'))) {
        setError('CONNECTION ERROR: We cannot reach the server. Please check your internet connection.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please refresh and try again.');
      }
    } finally {
      if (!showSuccess) setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setResetSent(true);
      setError(null);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      setError('Failed to send reset email. ' + (err.message || 'Please check your email address.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-cream relative overflow-hidden">
      {/* Background Enhancements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <FloatingHeart delay={0} size={24} x="10vw" />
        <FloatingHeart delay={3} size={16} x="30vw" />
        <FloatingHeart delay={7} size={32} x="50vw" />
        <FloatingHeart delay={1} size={20} x="70vw" />
        <FloatingHeart delay={5} size={28} x="90vw" />
        
        {/* Subtle Mesh Grid */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.1] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-brand-primary opacity-5 blur-[150px] -mr-40 -mt-40 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-brand-accent opacity-5 blur-[150px] -ml-40 -mb-40 rounded-full" />
      </div>

      {/* Back Button to Home */}
      <div className="absolute top-8 left-8 z-20">
         <BackButton label="Back to Sanctuary" to="/" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(139,26,26,0.15)] overflow-hidden border border-brand-primary/5 p-10 md:p-12 relative z-10"
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-10"
            >
              <div className="w-24 h-24 bg-brand-primary rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-brand-primary/40 mb-8 border-4 border-brand-accent/20">
                <CheckCircle2 className="text-white" size={48} />
              </div>
              <h2 className="serif text-4xl font-bold text-brand-dark mb-6">Sanctuary Opened</h2>
              <p className="text-gray-500 mb-10 leading-relaxed italic">
                Welcome to NikaahConnect. Your journey has begun. 
                Preparing your private dashboard...
              </p>
              <div className="flex justify-center">
                <div className="flex gap-2">
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 bg-brand-primary rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-3 h-3 bg-brand-accent rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-3 h-3 bg-brand-primary rounded-full" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form">
              {resetSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-brand-primary" size={28} />
                  </div>
                  <h3 className="serif text-2xl font-bold text-brand-dark mb-4">Reset Link Sent</h3>
                  <p className="text-gray-500 text-sm italic leading-relaxed mb-8">
                    We've sent instructions to <span className="font-bold text-brand-dark">{email}</span> to help you reset your password. 
                    Please check your inbox.
                  </p>
                  <button 
                    onClick={() => setResetSent(false)}
                    className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary hover:underline underline-offset-8"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : magicLinkSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="text-brand-primary" size={28} />
                  </div>
                  <h3 className="serif text-2xl font-bold text-brand-dark mb-4">Mail Sent</h3>
                  <p className="text-gray-500 text-sm italic leading-relaxed mb-8">
                    We've sent a magic login link to <span className="font-bold text-brand-dark">{email}</span>. 
                    Please check your inbox (and spam folder) to sign in instantly.
                  </p>
                  <button 
                    onClick={() => setMagicLinkSent(false)}
                    className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary hover:underline underline-offset-8"
                  >
                    Try another method
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-10">
                    <div className="mb-6 relative inline-block">
                      <div className="w-20 h-20 bg-brand-primary rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-brand-primary/30 group transition-all transform rotate-3 hover:rotate-0">
                        {mode === 'login' ? <Lock className="text-white group-hover:scale-110 transition-transform" size={32} /> : <UserPlus className="text-white group-hover:scale-110 transition-transform" size={32} />}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-accent rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                        <Heart size={14} className="text-white fill-white" />
                      </div>
                    </div>
                    <h1 className="serif text-4xl font-bold text-brand-dark mb-2">
                      {mode === 'login' ? 'Welcome Back' : 'Eternal Journey'}
                    </h1>
                    <p className="text-brand-accent text-[10px] font-black uppercase tracking-[0.4em] mb-2 leading-none">
                      {mode === 'login' ? 'Secure Authentication' : 'Create Your Sanctuary'}
                    </p>
                  </div>

                  {/* Mode Switcher */}
                  <div className="bg-brand-cream/50 p-1.5 rounded-2xl flex mb-10 border border-brand-accent/10">
                    <button 
                      onClick={() => { setMode('login'); setError(null); }}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-brand-dark text-white shadow-xl' : 'text-gray-400 hover:text-brand-dark'}`}
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => { setMode('signup'); setError(null); }}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-brand-dark text-white shadow-xl' : 'text-gray-400 hover:text-brand-dark'}`}
                    >
                      Register
                    </button>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-8 p-5 bg-brand-primary/5 border-l-4 border-brand-primary text-brand-primary text-xs rounded-r-xl font-medium"
                    >
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence mode="popLayout">
                      {mode === 'signup' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="relative group"
                        >
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within:text-brand-primary transition-colors">
                            <ArrowRight size={20} />
                          </div>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-14 pl-14 pr-5 bg-brand-cream/30 border border-brand-accent/10 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all text-sm font-medium"
                            required
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-4">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within:text-brand-primary transition-colors">
                          <Mail size={20} />
                        </div>
                        <input
                          type="email"
                          placeholder="Email Address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-14 pl-14 pr-5 bg-brand-cream/30 border border-brand-accent/10 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>

                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-300 group-focus-within:text-brand-primary transition-colors">
                          <Lock size={20} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={mode === 'signup' ? "Create 8-digit Security Code" : "Password or 8-digit Code"}
                          value={password}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (mode === 'signup') {
                              if (/^\d*$/.test(val)) setPassword(val);
                            } else setPassword(val);
                          }}
                          maxLength={mode === 'signup' ? 8 : undefined}
                          className="w-full h-14 pl-14 pr-12 bg-brand-cream/30 border border-brand-accent/10 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all text-sm font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-300 hover:text-brand-dark transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between px-2 pt-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-5 h-5 rounded border-brand-accent/30 text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
                          />
                          <label htmlFor="rememberMe" className="text-xs font-medium text-gray-400 cursor-pointer select-none">
                            Keep Signed In
                          </label>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                          <button 
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-[9px] font-black uppercase tracking-widest text-brand-primary hover:text-brand-dark transition-colors"
                          >
                            Forgot Password?
                          </button>
                          <button 
                            type="button"
                            onClick={handleMagicLinkRequest}
                            className="text-[9px] font-black uppercase tracking-widest text-brand-accent hover:text-brand-dark transition-colors"
                          >
                            Send Magic Link
                          </button>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="w-full h-16 bg-brand-dark text-white rounded-2xl flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-black hover:bg-brand-primary transition-all disabled:opacity-50 mt-8"
                    >
                      {loading ? (
                        <div className="flex items-center gap-4">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                          <span>Authenticating...</span>
                        </div>
                      ) : (
                        <>
                          <span>{mode === 'login' ? 'Enter Sanctuary' : 'Initiate Profile'}</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </motion.button>
                  </form>
                </>
              )}

              {!magicLinkSent && (
                <>
                  <div className="relative my-10">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-cream"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-[0.5em] font-black text-gray-300 bg-white px-6">
                      Fine Selections
                    </div>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02, backgroundColor: '#f9f9f9' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-14 bg-white border border-brand-accent/20 rounded-2xl flex items-center justify-center gap-4 hover:border-brand-accent transition-all font-bold text-brand-dark shadow-sm"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    <span className="text-xs uppercase tracking-widest font-black">Join with Google</span>
                  </motion.button>

                  <div className="mt-8 text-center text-[9px] text-gray-400 italic">
                    Synced with your mail for instant access. <br className="md:hidden" />
                    Use your password or magic link for secure entry.
                  </div>
                </>
              )}
              
              <div className="mt-12 text-center pt-8 border-t border-brand-cream">
                <button 
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-gray-400 font-medium text-xs hover:text-brand-primary transition-colors group"
                >
                  {mode === 'login' ? (
                    <>New to the sanctuary? <span className="text-brand-primary font-black uppercase tracking-widest ml-2 group-hover:underline">Register</span></>
                  ) : (
                    <>Already a member? <span className="text-brand-primary font-black uppercase tracking-widest ml-2 group-hover:underline">Sign In</span></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-10 text-center space-y-6 pt-6 border-t border-brand-cream/50">
          <p className="text-[10px] text-gray-400 italic">
            Secure connection powered by NikaahConnect Architecture. 
            <br />End-to-end encrypted session.
          </p>
          
          <button 
            type="button"
            onClick={async () => {
              try {
                await logout();
              } catch (e) {}
              window.sessionStorage.clear();
              window.localStorage.clear();
              // Clear all cookies
              const cookies = document.cookie.split(";");
              for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              }
              window.location.reload();
            }}
            className="text-[9px] uppercase tracking-widest text-brand-primary opacity-50 hover:opacity-100 transition-opacity font-black"
          >
            Reset App Data
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
