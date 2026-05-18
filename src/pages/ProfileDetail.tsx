import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Heart, MessageCircle, MapPin, Briefcase, GraduationCap, ArrowLeft, Star, ShieldCheck, Mail, Calendar, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/common/BackButton';

export default function ProfileDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'profiles', id));
        if (snap.exists()) {
          setProfile(snap.data());
          
          // Track view
          if (auth.currentUser && auth.currentUser.uid !== id) {
            await addDoc(collection(db, 'views'), {
              viewerId: auth.currentUser.uid,
              viewedId: id,
              createdAt: serverTimestamp()
            });
          }
        }
        
        // Check match status
        if (auth.currentUser) {
          const q = query(
            collection(db, 'matches'),
            where('ids', 'array-contains', auth.currentUser.uid)
          );
          const matchSnap = await getDocs(q);
          const matchDoc = matchSnap.docs.find(doc => doc.data().ids.includes(id));
          if (matchDoc) {
            setMatchStatus(matchDoc.data().status);
            setMatchId(matchDoc.id);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `profiles/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const handleLike = async () => {
    if (!auth.currentUser || !id || !profile) return;
    try {
      // Check if they already liked us
      const q = query(
        collection(db, 'matches'),
        where('ids', 'array-contains', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      const existingInterest = snapshot.docs.find(doc => doc.data().ids.includes(id));

      if (existingInterest) {
        if (existingInterest.data().senderId !== auth.currentUser.uid) {
          await updateDoc(doc(db, 'matches', existingInterest.id), {
            status: 'accepted',
            updatedAt: serverTimestamp()
          });
          setMatchStatus('accepted');
          setMatchId(existingInterest.id);
          toast.success("Mutual Match! ❤️");
        }
      } else {
        const newMatch = await addDoc(collection(db, 'matches'), {
          ids: [auth.currentUser.uid, id],
          senderId: auth.currentUser.uid,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setMatchStatus('pending');
        setMatchId(newMatch.id);
        toast.success("Interest Sent! ❤️");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
       <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
       <div className="text-center">
          <h2 className="serif text-2xl font-bold text-brand-dark mb-4">Profile Not Found</h2>
          <BackButton />
       </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-24 bg-brand-cream/30">
      {/* Photo Preview Modal */}
      <AnimatePresence>
        {showPhotoPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPhotoPreview(false)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={profile.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=95&w=1200&auto=format&fit=crop'} 
                className="max-w-full max-h-full object-contain rounded-lg lg:rounded-2xl shadow-2xl"
                alt={profile.name}
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setShowPhotoPreview(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors"
              >
                Close Preview <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="relative h-[60vh] overflow-hidden group cursor-zoom-in" onClick={() => setShowPhotoPreview(true)}>
        <img 
          src={profile.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=95&w=1200&auto=format&fit=crop'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt={profile.name}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        <div className="absolute top-8 left-8 z-10" onClick={(e) => e.stopPropagation()}>
           <BackButton className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/40" />
        </div>

        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                 <h1 className="serif text-6xl font-bold">{profile.name}, {profile.age}</h1>
                 <div className="px-4 py-1 bg-brand-accent text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} /> Verified Member
                 </div>
                 {profile.subscriptionStatus === 'premium' && (
                   <div className="px-4 py-1 bg-white/20 backdrop-blur-md text-brand-accent border border-brand-accent/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Star size={12} fill="currentColor" /> Premium
                   </div>
                 )}
              </div>
              <p className="flex items-center gap-2 text-white/80 text-lg italic font-light">
                 <MapPin size={20} className="text-brand-accent" /> {profile.location}
              </p>
            </div>
            
            <div className="flex gap-4">
              {matchStatus === 'accepted' ? (
                <button 
                  onClick={() => navigate('/messages', { state: { matchId } })}
                  className="px-10 py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-2xl shadow-brand-primary/40 flex items-center gap-3 hover:scale-105 transition-all"
                >
                  <MessageCircle size={24} /> Message
                </button>
              ) : (
                <button 
                  onClick={handleLike}
                  disabled={matchStatus === 'pending'}
                  className={`px-10 py-4 ${matchStatus === 'pending' ? 'bg-gray-400' : 'bg-brand-primary'} text-white rounded-2xl font-bold shadow-2xl shadow-brand-primary/40 flex items-center gap-3 hover:scale-105 transition-all`}
                >
                  <Heart size={24} fill={matchStatus === 'pending' ? 'currentColor' : 'none'} /> 
                  {matchStatus === 'pending' ? 'Interested' : 'Express Interest'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-12 rounded-[3rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-3xl font-bold text-brand-dark mb-8">About {profile.name.split(' ')[0]}</h2>
             <p className="text-gray-600 text-lg leading-relaxed italic mb-10">
                "{profile.bio}"
             </p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-brand-cream/30 rounded-3xl border border-brand-primary/5">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-xl">
                         <Briefcase size={24} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Profession</p>
                         <p className="font-bold text-brand-dark">{profile.profession}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl">
                         <GraduationCap size={24} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Education</p>
                         <p className="font-bold text-brand-dark">{profile.education}</p>
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-brand-cream/30 rounded-3xl border border-brand-primary/5">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-xl">
                         <Calendar size={24} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined</p>
                         <p className="font-bold text-brand-dark">May 2026</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl">
                         <Info size={24} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                         <p className="font-bold text-brand-dark">Never Married</p>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {profile.interests && profile.interests.length > 0 && (
            <section className="bg-white p-10 md:p-12 rounded-[3rem] shadow-xl border border-brand-primary/5">
               <h2 className="serif text-2xl font-bold text-brand-dark mb-8">Interests & Hobbies</h2>
               <div className="flex flex-wrap gap-3">
                 {profile.interests.map((interest: string, i: number) => (
                   <span 
                     key={i} 
                     className="px-5 py-2.5 bg-brand-cream/50 text-brand-dark rounded-2xl text-xs font-bold border border-brand-primary/5 hover:bg-brand-primary hover:text-white transition-all"
                   >
                     {interest}
                   </span>
                 ))}
               </div>
            </section>
          )}

          <section className="bg-white p-12 rounded-[3rem] shadow-xl border border-brand-primary/5">
             <h2 className="serif text-2xl font-bold text-brand-dark mb-8">Personal Information</h2>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {[
                  { label: 'Height', value: profile.height || "5'5\"" },
                  { label: 'Marital Status', value: profile.maritalStatus || 'Never Married' },
                  { label: 'Mother Tongue', value: profile.motherTongue || 'Urdu' },
                  { label: 'Family Type', value: profile.familyType || 'Nuclear' },
                  { label: 'Complexion', value: profile.skinTone || 'Fair' },
                  { label: 'Community', value: 'Syed' }
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
                    <p className="font-medium text-brand-dark">{item.value}</p>
                  </div>
                ))}
             </div>
          </section>

          <section className="bg-white p-12 rounded-[3rem] shadow-xl border border-brand-primary/5">
             <h2 className="serif text-2xl font-bold text-brand-dark mb-8">Religious & Lifestyle Info</h2>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: 'Religion', value: profile.religion || 'Islam' },
                  { label: 'Religiosity', value: profile.religiosity || 'Practicing' },
                  { label: 'Sect', value: profile.sect || 'Sunni' },
                  { label: 'Prayers', value: '5 times a day' },
                  { label: 'Diet', value: 'Halal Only' },
                  { label: 'Smoking', value: 'No' },
                  { label: 'Children', value: 'Want children' }
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
                    <p className="font-medium text-brand-dark">{item.value}</p>
                  </div>
                ))}
             </div>
          </section>
        </div>

        <aside className="space-y-8">
           <div className="bg-brand-primary p-10 rounded-[3rem] text-white shadow-2xl shadow-brand-primary/30">
              <Star className="text-brand-accent mb-6" size={36} fill="currentColor" />
              <h3 className="serif text-2xl font-bold mb-4">Compatibility Score</h3>
              <p className="text-white/70 font-light italic mb-8 leading-relaxed">
                 Based on your values and life goals, you share a high level of spiritual alignment.
              </p>
              <div className="flex items-center gap-4">
                 <div className="text-5xl font-bold">92%</div>
                 <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="w-[92%] h-full bg-brand-accent" />
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3rem] border border-brand-primary/5 shadow-xl">
              <h4 className="font-bold text-brand-dark mb-4 flex items-center gap-2">
                 <ShieldCheck size={18} className="text-brand-accent" /> Safety Tips
              </h4>
              <ul className="space-y-4">
                 <li className="text-xs text-gray-500 italic leading-relaxed">• Never share financial information initially.</li>
                 <li className="text-xs text-gray-500 italic leading-relaxed">• Report any suspicious behavior immediately.</li>
                 <li className="text-xs text-gray-500 italic leading-relaxed">• Keep initial interactions within the app.</li>
              </ul>
           </div>
        </aside>
      </div>
    </div>
  );
}
