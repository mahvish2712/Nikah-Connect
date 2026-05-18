import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Info, MapPin, Briefcase, GraduationCap, Star, SlidersHorizontal, Check, Search, Database } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, updateDoc, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '../components/common/BackButton';
import Skeleton, { ProfileSkeleton } from '../components/common/Skeleton';

const FloatingHeart = ({ delay = 0, size = 20, x = '0' }: { delay?: number, size?: number, x?: string | number }) => (
  <motion.div
    initial={{ y: '110vh', opacity: 0, x }}
    animate={{ 
      y: '-10vh', 
      opacity: [0, 0.3, 0.3, 0],
      rotate: [0, 15, -15, 0]
    }}
    transition={{ 
      duration: 20, 
      repeat: Infinity, 
      delay,
      ease: "linear"
    }}
    className="absolute text-brand-primary pointer-events-none z-0"
  >
    <Heart size={size} fill="currentColor" />
  </motion.div>
);

export default function Discover({ profile: currentUserProfile }: { profile: any }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 60,
    gender: 'all',
  });
  const [rawProfiles, setRawProfiles] = useState<any[]>([]);
  const [showMatchModal, setShowMatchModal] = useState<any>(null);
  const navigate = useNavigate();

  const seedExtraProfiles = async () => {
    if (!auth.currentUser) return;
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
      },
      { 
        name: "Zoya Fatima", age: 25, location: "Lucknow", profession: "Interior Designer", education: "B.Arch", 
        bio: "Creating spaces that reflect the soul. Travel lover and foodie.", 
        gender: "female", interests: ["Design", "Food", "Photography"], profileComplete: true,
        photoUrl: "https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?q=80&w=800"
      },
      { 
        name: "Omar Hashmi", age: 27, location: "Kanpur", profession: "Architect", education: "M.Arch", 
        bio: "Structural integrity and artistic vision. Looking for a partner to build a life with.", 
        gender: "male", interests: ["Architecture", "Hiking", "Chess"], profileComplete: true,
        photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800"
      }
    ];

    try {
      setLoading(true);
      let addedCount = 0;
      // Get existing names to avoid duplicates
      const q = query(collection(db, 'profiles'), where('profileComplete', '==', true));
      const snapshot = await getDocs(q);
      const existingNames = new Set(snapshot.docs.map(doc => doc.data().name));
      
      for (const p of extraProfiles) {
        if (!existingNames.has(p.name)) {
          addedCount++;
          const systemUid = `system_${p.name.toLowerCase().replace(/\s/g, '_')}`;
          await setDoc(doc(db, 'profiles', systemUid), {
            ...p,
            uid: systemUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
      if (addedCount > 0) {
        await fetchProfiles();
        toast.success(`Loaded ${addedCount} extra profiles!`);
      } else {
        toast.info("All extra profiles are already loaded.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'profiles');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'profiles'),
        where('profileComplete', '==', true),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      let users = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(u => {
          const isCurrentUser = auth.currentUser && (u.uid === auth.currentUser.uid || u.id === auth.currentUser.uid || u.name === currentUserProfile?.name);
          return !isCurrentUser && u.profileComplete === true;
        });

      // Ensure uniqueness by name and prioritize Mahvish and Javed
      const unique = [];
      const seen = new Set();
      
      // Sort users: Mahvish first, then Javed, then others
      const sorted = [...users].sort((a, b) => {
        const priority = ["Mahvish Siddiqui", "Javed Masood"];
        const aIndex = priority.indexOf(a.name);
        const bIndex = priority.indexOf(b.name);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });

      for (const u of sorted) {
        if (!seen.has(u.name)) {
          unique.push(u);
          seen.add(u.name);
        }
      }

      setRawProfiles(unique);
      // Only reset currentIndex if we are not just refining search
      if (searchTerm === '') {
        setCurrentIndex(0);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
    } finally {
      // Add a small delay for smoother transition
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []); // Only once on mount or when specifically refreshed

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();
    const filtered = rawProfiles.filter(u => {
      const age = u.age || 25;
      const gender = (u.gender || 'male').toLowerCase();
      const name = (u.name || '').toLowerCase();
      const profession = (u.profession || '').toLowerCase();
      const location = (u.location || '').toLowerCase();

      const ageMatch = age >= filters.minAge && age <= filters.maxAge;
      const genderMatch = filters.gender === 'all' || gender === filters.gender;
      const searchMatch = !search || 
        name.includes(search) || 
        profession.includes(search) || 
        location.includes(search);

      return ageMatch && genderMatch && searchMatch;
    });
    
    setProfiles(filtered);
    // Don't reset currentIndex here if typing, or maybe reset to 0 if the current profile was filtered out
    // Actually better to reset to 0 to show the best match for the search
    setCurrentIndex(0);
  }, [searchTerm, rawProfiles, filters]);

  // Auto-seed if empty and first load
  useEffect(() => {
    if (!loading && rawProfiles.length < 5 && searchTerm === '' && filters.gender === 'all') {
      const timer = setTimeout(() => {
        if (rawProfiles.length < 5) {
          seedExtraProfiles();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, rawProfiles.length]);

  const handleNext = async (dir: 'left' | 'right') => {
    if (currentIndex >= profiles.length) return;
    
    const profile = profiles[currentIndex];
    
    if (dir === 'right') {
      try {
        // Mutual match logic
        const q = query(
          collection(db, 'matches'),
          where('ids', 'array-contains', auth.currentUser?.uid),
          where('status', '==', 'pending')
        );
        
        const snapshot = await getDocs(q);
        const existingInterest = snapshot.docs.find(doc => {
          const ids = doc.data().ids;
          return ids.includes(profile.id);
        });

        if (existingInterest) {
          // Only accept if we are NOT the one who sent it or if it was already mutual
          if (existingInterest.data().senderId !== auth.currentUser?.uid) {
            await updateDoc(doc(db, 'matches', existingInterest.id), {
              status: 'accepted',
              updatedAt: serverTimestamp()
            });
            setShowMatchModal(profile);
          }
        } else {
          await addDoc(collection(db, 'matches'), {
            ids: [auth.currentUser?.uid, profile.id],
            senderId: auth.currentUser?.uid,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          toast.success("Interest Sent! ❤️");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'matches');
      }
    }

    setDirection(dir === 'left' ? -1 : 1);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setDirection(null);
    }, 300);
  };

  const getCommonInterests = (otherInterests: string[] = []) => {
    const userInterests = currentUserProfile?.interests || [];
    return otherInterests.filter(i => userInterests.includes(i));
  };

  if (loading && profiles.length === 0) return (
    <div className="min-h-screen pt-20 pb-24 px-4 bg-brand-cream/40 flex items-center justify-center">
       <div className="max-w-xl w-full mx-auto">
          <ProfileSkeleton />
       </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 bg-brand-cream/40 relative overflow-hidden">
      {/* Background Enhancements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingHeart delay={0} size={28} x="10vw" />
        <FloatingHeart delay={6} size={14} x="30vw" />
        <FloatingHeart delay={12} size={36} x="50vw" />
        <FloatingHeart delay={3} size={22} x="70vw" />
        <FloatingHeart delay={9} size={30} x="90vw" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <div className="mb-4">
              <BackButton />
            </div>
            <h1 className="serif text-4xl font-bold text-brand-dark">Discovery</h1>
            <p className="text-gray-500 font-light italic mt-1">Refined for your soul</p>
          </div>
          <div className="flex gap-3 items-end">
             <div className="relative group hidden sm:block">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary transition-colors">
                  <Search size={16} />
                </div>
                <input 
                  type="text"
                  autoComplete="off"
                  placeholder="Search name, job, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 pl-10 pr-4 bg-white border border-brand-primary/5 rounded-2xl focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all text-xs font-medium w-48 md:w-64"
                />
             </div>
             <button 
               onClick={seedExtraProfiles}
               title="Load Extra Profiles"
               className="p-3 rounded-2xl bg-brand-cream border border-brand-primary/10 text-brand-primary hover:bg-white transition-all shadow-sm"
             >
                <Database size={20} />
             </button>
             <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`p-3 rounded-2xl transition-all shadow-sm hover:shadow-md border ${showFilters ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-brand-primary border-brand-primary/5'}`}
             >
                <SlidersHorizontal size={20} />
             </button>
          </div>
        </header>

        {/* Mobile Search */}
        <div className="mb-6 sm:hidden relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-primary transition-colors">
            <Search size={16} />
          </div>
          <input 
            type="text"
            autoComplete="off"
            placeholder="Search name, job, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-10 pr-4 bg-white border border-brand-primary/10 rounded-2xl focus:border-brand-primary outline-none transition-all text-xs font-medium"
          />
        </div>

        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5"
          >
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Age Range: {filters.minAge} - {filters.maxAge}</label>
                <div className="flex gap-4">
                   <input 
                     type="range" min="18" max="60" 
                     value={filters.minAge} 
                     onChange={(e) => setFilters({...filters, minAge: parseInt(e.target.value)})}
                     className="flex-1 accent-brand-primary"
                   />
                   <input 
                     type="range" min="18" max="60" 
                     value={filters.maxAge} 
                     onChange={(e) => setFilters({...filters, maxAge: parseInt(e.target.value)})}
                     className="flex-1 accent-brand-primary"
                   />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Looking For</label>
                <div className="flex gap-3">
                  {['all', 'male', 'female'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setFilters({...filters, gender: g})}
                      className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${filters.gender === g ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-brand-cream/50 text-gray-500'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {profiles.length === 0 || currentIndex >= profiles.length ? (
          <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-brand-primary/5 text-center max-w-xl mx-auto mt-10">
            <Star className="mx-auto text-brand-accent/30 mb-6" size={64} />
            <h2 className="serif text-2xl font-bold text-brand-dark mb-4">No More Profiles</h2>
            <p className="text-gray-400 italic">You've seen all available profiles for now. Check back later or adjust filters.</p>
            <button 
              onClick={() => { setFilters({ minAge: 18, maxAge: 60, gender: 'all' }); setSearchTerm(''); setCurrentIndex(0); }}
              className="mt-8 px-10 py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="relative h-[70vh] w-full isolate">
            <AnimatePresence mode="wait">
              <motion.div
                key={profiles[currentIndex].id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100) {
                    handleNext('right');
                  } else if (info.offset.x < -100) {
                    handleNext('left');
                  }
                }}
                initial={{ opacity: 0, scale: 0.9, x: direction ? direction * 500 : 0, rotate: direction ? direction * 10 : 0 }}
                animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: direction ? direction * -500 : 0, rotate: direction ? direction * -10 : 0 }}
                whileDrag={{ scale: 1.05, cursor: "grabbing" }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="absolute inset-0 bg-white/40 backdrop-blur-3xl rounded-[3rem] shadow-2xl shadow-brand-dark/10 overflow-hidden flex flex-col border border-white/20 touch-none"
              >
                <div 
                  className="flex-1 relative overflow-hidden group cursor-pointer"
                  onClick={() => navigate(`/profile/${profiles[currentIndex].id}`)}
                >
                  <img 
                    src={profiles[currentIndex].photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=90&w=1200&auto=format&fit=crop'} 
                    alt={profiles[currentIndex].name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-transparent to-transparent" />
                  
                  <div className="absolute top-6 right-6">
                    <div className="glass px-4 py-1 rounded-full flex items-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest border-white/20">
                        <Star size={12} fill="currentColor" className="text-brand-accent" /> 90% Match
                    </div>
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <h2 className="serif text-4xl font-bold mb-2">{profiles[currentIndex].name}, {profiles[currentIndex].age}</h2>
                    <div className="flex flex-wrap gap-2">
                      <p className="flex items-center gap-1.5 text-white/80 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                        <MapPin size={12} className="text-brand-accent" /> {profiles[currentIndex].location}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-white/30 backdrop-blur-md overflow-y-auto max-h-[45%] border-t border-white/10">
                  {profiles[currentIndex].interests && profiles[currentIndex].interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {profiles[currentIndex].interests.map((interest: string, i: number) => {
                        const isCommon = getCommonInterests(profiles[currentIndex].interests).includes(interest);
                        return (
                          <span 
                            key={i} 
                            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                              isCommon 
                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                : 'bg-brand-cream/50 text-brand-dark border-brand-primary/5'
                            }`}
                          >
                            {isCommon && <Check size={8} className="inline mr-1" />}
                            {interest}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 bg-brand-accent text-white rounded-full shadow-lg shadow-brand-accent/20">
                      <Briefcase size={12} /> {profiles[currentIndex].profession}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 bg-brand-primary text-white rounded-full shadow-lg shadow-brand-primary/20">
                      <GraduationCap size={12} /> {profiles[currentIndex].education}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed font-light italic">
                    &ldquo;{profiles[currentIndex].bio}&rdquo;
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {profiles.length > 0 && currentIndex < profiles.length && (
          <div className="mt-12 flex justify-center items-center gap-8">
            <motion.button
              whileTap={{ scale: 0.8, rotate: -15 }}
              onClick={() => handleNext('left')}
              className="w-20 h-20 rounded-[2rem] bg-white shadow-xl shadow-brand-primary/5 flex items-center justify-center text-gray-300 hover:text-brand-primary transition-all border border-brand-primary/5"
            >
              <X size={36} />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={() => handleNext('right')}
              className="w-24 h-24 rounded-[2.5rem] bg-brand-primary text-white shadow-2xl shadow-brand-primary/30 flex items-center justify-center hover:bg-brand-primary/90 transition-all group"
            >
              <Heart size={44} fill="currentColor" className="group-hover:scale-110 transition-transform" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.8, rotate: 15 }}
              onClick={() => {
                toast.success("Super Interest Sent! ❤️");
                handleNext('right');
              }}
              className="w-20 h-20 rounded-[2rem] bg-white shadow-xl shadow-brand-primary/5 flex items-center justify-center text-brand-accent hover:text-brand-accent/80 transition-all border border-brand-accent/10"
            >
              <Star size={36} fill="currentColor" />
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMatchModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/90 backdrop-blur-xl"
          >
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white rounded-[4rem] p-12 text-center max-w-sm w-full relative">
              <div className="w-24 h-24 rounded-full bg-brand-primary mx-auto flex items-center justify-center mb-8">
                 <Check className="text-white" size={48} />
              </div>
              <h2 className="serif text-4xl font-bold text-brand-dark mb-4">It's a Match!</h2>
              <p className="text-gray-500 mb-8 italic">You and {showMatchModal.name} have matched.</p>
              <div className="flex gap-4">
                <button onClick={() => navigate('/messages')} className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold">Message</button>
                <button onClick={() => setShowMatchModal(null)} className="px-6 py-4 border rounded-2xl text-gray-400">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
