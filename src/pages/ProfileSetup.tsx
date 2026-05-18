import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, MapPin, Briefcase, GraduationCap, Camera, Check, ArrowLeft, Hash } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import InterestTagInput from '../components/profile/InterestTagInput';

export default function ProfileSetup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500; // Good quality but small size
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG for space efficiency
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setProfile(p => ({ ...p, photoUrl: base64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  const [profile, setProfile] = useState({
    name: '',
    age: 25,
    location: '',
    profession: '',
    education: '',
    bio: '',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop',
    interests: [] as string[],
    gender: 'female' as 'male' | 'female',
    religion: 'Islam',
    height: "5'5\"",
    maritalStatus: 'Never Married',
    motherTongue: 'Urdu',
    familyType: 'Nuclear',
    sect: 'Sunni',
    religiosity: 'Practicing',
    skinTone: 'Fair'
  });

  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!auth.currentUser) return;
      
      try {
        const docRef = doc(db, 'profiles', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(p => ({
            ...p,
            ...data
          }));

          // Determine current step based on filled data
          if (data.profileComplete) {
             setStep(5);
          } else if (data.bio) {
             setStep(4);
          } else if (data.height) {
             setStep(3);
          } else if (data.location || data.profession || data.education) {
             setStep(2);
          } else {
             setStep(1);
          }
        } else if (auth.currentUser.displayName) {
          setProfile(p => ({ ...p, name: auth.currentUser?.displayName || '' }));
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadExistingProfile();
  }, [navigate]);

  const handleUpdate = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const profileRef = doc(db, 'profiles', auth.currentUser.uid);
      await setDoc(profileRef, {
        ...profile,
        uid: auth.currentUser.uid,
        profileComplete: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      // Update Auth profile for immediate consistency
      await updateProfile(auth.currentUser, {
        displayName: profile.name,
        photoURL: profile.photoUrl
      });
      
      // We'll show the success message in the UI for a brief moment before navigating
      setStep(4); 
      toast.success("Profile completed! Welcome to our community.");
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);
    } catch (error) {
      console.error("DEBUG: Profile Setup Error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!auth.currentUser) return;
    try {
      const profileRef = doc(db, 'profiles', auth.currentUser.uid);
      await setDoc(profileRef, {
        ...profile,
        uid: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNextStep = async () => {
    await saveProgress();
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-brand-cream/30 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
           <BackButton label="Return to Home" />
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full mb-4"
            />
            <p className="text-gray-500 font-medium italic">Saving your beautiful profile...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-xl p-8 md:p-12 border border-brand-primary/5">
          <div className="mb-10 text-center">
            <h1 className="serif text-3xl font-bold text-brand-dark mb-2">Complete Your Profile</h1>
            <p className="text-gray-500 text-sm italic">Let us get to know you better to find your perfect match.</p>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mb-12">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-brand-accent' : 'bg-brand-cream'}`} />
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); step < 4 ? handleNextStep() : handleUpdate(); }}>
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex flex-col items-center mb-8">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group mb-4 cursor-pointer"
                  >
                    <img 
                      src={profile.photoUrl} 
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform" 
                      alt="Profile Preview"
                    />
                    <div className="absolute inset-0 bg-brand-dark/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <Camera className="text-white" size={24} />
                      <span className="text-[8px] text-white font-bold uppercase tracking-widest">Change Photo</span>
                    </div>
                    {/* Hidden input */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handlePhotoChange} 
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">Click the image to upload your own photo</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        value={profile.name} 
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full h-14 pl-12 pr-4 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Age</label>
                    <input 
                      type="number" 
                      value={profile.age} 
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      min="18" max="100"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Gender</label>
                  <div className="flex gap-4">
                    {['male', 'female'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setProfile({ ...profile, gender: g as 'male' | 'female' })}
                        className={`flex-1 h-14 rounded-2xl border-2 transition-all font-bold text-sm capitalize ${profile.gender === g ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent bg-brand-cream/30 text-gray-400'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Current Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={profile.location} 
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, Country"
                      className="w-full h-14 pl-12 pr-4 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Profession</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={profile.profession} 
                      onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                      placeholder="e.g. Software Engineer"
                      className="w-full h-14 pl-12 pr-4 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Highest Education</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={profile.education} 
                      onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                      placeholder="e.g. Masters in Architecture"
                      className="w-full h-14 pl-12 pr-4 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      required 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Height</label>
                      <input 
                        type="text" 
                        value={profile.height} 
                        onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                        placeholder="e.g. 5ft 5in"
                        className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                        required 
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Marital Status</label>
                    <select 
                      value={profile.maritalStatus} 
                      onChange={(e) => setProfile({ ...profile, maritalStatus: e.target.value })}
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm"
                      required
                    >
                      <option value="Never Married">Never Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widow/Widower">Widow/Widower</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Mother Tongue</label>
                    <input 
                      type="text" 
                      value={profile.motherTongue} 
                      onChange={(e) => setProfile({ ...profile, motherTongue: e.target.value })}
                      placeholder="e.g. Urdu, Hindi, English"
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Complexion</label>
                    <input 
                      type="text" 
                      value={profile.skinTone} 
                      onChange={(e) => setProfile({ ...profile, skinTone: e.target.value })}
                      placeholder="e.g. Fair, Wheatish"
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Sect</label>
                    <select 
                      value={profile.sect} 
                      onChange={(e) => setProfile({ ...profile, sect: e.target.value })}
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm"
                      required
                    >
                      <option value="Sunni">Sunni</option>
                      <option value="Shia">Shia</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Religion</label>
                    <input 
                      type="text" 
                      value={profile.religion} 
                      onChange={(e) => setProfile({ ...profile, religion: e.target.value })}
                      placeholder="e.g. Islam"
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Religiosity</label>
                    <select 
                      value={profile.religiosity} 
                      onChange={(e) => setProfile({ ...profile, religiosity: e.target.value })}
                      className="w-full h-14 px-6 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm"
                      required
                    >
                      <option value="Practicing">Practicing</option>
                      <option value="Very Practicing">Very Practicing</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Non-practicing">Non-practicing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Family Type</label>
                  <div className="flex gap-4">
                    {['Nuclear', 'Joint'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setProfile({ ...profile, familyType: t })}
                        className={`flex-1 h-14 rounded-2xl border-2 transition-all font-bold text-sm ${profile.familyType === t ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent bg-brand-cream/30 text-gray-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                    <Hash size={14} className="text-brand-accent" /> Your Interests
                  </label>
                  <InterestTagInput 
                    selectedInterests={profile.interests}
                    onChange={(interests) => setProfile({ ...profile, interests })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Bio / About You</label>
                  <textarea 
                    value={profile.bio} 
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself, your goals, and what you're looking for..."
                    className="w-full h-40 p-6 bg-brand-cream/30 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm italic leading-relaxed" 
                    required 
                  />
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-green-200 mb-6">
                   <motion.div
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ delay: 0.2, type: "spring" }}
                   >
                     <Check className="text-white" size={40} />
                   </motion.div>
                </div>
                <h2 className="serif text-3xl font-bold text-brand-dark mb-4">Mubarak!</h2>
                <p className="text-gray-500 mb-8 leading-relaxed italic">
                  Your profile is now complete and visible to the community. 
                  Taking you to your dashboard now...
                </p>
                <div className="flex justify-center">
                  <div className="flex gap-1.5">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-brand-primary rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand-primary rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand-primary rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}

            {step < 5 && (
              <div className="mt-12 flex gap-4">
                {step > 1 && (
                  <button 
                    type="button" 
                    onClick={() => setStep(step - 1)}
                    className="w-32 h-14 border-2 border-brand-primary/10 text-gray-500 rounded-2xl font-bold hover:bg-brand-cream/50 transition-all"
                  >
                    Prev
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-14 bg-brand-primary text-white rounded-2xl font-bold shadow-xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Finalizing...' : (step === 4 ? 'Complete Setup' : 'Continue')}
                  <Check size={20} />
                </motion.button>
              </div>
            )}
          </form>
          </div>
        )}
      </div>
    </div>
  );
}
