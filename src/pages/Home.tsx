import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Shield, Globe, Users, Search, Target, MessageCircle, MapPin, X, TrendingUp, CheckCircle2, Send, Loader2, ChevronLeft, Mail, Phone, Instagram, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';

const FloatingHeart = ({ delay = 0, size = 20, x = '0' }: { delay?: number, size?: number, x?: string | number }) => (
  <motion.div
    initial={{ y: '100%', opacity: 0, x }}
    animate={{ 
      y: '-20%', 
      opacity: [0, 0.4, 0.4, 0],
      rotate: [0, 20, -20, 0]
    }}
    transition={{ 
      duration: 12, 
      repeat: Infinity, 
      delay,
      ease: "linear"
    }}
    className="absolute text-brand-accent pointer-events-none z-10"
  >
    <Heart size={size} fill="currentColor" />
  </motion.div>
);

const CommunityModal = ({ isOpen, onClose, onJoin }: { isOpen: boolean, onClose: () => void, onJoin: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-dark/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-brand-primary/5"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-brand-cream/50 rounded-full flex items-center justify-center text-brand-dark hover:bg-brand-primary hover:text-white transition-all z-10"
          >
            <X size={20} />
          </button>

          <div className="grid md:grid-cols-2">
            <div className="bg-brand-primary p-12 text-white flex flex-col justify-center">
              <TrendingUp className="text-brand-accent mb-6" size={48} />
              <h2 className="serif text-4xl font-bold mb-6">Growing Fast.</h2>
              <p className="text-white/80 font-light leading-relaxed mb-8">
                Every hour, hundreds of serious seekers join our community to find their blessed partner.
              </p>
              <div className="space-y-4">
                {[
                  '1,200+ New Members Today',
                  '50,000+ Success Stories',
                  'Verified Profiles Only'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 size={16} className="text-brand-accent" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-12 flex flex-col justify-center text-center md:text-left">
              <span className="text-brand-primary font-black tracking-[0.4em] text-[10px] uppercase mb-4 block">Be Part of the Journey</span>
              <h3 className="serif text-3xl font-bold text-brand-dark mb-6">Join the Global Movement</h3>
              <p className="text-gray-500 font-light text-sm mb-10 leading-relaxed italic">
                Experience a platform where faith meets technology. Your journey to half your deen starts with a single step.
              </p>
              <button 
                onClick={onJoin}
                className="w-full px-8 py-5 bg-brand-accent text-white rounded-2xl font-bold shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Create Your Account
              </button>
              <p className="text-[10px] text-gray-400 mt-6 text-center">
                100% Secure & Private. No Credit Card Required.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const CompatibilityModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-dark/90 backdrop-blur-xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-md bg-white rounded-[3rem] md:rounded-[4rem] p-8 md:p-10 shadow-2xl border border-brand-primary/5 text-center overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent" />
          
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-gray-400 hover:text-brand-dark transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
            >
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all">
                <ChevronLeft size={16} />
              </div>
              <span className="hidden sm:inline">Back</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-brand-dark transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-4 md:mb-6 inline-block p-4 md:p-5 bg-brand-accent/10 rounded-full">
            <Target className="text-brand-accent" size={28} />
          </div>

          <h2 className="serif text-3xl md:text-4xl font-bold text-brand-dark mb-1">Harmony Engine</h2>
          <p className="text-gray-500 font-light italic mb-6 md:mb-8 text-xs md:text-sm">Analyzing spiritual and character alignment.</p>

          <div className="relative w-36 h-36 md:w-44 md:h-44 mx-auto mb-6 md:mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-gray-100"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={276.46}
                initial={{ strokeDashoffset: 276.46 }}
                animate={{ strokeDashoffset: 276.46 * (1 - 0.94) }}
                transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                strokeLinecap="round"
                fill="transparent"
                className="text-brand-accent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-3xl md:text-4xl font-black text-brand-dark"
              >
                94%
              </motion.span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-brand-accent">Match</span>
            </div>
          </div>

          <div className="space-y-3 md:space-y-4 text-left max-w-[240px] mx-auto">
             {[
               { label: 'Faith Alignment', value: 'High' },
               { label: 'Family Values', value: 'Exceptional' },
               { label: 'Life Goals', value: 'Symmetric' }
             ].map((attr, i) => (
               <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-2">
                 <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400">{attr.label}</span>
                 <span className="text-[9px] md:text-[10px] font-black text-brand-primary uppercase tracking-widest">{attr.value}</span>
               </div>
             ))}
          </div>

          <button 
            onClick={onClose}
            className="mt-6 md:mt-10 w-full py-4 bg-brand-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-brand-primary transition-all shadow-xl active:scale-95"
          >
            Refine Profile
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-dark/95 backdrop-blur-2xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-4xl bg-[#0F0F0F] rounded-[3rem] md:rounded-[4rem] overflow-hidden shadow-2xl border border-white/5 max-h-[95vh] overflow-y-auto hide-scrollbar"
        >
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 md:top-10 md:left-10 md:right-10">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-all border border-white/10">
                <ChevronLeft size={16} md:size={20} />
              </div>
              <span className="hidden sm:inline">Back</span>
            </button>
            <button 
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-16 flex flex-col justify-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-accent/20 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-brand-accent/30">
                <Shield className="text-brand-accent" size={24} md:size={32} />
              </div>
              <h2 className="serif text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6">Obsidian <br/><span className="text-brand-accent">Protocol</span></h2>
              <p className="text-white/40 font-light text-base md:text-lg mb-8 md:mb-12 leading-relaxed">
                Your conversations are guarded by asymmetric encryption. No one, not even NikaahConnect, can read your private communications.
              </p>
              
              <div className="space-y-4 md:space-y-6">
                 {[
                   { icon: <CheckCircle2 size={18} />, text: 'End-to-End Encryption' },
                   { icon: <CheckCircle2 size={18} />, text: 'Zero-Knowledge Storage' },
                   { icon: <CheckCircle2 size={18} />, text: 'Private Profile Mode' }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-4 text-white/60">
                      <div className="text-brand-accent">{item.icon}</div>
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">{item.text}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="bg-white/5 p-8 md:p-16 flex flex-col justify-center relative overflow-hidden hidden md:flex">
               {/* Terminal-like UI for secure messaging */}
               <div className="bg-black/40 rounded-3xl p-6 md:p-8 border border-white/10 backdrop-blur-md relative z-10">
                  <div className="flex items-center gap-4 mb-6 md:mb-10 pb-4 md:pb-6 border-b border-white/5">
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Secure Tunnel: Active</span>
                  </div>

                  <div className="space-y-6 md:space-y-8">
                     <div className="flex flex-col gap-3">
                        <div className="w-3/4 h-10 md:h-12 bg-white/5 rounded-2xl rounded-bl-none border border-white/5 flex items-center px-4 md:px-6">
                           <div className="w-1/2 h-1 bg-brand-accent/20 rounded-full" />
                        </div>
                        <span className="text-[7px] md:text-[8px] font-bold text-white/20 uppercase tracking-widest px-2">Outgoing: Encrypting...</span>
                     </div>

                     <div className="flex flex-col items-end gap-3">
                        <div className="w-3/4 h-10 md:h-12 bg-brand-accent/20 rounded-2xl rounded-br-none border border-brand-accent/20 flex items-center justify-end px-4 md:px-6">
                           <div className="w-2/3 h-1 bg-white/20 rounded-full" />
                        </div>
                        <span className="text-[7px] md:text-[8px] font-bold text-brand-accent uppercase tracking-widest px-2">Incoming: Decrypted</span>
                     </div>
                  </div>

                  <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/5 text-center">
                    <p className="font-mono text-[8px] md:text-[9px] text-white/20 break-all leading-tight">
                      AE2-991-X-001001-NI-KAAH-CONNECT-SECURE-KEY-VERIFIED
                    </p>
                  </div>
               </div>

               <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-accent opacity-5 blur-[100px]" />
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function Home({ user, profile }: { user: any, profile: any }) {
  const navigate = useNavigate();
  const [communityProfiles, setCommunityProfiles] = useState<any[]>([]);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  
  const [queryLoading, setQueryLoading] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);

  const extraProfiles = [
    { 
      name: "Mahvish Siddiqui", age: 23, location: "Lucknow, India", profession: "Creative Designer", education: "Masters in Fine Arts", 
      bio: "A seeker of beauty and spirituality. Passionate about art, tradition, and finding a soulmate with a shared vision.", 
      gender: "female", interests: ["Art", "Spiritual Growth", "Travel"], profileComplete: true,
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800"
    },
    { 
      name: "Aliya Naqi", age: 23, location: "Lucknow", profession: "Software Developer", education: "MCA", 
      bio: "Tech enthusiast with a love for classical literature and calligraphy.", 
      gender: "female", interests: ["Coding", "Calligraphy", "Reading"], profileComplete: true,
      photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800"
    },
    { 
      name: "Sheeba Aziz", age: 29, location: "Faizabad", profession: "Branch Head, Yes Bank", education: "MBA", 
      bio: "Career-driven but family-oriented. Balancing professional success with spiritual growth.", 
      gender: "female", interests: ["Finance", "Travel", "Gardening"], profileComplete: true,
      photoUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800"
    },
    { 
      name: "Sayma Masood", age: 29, location: "Sultanpur", profession: "Senior Teacher", education: "Masters in Education", 
      bio: "Dedicated educator who loves nurturing young minds.", 
      gender: "female", interests: ["Teaching", "Poetry", "Cooking"], profileComplete: true,
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800"
    },
    { 
      name: "Javed Masood", age: 23, location: "Lucknow, Uttar Pradesh", profession: "Senior Counsel", education: "LLM", 
      bio: "Balancing a demanding legal career with spiritual peace. Looking for a partner who values family, faith, and growth.", 
      gender: "male", interests: ["History", "Law", "Equestrian"], profileComplete: true,
      photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800"
    }
  ];

  const seedIfEmpty = async () => {
    if (!auth.currentUser) return false;
    try {
      const requestedNames = ["Mahvish Siddiqui", "Aliya Naqi", "Sheeba Aziz", "Sayma Masood", "Javed Masood"];
      const existingProfilesQ = query(collection(db, 'profiles'), where('name', 'in', requestedNames));
      const existingSnap = await getDocs(existingProfilesQ);
      const existingNames = new Set(existingSnap.docs.map(doc => doc.data().name));

      let seededCount = 0;
      for (const p of extraProfiles) {
        if (!existingNames.has(p.name)) {
          // Use a deterministic UID for seeded system profiles if they don't have one
          const systemUid = `system_${p.name.toLowerCase().replace(/\s/g, '_')}`;
          await addDoc(collection(db, 'profiles'), {
            ...p,
            uid: systemUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          seededCount++;
        } else {
          // Temporary sync: update photo for Sheeba to ensure it loads
          const existing = existingSnap.docs.find(d => d.data().name === p.name);
          if (existing && p.name === "Sheeba Aziz") {
            await updateDoc(doc(db, 'profiles', existing.id), {
              photoUrl: p.photoUrl,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      return seededCount > 0;
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  useEffect(() => {
    // Only admins should attempt to seed profiles to avoid permission errors for regular users
    const isAdmin = user && (user.email === "27mahvishsid@gmail.com" || user.email === "nikaahconnect@gmail.com" || user.email === "mohdjaved52677@gmail.com" || user.email === "javeddd@student.iul.ac.in");
    
    const fetchCommunity = async () => {
      // Only fetch from Firestore if actually logged in to avoid permission errors
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Try to seed first if admin
        if (isAdmin) {
          await seedIfEmpty();
        }

        const q = query(
          collection(db, 'profiles'),
          where('profileComplete', '==', true),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const profiles = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(p => ["Mahvish Siddiqui", "Aliya Naqi", "Sheeba Aziz", "Sayma Masood", "Javed Masood"].includes(p.name));
        
        // Ensure uniqueness by name and prioritize Mahvish and Javed
        const unique = [];
        const seen = new Set();
        
        // Sort profiles: Mahvish first, then Javed, then others
        const sorted = [...profiles].sort((a, b) => {
          const priority = ["Mahvish Siddiqui", "Javed Masood"];
          const aIndex = priority.indexOf(a.name);
          const bIndex = priority.indexOf(b.name);
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });

        for (const p of sorted) {
          if (!seen.has(p.name)) {
            unique.push(p);
            seen.add(p.name);
          }
        }
        
        if (unique.length > 0) {
          setCommunityProfiles(unique);
        }
      } catch (error) {
        console.error("Error fetching community profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunity();
  }, []);

  const defaultProfiles = [
    { name: 'Mahvish Siddiqui, 23', location: 'Lucknow', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop' },
    { name: 'Javed Masood, 23', location: 'Lucknow', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop' },
    { name: 'Aliya Naqi, 23', location: 'Lucknow', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop' },
    { name: 'Sheeba Aziz, 29', location: 'Faizabad', photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800&auto=format&fit=crop' },
    { name: 'Sayma Masood, 29', location: 'Sultanpur', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop' },
  ];

  const galleryItems = communityProfiles.length > 0 ? communityProfiles : defaultProfiles;

  return (
    <div className="flex flex-col min-h-screen">
      <CommunityModal 
        isOpen={showCommunityModal} 
        onClose={() => setShowCommunityModal(false)}
        onJoin={() => {
          setShowCommunityModal(false);
          navigate(user ? '/dashboard' : '/login');
        }}
      />
      
      <CompatibilityModal 
        isOpen={showCompatibilityModal} 
        onClose={() => setShowCompatibilityModal(false)} 
      />
      
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      
      {/* Hero Section */}
      <section id="hero" className="relative h-[85vh] md:h-[95vh] flex items-center justify-center overflow-hidden bg-brand-cream text-brand-dark">
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%"],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')] opacity-20"
          />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.15 }}
            transition={{ duration: 2.5 }}
            src="https://images.unsplash.com/photo-1549490349-8643362247b5?q=90&w=1600&auto=format&fit=crop" 
            alt="Hero Background" 
            className="w-full h-full object-cover scale-x-[-1]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-cream/10 via-brand-cream/60 to-brand-cream" />
          
          {/* Animated Graphic Elements */}
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -right-1/4 w-[70rem] h-[70rem] border border-brand-primary/5 rounded-full"
          />
          <motion.div 
            animate={{ 
              rotate: -360,
              scale: [1.2, 1, 1.2],
            }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -left-1/4 w-[60rem] h-[60rem] border border-brand-primary/10 rounded-full"
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-brand-primary/3 rounded-full blur-[120px] pointer-events-none" />
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <FloatingHeart delay={0} size={24} x="10vw" />
          <FloatingHeart delay={5} size={16} x="40vw" />
          <FloatingHeart delay={2} size={20} x="80vw" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-10 py-3 rounded-xl bg-brand-primary/5 backdrop-blur-md text-brand-primary text-[10px] font-black uppercase tracking-[1em] mb-12 border border-brand-primary/10">
              The Sovereign Sanctuary
            </span>
            <h1 className="serif text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-10 leading-none tracking-tight text-brand-dark whitespace-nowrap overflow-visible">
              Eternal <span className="script text-brand-accent italic font-normal lowercase text-4xl sm:text-6xl md:text-8xl">Connection</span> Reimagined
            </h1>
            <p className="text-xl md:text-2xl font-light text-brand-dark/50 mb-16 max-w-3xl mx-auto leading-relaxed italic">
              A private, dignified platform where faith meets destiny.
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {user && !profile?.profileComplete ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(139, 26, 26, 0.25)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/profile-setup')}
                    className="w-full md:w-auto px-16 py-6 bg-brand-primary text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-4 transition-all border border-white/10"
                  >
                    Complete Profile
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/dashboard')}
                    className="w-full md:w-auto px-12 py-6 bg-transparent text-brand-primary rounded-2xl font-bold text-lg flex items-center justify-center gap-3 border-2 border-brand-primary/20 hover:border-brand-primary hover:bg-brand-primary/5 transition-all"
                  >
                    Dashboard
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(139, 26, 26, 0.25)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(user ? '/dashboard' : '/login')}
                    className="w-full md:w-auto px-16 py-6 bg-brand-primary text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-4 transition-all border border-white/10"
                  >
                    {user ? 'My Dashboard' : 'Begin Your Journey'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/discover')}
                    className="w-full md:w-auto px-12 py-6 bg-transparent text-brand-primary rounded-2xl font-bold text-lg flex items-center justify-center gap-3 border-2 border-brand-primary/20 hover:border-brand-primary hover:bg-brand-primary/5 transition-all"
                  >
                    Discovery
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-16 flex flex-col items-center gap-4 text-brand-primary/40 z-20"
        >
          <span className="text-[9px] uppercase tracking-[0.5em] font-black">Explore</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-brand-primary/40 to-transparent" />
        </motion.div>
      </section>

      {/* Discover Highlights Section */}
      <section id="features" className="py-40 bg-brand-cream relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-32">
            <span className="script text-brand-primary text-4xl mb-4 block">The Art of Matchmaking</span>
            <h2 className="serif text-6xl font-bold text-brand-dark mb-8">Guided by Purpose</h2>
            <div className="w-24 h-1 bg-brand-accent mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-24">
            {[
              { 
                icon: <Search className="text-brand-primary" size={56} />, 
                title: "Curated Discovery", 
                desc: "Sophisticated filters designed for the nuanced needs of refined Muslim singles.",
                label: "Refine Search"
              },
              { 
                icon: <Target className="text-brand-accent" size={56} />, 
                title: "Spiritual Harmony", 
                desc: "Our ethical matching considers spiritual depth, family values, and lifestyle compatibility.",
                label: "Compatibility"
              },
              { 
                icon: <MessageCircle className="text-brand-primary" size={56} />, 
                title: "Obsidian Privacy", 
                desc: "End-to-end encrypted communication within a safe, dignified platform environment.",
                label: "Secure Messaging"
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="group relative text-center"
              >
                <div className="mb-12 flex justify-center transform group-hover:-translate-y-4 transition-transform duration-700">
                  <div className="p-10 bg-white shadow-xl group-hover:shadow-brand-accent/20 transition-all border border-brand-accent/10 relative overflow-hidden rounded-[3.5rem]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-40" />
                    <div className="relative z-10">{item.icon}</div>
                  </div>
                </div>
                <h3 className="serif text-[2.5rem] font-bold text-brand-dark mb-6 leading-tight">{item.title}</h3>
                <p className="text-gray-500 font-light text-md leading-relaxed mb-10 max-w-[300px] mx-auto italic">
                  {item.desc}
                </p>
                <button 
                  onClick={() => {
                    if (item.label === "Refine Search") navigate('/discover');
                    if (item.label === "Compatibility") setShowCompatibilityModal(true);
                    if (item.label === "Secure Messaging") setShowPrivacyModal(true);
                  }}
                  className="px-10 py-3 rounded-full border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                >
                  {item.label}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Gallery Section */}
      <section id="community" className="py-40 bg-brand-dark/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
            <div>
              <span className="text-brand-primary font-black tracking-[0.5em] text-[10px] uppercase mb-6 block">The Inner Circle</span>
              <h2 className="serif text-5xl md:text-7xl font-bold text-brand-dark">Our Elegant Community</h2>
            </div>
            <div className="flex gap-6 flex-wrap">
              <button 
                onClick={() => setShowCommunityModal(true)}
                className="px-10 py-4 bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-primary/90 transition-all shadow-xl shadow-brand-primary/20 transform hover:scale-105"
              >
                Join the Circle
              </button>
              <button 
                onClick={() => navigate('/discover')}
                className="px-10 py-4 bg-white border border-brand-accent/30 text-brand-accent rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-accent hover:text-white transition-all shadow-sm"
              >
                View Seekers
              </button>
            </div>
          </div>

          <div className="flex gap-10 overflow-x-auto pb-16 snap-x hide-scrollbar">
            {galleryItems.map((u, i) => (
              <motion.div 
                key={u.id || i}
                whileHover={{ y: -15, scale: 1.02 }}
                onClick={() => navigate(u.id ? `/profile/${u.id}` : '/discover')}
                className="min-w-[320px] h-[450px] relative rounded-[3rem] overflow-hidden snap-center group border border-brand-accent/10 cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent opacity-80" />
                <div className="absolute bottom-8 left-8 text-white">
                  <p className="serif text-2xl font-bold mb-2 tracking-wide">{u.name}{u.age ? `, ${u.age}` : ''}</p>
                  <p className="text-[9px] uppercase font-black tracking-[0.3em] text-brand-accent flex items-center gap-2 leading-none">
                    <MapPin size={12} className="text-brand-accent" /> {u.location || 'Nearby'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* High-End Branding Section */}
      <section id="branding" className="py-40 bg-brand-dark text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-primary opacity-5 blur-[200px] -rotate-45" />
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-32 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-accent font-black tracking-[0.6em] text-[10px] uppercase mb-10 block">Refined Excellence</span>
            <h2 className="serif text-6xl md:text-8xl font-bold mb-12 leading-tight">Your Legacy, <br /> <span className="script text-brand-accent capitalize text-6xl md:text-8xl font-normal lowercase">Reimagined.</span></h2>
            <p className="text-xl text-white/60 mb-16 font-light leading-relaxed max-w-lg italic">
              Experience the pinnacle of matrimonial introduction. A dignified, distraction-free environment where spiritual compatibility is the standard.
            </p>
            <ul className="space-y-8 mb-16">
              {['Elite Privacy Protocol', 'Deep Values Assessment', 'Hand-Curated Discoveries', 'Concierge Partner Selection'].map((item, i) => (
                <li key={i} className="flex items-center gap-6 text-white group">
                  <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20 group-hover:bg-brand-accent/30 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-white/80">{item}</span>
                </li>
              ))}
            </ul>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')} 
              className="px-16 py-6 bg-white text-brand-dark font-black text-xs uppercase tracking-[0.4em] rounded-2xl hover:bg-brand-accent hover:text-white transition-all shadow-2xl"
            >
              Enter Dashboard
            </motion.button>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
             <div className="glass-dark aspect-[4/5] rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative z-10 border-white/5 p-4">
                <img 
                  src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=1974&auto=format&fit=crop" 
                  className="w-full h-full object-cover transition-all duration-1000 rounded-[3rem]" 
                  alt="Aesthetic Nikah Signing Ceremony"
                />
             </div>
             <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-brand-primary rounded-[5rem] rotate-12 z-0 opacity-10 blur-[120px]" />
          </motion.div>
        </div>
      </section>

      {/* Feedback Section */}
      <section id="feedback" className="py-40 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-primary/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-24">
            <span className="text-brand-primary font-black tracking-[0.5em] text-[10px] uppercase mb-6 block">Voices of Destined Hearts</span>
            <h2 className="serif text-5xl md:text-7xl font-bold text-brand-dark mb-8">Reflections & Gratitude</h2>
            <p className="text-gray-500 font-light text-lg italic max-w-2xl mx-auto">
              Real stories from our community members who found clarity and connection on NikaahConnect.
            </p>
          </div>

          {/* Testimonials Grid/Scroll */}
          <div className="text-center mb-16">
            <h3 className="serif text-3xl font-bold text-brand-dark opacity-90">Success Stories</h3>
            <div className="w-10 h-0.5 bg-brand-accent mx-auto mt-4" />
          </div>
          <div className="grid md:grid-cols-3 gap-12 mb-32">
            {[
              { name: "Fatima R.", content: "A truly dignified platform. I found my partner within 3 months. The focus on values over just looks is what sets NikaahConnect apart.", rating: 5 },
              { name: "Ahmed S.", content: "The privacy features are top-notch. I felt safe throughout the process. Highly recommend for serious seekers.", rating: 5 },
              { name: "Zainab K.", content: "Beautiful interface and very easy to use. The community is refined and respectful. May Allah bless this initiative.", rating: 5 }
            ].map((test, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-brand-cream/30 p-10 rounded-[3rem] border border-brand-primary/5 hover:bg-brand-cream/50 transition-all group"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(test.rating)].map((_, i) => (
                    <Heart key={i} size={14} className="text-brand-accent transform group-hover:scale-125 transition-transform" fill="currentColor" />
                  ))}
                </div>
                <p className="text-brand-dark font-light leading-relaxed italic mb-8">"{test.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-1 layer-brand-primary/20 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">{test.name}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feedback Form */}
          <div className="max-w-2xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-brand-dark p-12 md:p-20 rounded-[4rem] text-white relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary opacity-10 blur-[80px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <h3 className="serif text-4xl font-bold mb-6">Share Your Experience</h3>
                <p className="text-white/60 font-light mb-12 text-sm leading-relaxed">
                  Your feedback helps us refine this sanctuary for everyone. Whether it's a suggestion or a success story, we'd love to hear it.
                </p>

                {feedbackSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/10 p-12 rounded-[3rem] text-center border border-white/20 backdrop-blur-sm"
                  >
                    <div className="w-20 h-20 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-accent/40">
                      <CheckCircle2 size={40} className="text-white" />
                    </div>
                    <h4 className="serif text-2xl font-bold mb-4 text-white">Shukran!</h4>
                    <p className="text-white/60 font-light text-sm italic">
                      Your words have been received with gratitude. We value your voice in our community.
                    </p>
                    <button 
                      onClick={() => setFeedbackSuccess(false)}
                      className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-brand-accent hover:text-white transition-all underline underline-offset-8"
                    >
                      Write another
                    </button>
                  </motion.div>
                ) : (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!user) {
                        toast.error('Please login to share feedback');
                        navigate('/login');
                        return;
                      }
                      const formData = new FormData(e.currentTarget);
                      const content = formData.get('content') as string;
                      if (!content || content.trim().length === 0) {
                        toast.error('Feedback message cannot be empty');
                        return;
                      }

                      setFeedbackLoading(true);
                      try {
                        const userName = profile?.name || user.email?.split('@')[0] || 'Anonymous';
                        console.log("DEBUG: Submitting feedback for user:", user.uid);
                        
                        // 1. Save to Firestore
                        await addDoc(collection(db, 'feedback'), {
                          uid: user.uid,
                          name: userName,
                          content: content.trim(),
                          rating: 5,
                          createdAt: serverTimestamp()
                        });
                        
                        // 2. Dispatch real-time email
                        const response = await fetch('/api/contact', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: userName,
                            email: user.email,
                            message: content.trim(),
                            type: 'Feedback'
                          })
                        });

                        const result = await response.json();
                        
                        if (result.success) {
                          setFeedbackSuccess(true);
                          toast.success(result.message || 'Feedback sent successfully');
                          (e.target as HTMLFormElement).reset();
                        } else {
                          const errorMessage = result.details || result.error || 'Failed to dispatch email';
                          throw new Error(errorMessage);
                        }
                      } catch (err: any) {
                        console.error("DEBUG: Feedback submission error:", err);
                        if (err.message?.includes('permission')) {
                          handleFirestoreError(err, OperationType.CREATE, 'feedback');
                        } else {
                          toast.error(err.message || 'Sent to database, but email dispatch failed.');
                          setFeedbackSuccess(true); 
                        }
                      } finally {
                        setFeedbackLoading(false);
                      }
                    }}
                    className="space-y-6"
                  >
                    <textarea 
                      name="content"
                      rows={4}
                      placeholder="Tell us your story or share your thoughts..."
                      className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-accent transition-all resize-none font-light"
                      required
                      disabled={feedbackLoading}
                    />
                    <button 
                      type="submit"
                      disabled={feedbackLoading}
                      className="w-full py-6 bg-brand-accent text-white rounded-3xl font-black text-xs uppercase tracking-[0.4em] hover:bg-brand-accent/90 transition-all transform active:scale-[0.98] shadow-2xl shadow-brand-accent/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {feedbackLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Submit Feedback
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="py-40 bg-brand-cream relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #A31D1D 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
              <Heart className="text-brand-primary mx-auto mb-12 animate-pulse" size={80} fill="currentColor" />
              <h2 className="serif text-6xl font-bold text-brand-dark mb-10">Begin Your Eternal Story</h2>
              <p className="text-gray-500 mb-16 text-xl font-light leading-relaxed italic">
                  Join a community of thousands who have found their half of deen on NikaahConnect. 
                  Your journey towards a blessed union starts with a single intention.
              </p>
              <button 
                onClick={() => {
                  if (!user) navigate('/login');
                  else if (!profile?.profileComplete) navigate('/profile-setup');
                  else navigate('/dashboard');
                }}
                className="px-20 py-7 bg-brand-dark text-white text-xs font-black uppercase tracking-[0.5em] rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] hover:bg-brand-primary transition-all transform hover:scale-105 active:scale-95"
              >
                  {user ? (profile?.profileComplete ? 'Return to Sanctuary' : 'Complete Your Profile') : 'Create Your Free Account'}
              </button>
          </div>
      </section>

      {/* Contact & Queries Section */}
      <section id="contact" className="py-32 bg-brand-dark text-white relative overflow-hidden border-t border-white/5">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-accent/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-brand-accent font-black tracking-[0.4em] text-[10px] uppercase mb-6 block">Get in Touch</span>
            <h2 className="serif text-5xl md:text-6xl font-bold mb-10 leading-tight">Questions? <br/> <span className="script text-brand-accent capitalize text-6xl italic font-normal">We're here.</span></h2>
            <p className="text-white/50 mb-12 font-light text-lg leading-relaxed italic">
              Whether you need assistance with your profile or have questions about our ethical matching process, our team is dedicated to your journey.
            </p>

            <div className="grid sm:grid-cols-2 gap-10 mb-16">
              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand-accent/20 transition-all">
                    <Mail className="text-brand-accent" size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Email Us</p>
                    <a href="mailto:27mahvishsid@gmail.com" className="text-sm font-medium hover:text-brand-accent transition-colors block">27mahvishsid@gmail.com</a>
                    <a href="mailto:mohdjaved52677@gmail.com" className="text-sm font-medium hover:text-brand-accent transition-colors block">mohdjaved52677@gmail.com</a>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand-accent/20 transition-all">
                    <Phone className="text-brand-accent" size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Call/WhatsApp</p>
                    <a href="tel:7355670619" className="text-sm font-medium hover:text-brand-accent transition-colors block">+91 7355670619</a>
                    <a href="tel:9236099474" className="text-sm font-medium hover:text-brand-accent transition-colors block">+91 9236099474</a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-6">
              {[Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-brand-accent transition-all">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-10 md:p-14 rounded-[3.5rem] border border-white/10 backdrop-blur-sm relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 blur-[50px] -translate-y-1/2 translate-x-1/2" />
            
            {querySuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-brand-accent rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 size={40} className="text-white" />
                </div>
                <h4 className="serif text-3xl font-bold mb-4">Message Sent</h4>
                <p className="text-white/50 font-light italic mb-8">
                  Your query has been received. Our team will get back to you shortly at your registered email.
                </p>
                <button 
                  onClick={() => setQuerySuccess(false)}
                  className="text-xs font-black uppercase tracking-[0.4em] text-brand-accent hover:text-white underline underline-offset-8"
                >
                  Send another query
                </button>
              </motion.div>
            ) : (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  const email = formData.get('email') as string;
                  const message = formData.get('message') as string;

                  if (!name || !email || !message) {
                    toast.error('Please fill all required fields');
                    return;
                  }

                  setQueryLoading(true);
                  try {
                    // 1. Save to Firestore (Database record)
                    await addDoc(collection(db, 'queries'), {
                      name: name.trim(),
                      email: email.trim(),
                      message: message.trim(),
                      createdAt: serverTimestamp()
                    });

                    // 2. Dispatch real-time email
                    const response = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        message: message.trim()
                      })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                      setQuerySuccess(true);
                      toast.success(result.message || 'Email sent successfully');
                    } else {
                      // Look for specific Gmail auth details
                      const errorMessage = result.details || result.error || 'Failed to dispatch email';
                      throw new Error(errorMessage);
                    }
                  } catch (err: any) {
                    console.error("Query submit error:", err);
                    if (err.message?.includes('permission')) {
                      handleFirestoreError(err, OperationType.CREATE, 'queries');
                    } else {
                      toast.error(err.message || 'Sent to database, but email dispatch failed.');
                      setQuerySuccess(true); 
                    }
                  } finally {
                    setQueryLoading(false);
                  }
                }}
                className="space-y-6"
              >
                <h3 className="serif text-3xl font-bold mb-8">Quick Enquiry</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Full Name</label>
                    <input 
                      name="name"
                      type="text" 
                      placeholder="Your name" 
                      required
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-accent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Email Address</label>
                    <input 
                      name="email"
                      type="email" 
                      placeholder="email@example.com" 
                      required
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-accent transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Message</label>
                  <textarea 
                    name="message"
                    placeholder="How can we help you today?" 
                    rows={4}
                    required
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-accent transition-all resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={queryLoading}
                  className="w-full py-5 bg-brand-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl shadow-brand-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {queryLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Dispatch Query
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
