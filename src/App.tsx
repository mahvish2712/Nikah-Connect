/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import ProfileDetail from './pages/ProfileDetail';
import Subscription from './pages/Subscription';
import Calls from './pages/Calls';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import EditProfile from './pages/EditProfile';
import About from './pages/About';
import Safety from './pages/Safety';
import Footer from './components/layout/Footer';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { Toaster } from 'sonner';
import CallOverlay from './components/common/CallOverlay';

export default function App() {
  return (
    <Router>
      <AppContent />
      <CallOverlay />
      <Toaster position="top-center" richColors />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('nikaah_chat_theme') || 'classic');

  useEffect(() => {
    // Theme synchronization logic
    if (userProfile?.preferredTheme) {
      if (userProfile.preferredTheme !== theme) {
        console.log("DEBUG: Syncing theme from Firestore:", userProfile.preferredTheme);
        setTheme(userProfile.preferredTheme);
        localStorage.setItem('nikaah_chat_theme', userProfile.preferredTheme);
      }
    } else if (user && theme !== 'classic') {
      // If we have a user but no preferredTheme in Firestore, and the local theme is not classic,
      // we should eventually sync this to Firestore. But for now, we just ensure local parity.
    }
  }, [userProfile?.preferredTheme, user]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedTheme = localStorage.getItem('nikaah_chat_theme') || 'classic';
      if (storedTheme !== theme) {
        setTheme(storedTheme);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also periodically check for changes if not triggered by event (same tab)
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Safety timeout for initial loading
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // Increased to 10s for mobile stability

    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (u) => {
      console.log("DEBUG: Auth State Changed:", u ? `${u.uid} (${u.email})` : "null");
      setUser(u);
      
      // Cleanup previous profile listener if it exists
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (u) {
        console.log("DEBUG: Setting up profile listener for:", u.uid);
        profileUnsub = onSnapshot(doc(db, 'profiles', u.uid), (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            console.log("DEBUG: Profile update received:", profileData?.profileComplete ? "Complete" : "Incomplete");
            setUserProfile(profileData);
          } else {
            console.log("DEBUG: Profile document not found");
            setUserProfile(null);
          }
          setLoading(false);
          clearTimeout(safetyTimeout);
        }, (err) => {
          console.error("Profile listener error:", err);
          setLoading(false);
          clearTimeout(safetyTimeout);
          if (err.message.includes('permission')) {
            handleFirestoreError(err, OperationType.GET, `profiles/${u.uid}`);
          }
        });
      } else {
        setUserProfile(null);
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
      clearTimeout(safetyTimeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <HeartIcon className="text-brand-primary w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  const showNavbar = !['/login', '/profile-setup'].includes(location.pathname);
  const showFooter = !['/login', '/profile-setup'].includes(location.pathname);

  const getThemeClass = () => {
    switch(theme) {
      case 'night': return 'bg-gray-900 text-white selection:bg-brand-primary';
      case 'peach': return 'bg-[#fff5f0] text-brand-dark selection:bg-brand-accent';
      case 'ocean': return 'bg-[#f0f8ff] text-brand-dark selection:bg-blue-200';
      case 'lavender': return 'bg-[#f8f0ff] text-brand-dark selection:bg-purple-200';
      default: return 'bg-brand-cream text-brand-dark selection:bg-brand-accent';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative transition-colors duration-500 ${getThemeClass()} bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')]`}>
      {showNavbar && <Navbar user={user} profile={userProfile} />}
      <main className={`flex-grow ${showNavbar ? 'pb-20 md:pb-0' : ''}`}>
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={<PageWrapper><Home user={user} profile={userProfile} /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            
            {/* Protected Routes */}
            <Route path="/profile-setup" element={<RequireAuth user={user}><PageWrapper><ProfileSetup /></PageWrapper></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth user={user}><PageWrapper><Dashboard profile={userProfile} /></PageWrapper></RequireAuth>} />
            <Route path="/discover" element={<RequireAuth user={user}><PageWrapper><Discover profile={userProfile} /></PageWrapper></RequireAuth>} />
            <Route path="/matches" element={<RequireAuth user={user}><PageWrapper><Matches /></PageWrapper></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth user={user}><PageWrapper><Messages /></PageWrapper></RequireAuth>} />
            <Route path="/calls" element={<RequireAuth user={user}><PageWrapper><Calls /></PageWrapper></RequireAuth>} />
            <Route path="/profile/:id" element={<RequireAuth user={user}><PageWrapper><ProfileDetail /></PageWrapper></RequireAuth>} />
            <Route path="/edit-profile" element={<RequireAuth user={user}><PageWrapper><EditProfile /></PageWrapper></RequireAuth>} />
            <Route path="/subscribe" element={<RequireAuth user={user}><PageWrapper><Subscription profile={userProfile} /></PageWrapper></RequireAuth>} />
            <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
            <Route path="/safety" element={<PageWrapper><Safety /></PageWrapper>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

function ProfileSetupGuard({ children, profile }: { children: React.ReactNode, profile: any }) {
  if (!profile?.profileComplete) {
    return <Navigate to="/profile-setup" replace />;
  }
  return <>{children}</>;
}

function RequireAuth({ children, user }: { children: React.ReactNode, user: any }) {
  // Only use user from App state, which correctly reflects Firebase status
  const isLoggedIn = !!user;
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

const HeartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
