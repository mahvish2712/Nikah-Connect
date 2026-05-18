import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, MapPin, X, Star, Users } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';

export default function Matches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'matches'),
      where('ids', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const matchData = await Promise.all(snapshot.docs.map(async (matchDoc) => {
          const data = matchDoc.data() as any;
          const otherUserId = data.ids.find((id: string) => id !== auth.currentUser?.uid);
          const userSnap = await getDoc(doc(db, 'profiles', otherUserId));
          const userData = userSnap.data();
          
          return {
            id: matchDoc.id,
            ...data,
            otherUser: {
              id: otherUserId,
              name: userData?.name || 'User',
              age: userData?.age || 25,
              location: userData?.location || 'Nearby',
              photo: userData?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=90&w=800&auto=format&fit=crop',
              compatibility: '90%'
            }
          };
        }));
        setMatches((matchData as any[]).filter(m => m.status === 'accepted'));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching match details:", error);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async (matchId: string, status: 'accepted' | 'rejected') => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 bg-brand-cream/50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
           <BackButton />
        </div>
        
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="serif text-4xl font-bold text-brand-dark">Your Matches</h1>
            <p className="text-gray-500 font-light mt-1">Discover common paths and shared values.</p>
          </div>
          {!loading && matches.length > 0 && (
            <div className="hidden md:flex gap-4">
               <button className="px-6 py-2 bg-white border border-brand-primary/10 rounded-full text-xs font-bold uppercase tracking-widest text-brand-primary hover:bg-brand-primary hover:text-white transition-all">All Matches ({matches.length})</button>
            </div>
          )}
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-brand-primary/5">
                <Skeleton className="h-80 rounded-none" />
                <div className="p-8 space-y-4">
                  <Skeleton width="60%" height="1.5rem" />
                  <Skeleton width="40%" height="1rem" />
                  <div className="flex justify-between pt-4">
                     <Skeleton circle width="50px" height="50px" />
                     <Skeleton width="120px" height="40px" className="rounded-full" />
                     <Skeleton circle width="50px" height="50px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No Matches Yet"
            description="Your special someone is out there. Start discovering profiles to find kindred spirits who share your values."
            actionLabel="Start Discovering"
            onAction={() => navigate('/discover')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {matches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-dark/5 border border-white/20 group"
              >
                 <div className="relative h-80 overflow-hidden cursor-pointer" onClick={() => navigate(`/profile/${match.otherUser.id}`)}>
                  <img 
                    src={match.otherUser.photo} 
                    alt={match.otherUser.name} 
                    className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 left-6 flex gap-2">
                     <div className="px-4 py-1.5 glass rounded-full text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-1">
                        <Star size={10} fill="currentColor" className="text-brand-accent" /> {match.otherUser.compatibility} Match
                     </div>
                     <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white ${match.status === 'accepted' ? 'bg-green-500' : 'bg-brand-accent'}`}>
                        {match.status === 'accepted' ? 'Mutual Match' : 'Pending Interest'}
                     </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent">
                     <h2 className="serif text-2xl font-bold text-white">{match.otherUser.name}, {match.otherUser.age}</h2>
                     <p className="text-white/70 text-xs flex items-center gap-1 mt-1 font-light tracking-wide italic">
                        <MapPin size={12} className="text-brand-accent" /> {match.otherUser.location}
                     </p>
                  </div>
                </div>
                <div className="p-8 flex justify-around items-center">
                    <button 
                      onClick={() => handleAction(match.id, 'rejected')}
                      className="p-4 rounded-full bg-brand-cream/50 text-gray-400 hover:text-brand-accent transition-colors"
                    >
                      <X size={24} />
                   </button>
                   <button 
                     onClick={() => navigate('/messages', { state: { matchId: match.id } })}
                     className="px-8 py-3 bg-brand-primary text-white rounded-full font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all text-sm flex items-center gap-2"
                   >
                      <MessageCircle size={18} /> Message
                   </button>
                   <button 
                     onClick={() => handleAction(match.id, 'accepted')}
                     className={`p-4 rounded-full ${match.status === 'accepted' ? 'bg-brand-primary text-white' : 'bg-brand-accent/10 text-brand-accent'}`}
                   >
                      <Heart size={24} fill="currentColor" />
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
