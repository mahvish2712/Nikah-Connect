import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Bell, Eye, Heart, MessageSquare, CheckCircle, Clock, ShieldCheck, Mail, ArrowLeft, Sparkles, Star, Phone } from 'lucide-react';
import { auth, db, logout, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, getCountFromServer, limit, getDocs, addDoc, serverTimestamp, orderBy, getDoc, doc, updateDoc } from 'firebase/firestore';
import BackButton from '../components/common/BackButton';

const FloatingHeart = ({ delay = 0, size = 20, x = '0' }: { delay?: number, size?: number, x?: string | number }) => (
// ... existing FloatingHeart component ...
  <motion.div
    initial={{ y: '110vh', x, opacity: 0, scale: 0 }}
    animate={{ 
      y: '-10vh', 
      opacity: [0, 0.4, 0.4, 0],
      scale: [0.5, 1, 1, 0.8],
      x: [x as any, (x as any) + 50, (x as any) - 50, x as any] 
    }}
    transition={{ 
      duration: 15, 
      delay, 
      repeat: Infinity,
      ease: "linear"
    }}
    className="absolute pointer-events-none text-brand-primary/10 z-0"
  >
    <Heart size={size} fill="currentColor" />
  </motion.div>
);

export default function Dashboard({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const user = auth?.currentUser;
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const sessionId = params.get('session_id');

    if (success === 'true' && sessionId && user && !isVerifyingPayment) {
      const verifyPayment = async () => {
        setIsVerifyingPayment(true);
        console.log("DEBUG: Starting payment verification for session:", sessionId);
        try {
          const response = await fetch(`/api/verify-session?sessionId=${sessionId}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          console.log("DEBUG: Verification response Data:", data);
          
          if (data.status === 'paid' && data.userId === user.uid) {
            console.log("DEBUG: Verification successful! Updating profile...");
            // Update user profile in Firestore
            await updateDoc(doc(db, 'profiles', user.uid), {
              subscriptionStatus: 'premium',
              subscriptionId: sessionId,
              updatedAt: serverTimestamp()
            });
            
            const { toast } = await import('sonner');
            toast.success('Welcome to Premium! Your features are now unlocked.', {
              description: 'You now have access to all exclusive NikaahConnect features.'
            });
            
            // Remove query params
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.warn("DEBUG: Verification failed or userId mismatch", { data, currentUid: user.uid });
          }
        } catch (error) {
          console.error("DEBUG: Payment verification failed:", error);
          const { toast } = await import('sonner');
          toast.error('Payment verification encountered an issue. Please contact support.');
        } finally {
          setIsVerifyingPayment(false);
        }
      };
      verifyPayment();
    } else if (success === 'false') {
      import('sonner').then(({ toast }) => toast.error('Payment cancelled.'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, isVerifyingPayment]);

  const [statsData, setStatsData] = useState([
    { label: 'Profile Views', value: '0', icon: <Eye size={20} />, color: 'bg-indigo-600' },
    { label: 'Total Matches', value: '0', icon: <Heart size={20} />, color: 'bg-brand-primary' },
    { label: 'Conversations', value: '0', icon: <MessageSquare size={20} />, color: 'bg-brand-accent' },
  ]);

  useEffect(() => {
    if (!user) return;

    // Listen for pending requests received
    const qRequests = query(
      collection(db, 'matches'),
      where('ids', 'array-contains', user.uid),
      where('status', '==', 'pending')
    );

    const unsubRequests = onSnapshot(qRequests, async (snapshot) => {
      const requests = await Promise.all(snapshot.docs
        .filter(doc => doc.data().senderId !== user.uid)
        .map(async (docSnap) => {
          const data = docSnap.data();
          const senderId = data.senderId;
          let senderProfile = { name: 'Someone', photoUrl: '' };
          try {
            const pSnap = await getDoc(doc(db, 'profiles', senderId));
            if (pSnap.exists()) senderProfile = pSnap.data() as any;
          } catch (e) {}
          return {
            id: docSnap.id,
            ...data,
            sender: {
              id: senderId,
              ...senderProfile
            }
          };
        })
      );
      setPendingRequests(requests);
    });

    // Listen for matches count
    const qMatches = query(
      collection(db, 'matches'),
      where('ids', 'array-contains', user.uid)
    );

    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const allMatches = snapshot.docs.map(d => d.data());
      const totalMatchesCount = allMatches.length; 
      const acceptedCount = allMatches.filter(m => m.status === 'accepted' || m.lastMessageType).length;
      
      setStatsData(prev => [
        { ...prev[0] }, 
        { ...prev[1], value: totalMatchesCount.toString() },
        { ...prev[2], value: acceptedCount.toString() },
      ]);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    // Listen for visitors count
    const qViewsTotal = query(
      collection(db, 'views'),
      where('viewedId', '==', user.uid)
    );

    const unsubViewsTotal = onSnapshot(qViewsTotal, (snapshot) => {
      setStatsData(prev => [
        { ...prev[0], value: snapshot.size.toString() },
        prev[1],
        prev[2],
      ]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'views');
      setLoading(false);
    });

    // Fetch recent views activity
    const qViews = query(
      collection(db, 'views'),
      where('viewedId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubRecentViews = onSnapshot(qViews, async (snapshot) => {
      const activities = await Promise.all(snapshot.docs.map(async (vDoc) => {
        const data = vDoc.data();
        let name = 'Someone';
        try {
          const uSnap = await getDoc(doc(db, 'profiles', data.viewerId));
          if (uSnap.exists()) name = uSnap.data().name.split(' ')[0];
        } catch (e) {}

        return {
          id: vDoc.id,
          type: 'view',
          user: name,
          time: 'Recently',
          icon: <Eye size={16} className="text-indigo-600" />
        };
      }));
      setRecentActivities(prev => [...prev.filter(a => a.type !== 'view'), ...activities].slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'views_recent');
    });

    // Fetch recent matches activity
    const qRecentMatches = query(
      collection(db, 'matches'),
      where('ids', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(3)
    );

    const unsubRecentMatches = onSnapshot(qRecentMatches, async (snapshot) => {
       const activities = await Promise.all(snapshot.docs.map(async (mDoc) => {
        const data = mDoc.data();
        const otherId = data.ids.find((id: string) => id !== user.uid);
        let name = 'Someone';
        try {
          const uSnap = await getDoc(doc(db, 'profiles', otherId));
          if (uSnap.exists()) name = uSnap.data().name.split(' ')[0];
        } catch (e) {}

        return {
          id: mDoc.id,
          type: 'match',
          user: name,
          time: data.status === 'accepted' ? 'Matched' : 'Interested',
          icon: <Heart size={16} className="text-brand-primary" />,
          matchId: mDoc.id
        };
      }));
      setRecentActivities(prev => [...prev.filter(a => a.type !== 'match'), ...activities].slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches_recent');
    });

    return () => {
      unsubRequests();
      unsubMatches();
      unsubViewsTotal();
      unsubRecentViews();
      unsubRecentMatches();
    };
  }, [user]);

  const stats = [
    { label: 'Profile Views', value: statsData[0].value, icon: <Eye size={20} />, color: 'bg-indigo-600' },
    { label: 'Total Matches', value: statsData[1].value, icon: <Heart size={20} />, color: 'bg-brand-primary' },
    { label: 'Conversations', value: statsData[2].value, icon: <MessageSquare size={20} />, color: 'bg-brand-accent' },
  ];

  const handleRequestAction = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'matches', requestId), {
        status: action,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${requestId}`);
    }
  };

  const handleLogoutAction = async () => {
    await logout();
    navigate('/login');
  };

  const calculateCompleteness = () => {
    if (!profile) return 0;
    const fields = ['name', 'age', 'location', 'profession', 'education', 'bio', 'photoUrl', 'gender'];
    const filled = fields.filter(f => !!profile[f]).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completeness = calculateCompleteness();

  return (
    <div className="min-h-screen pt-20 pb-24 bg-brand-cream/40 relative overflow-hidden">
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
                src={profile?.photoUrl || user?.photoURL || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=90&w=800&auto=format&fit=crop"} 
                className="max-w-full max-h-full object-contain rounded-lg lg:rounded-2xl shadow-2xl"
                alt="Profile"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setShowPhotoPreview(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors"
              >
                Close Preview <Settings size={20} className="rotate-90" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Hearts Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <FloatingHeart delay={0} size={20} x="10%" />
        <FloatingHeart delay={5} size={30} x="30%" />
        <FloatingHeart delay={2} size={15} x="50%" />
        <FloatingHeart delay={8} size={25} x="70%" />
        <FloatingHeart delay={4} size={20} x="90%" />
      </div>

      {/* Background Enhancements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-brand-primary/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-brand-accent/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="mb-6">
           <BackButton label="Back to Website" to="/" />
        </div>

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="serif text-5xl font-bold text-brand-dark tracking-tight">Salaam, {profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Member'}</h1>
            <p className="text-gray-500 font-light mt-2 flex items-center gap-2">
               <ShieldCheck className="text-brand-accent" size={16} /> 
               Your profile is secure and protected under our premium encryption.
            </p>
          </div>
          <div className="flex gap-4 relative">
            <div className="relative">
              <button 
                onClick={() => setShowAlerts(!showAlerts)}
                className={`w-12 h-12 sm:w-auto sm:px-5 sm:py-2.5 rounded-2xl bg-white border border-brand-primary/5 shadow-sm text-gray-500 hover:text-brand-primary transition-all flex items-center justify-center sm:justify-start gap-2 relative ${showAlerts ? 'text-brand-primary ring-2 ring-brand-primary/10' : ''}`}
              >
                <Bell size={20} />
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-1 sm:-right-1 w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-pulse shadow-md z-10">
                    {pendingRequests.length}
                  </span>
                )}
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Alerts</span>
              </button>

              <AnimatePresence>
                {showAlerts && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] shadow-2xl border border-brand-primary/5 z-[60] overflow-hidden"
                  >
                    <div className="p-6 border-b border-brand-cream flex justify-between items-center">
                       <h4 className="font-bold text-brand-dark">Notifications</h4>
                       <span className="text-[10px] font-bold text-white bg-brand-primary px-2 py-0.5 rounded-full">New</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                       {pendingRequests.length === 0 ? (
                         <div className="p-8 text-center">
                            <Bell className="mx-auto text-brand-primary/10 mb-4" size={32} />
                            <p className="text-xs text-gray-400 italic">No new interests at the moment.</p>
                         </div>
                       ) : (
                         <div className="divide-y divide-brand-cream">
                            {pendingRequests.map((request) => (
                              <div key={request.id} className="p-5 flex gap-4 hover:bg-brand-cream/30 transition-colors">
                                 <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-brand-primary/10">
                                    <img src={request.sender.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} className="w-full h-full object-cover" alt="" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-xs font-bold text-brand-dark mb-1">{request.sender.name}</p>
                                    <p className="text-[10px] text-gray-500 leading-tight mb-3">Expressed interest in your profile.</p>
                                    <div className="flex gap-2">
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); handleRequestAction(request.id, 'accepted'); }}
                                         className="px-3 py-1.5 bg-brand-primary text-white text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-sm hover:bg-brand-primary/90"
                                       >
                                         Accept
                                       </button>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); handleRequestAction(request.id, 'rejected'); }}
                                         className="px-3 py-1.5 bg-white border border-brand-primary/10 text-gray-400 text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-brand-accent hover:text-white"
                                       >
                                         Decline
                                       </button>
                                    </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                    <div className="p-4 bg-brand-cream/30 text-center">
                       <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">Mark all as read</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleLogoutAction}
              className="px-5 py-2.5 rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20 font-bold text-xs uppercase tracking-widest hover:bg-brand-primary/90 transition-all"
            >
               Sign Out
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => {
                if (stat.label === 'Total Matches') navigate('/matches');
                if (stat.label === 'Conversations') navigate('/messages');
                if (stat.label === 'Profile Views') navigate('/discover');
              }}
              className="p-8 rounded-[3rem] bg-brand-cream border border-brand-accent/10 shadow-xl shadow-brand-dark/5 overflow-hidden relative group cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${stat.color} text-white shadow-lg`}>
                  {stat.icon}
                </div>
                <span className="text-4xl font-bold text-brand-dark tracking-tight">{stat.value}</span>
              </div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</p>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-accent opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700" />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <section className="p-10 rounded-[3rem] bg-brand-primary text-white shadow-2xl shadow-brand-primary/20 overflow-hidden relative border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent opacity-10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-8">
                  <div 
                    className="w-24 h-24 rounded-3xl border-4 border-white/20 overflow-hidden shadow-2xl rotate-3 cursor-zoom-in hover:rotate-0 hover:scale-110 transition-all duration-500"
                    onClick={() => setShowPhotoPreview(true)}
                  >
                    <img 
                      src={profile?.photoUrl || user?.photoURL || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=90&w=800&auto=format&fit=crop"} 
                      alt="User" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                <div>
                  <h3 className="serif text-3xl font-bold text-white tracking-wide flex items-center gap-2 flex-wrap">
                    Salaam, <span className="script text-brand-accent capitalize text-4xl block sm:inline italic font-normal">{profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Member'}</span>
                    {profile?.subscriptionStatus === 'premium' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md">
                        <Star size={10} fill="currentColor" /> Premium
                      </span>
                    )}
                  </h3>
                  <p className="text-white/60 text-sm font-light italic mt-1 font-sans font-medium uppercase tracking-[0.2em] text-[10px]">Your Sanctuary Overview</p>
                </div>
                </div>
                <div className="w-full bg-white/10 h-3 rounded-full mb-10 overflow-hidden backdrop-blur-md border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completeness}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-brand-accent rounded-full shadow-[0_0_15px_rgba(197,160,33,0.5)]"
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => navigate('/edit-profile')} className="px-8 py-3 bg-white text-brand-primary rounded-full text-xs font-bold uppercase tracking-widest shadow-xl hover:bg-brand-cream transition-all">
                    Edit Profile
                  </button>
                  <button className="px-8 py-3 bg-brand-accent text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-xl hover:scale-105 transition-all outline outline-white/20">
                    Verify Account <CheckCircle size={14} className="inline ml-1" />
                  </button>
                  {profile?.subscriptionStatus !== 'premium' && (
                    <button 
                      onClick={() => navigate('/subscribe')}
                      className="px-8 py-3 bg-white text-brand-accent rounded-full text-xs font-bold uppercase tracking-widest shadow-xl hover:bg-brand-cream transition-all flex items-center gap-2"
                    >
                      <Sparkles size={14} /> Go Premium
                    </button>
                  )}
                </div>
              </div>
            </section>

            {pendingRequests.length > 0 && (
              <section className="bg-white p-10 rounded-[3rem] border border-brand-primary/5 shadow-xl shadow-brand-primary/5 relative">
                <h3 className="serif text-3xl font-bold text-brand-dark mb-8 flex items-center gap-3">
                  Interests Received <span className="w-8 h-8 rounded-full bg-brand-accent text-white text-sm flex items-center justify-center font-sans">{pendingRequests.length}</span>
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="p-6 rounded-[2rem] bg-brand-cream/30 border border-brand-primary/10 flex flex-col items-center text-center">
                       <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 border-2 border-white shadow-md">
                          <img src={request.sender.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2"} className="w-full h-full object-cover" alt="" />
                       </div>
                       <h4 className="font-bold text-brand-dark">{request.sender.name}</h4>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">Wants to connect</p>
                       <div className="flex gap-2 w-full">
                          <button 
                            onClick={() => handleRequestAction(request.id, 'accepted')}
                            className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleRequestAction(request.id, 'rejected')}
                            className="px-4 py-2.5 bg-white text-gray-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-all border border-brand-primary/5"
                          >
                            Decline
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white p-10 rounded-[3rem] border border-brand-primary/5 shadow-xl shadow-brand-primary/5 relative">
              <h3 className="serif text-3xl font-bold text-brand-dark mb-8">Personal Insights</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                 <div className="p-8 rounded-[2rem] bg-brand-cream/30 border border-brand-primary/10 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                       <Mail size={36} />
                    </div>
                    <h4 className="font-bold text-brand-dark mb-2">New Interests</h4>
                    <p className="text-xs text-gray-500 font-light mb-6 leading-relaxed px-4">{stats[0].value} members have indicated they would like to know more about you.</p>
                    <button onClick={() => navigate('/matches')} className="px-6 py-2 border border-brand-accent text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-brand-accent hover:text-white transition-all">View Profiles</button>
                 </div>
                 <div className="p-8 rounded-[2rem] bg-brand-cream/30 border border-brand-primary/10 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6 group-hover:-rotate-6 transition-transform">
                       <Clock size={36} />
                    </div>
                    <h4 className="font-bold text-brand-dark mb-2">Discovery Queue</h4>
                    <p className="text-xs text-gray-500 font-light mb-6 leading-relaxed px-4">Our algorithm has curated fresh profiles based on your recent preferences.</p>
                    <button onClick={() => navigate('/discover')} className="px-6 py-2 border border-brand-primary text-brand-primary rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-brand-primary hover:text-white transition-all">Start Discovering</button>
                 </div>
                 <div className="p-8 rounded-[2rem] bg-brand-cream/30 border border-brand-primary/10 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                       <Phone size={36} />
                    </div>
                    <h4 className="font-bold text-brand-dark mb-2">Call History</h4>
                    <p className="text-xs text-gray-500 font-light mb-6 leading-relaxed px-4">Review your past audio and video sessions with your matches.</p>
                    <button onClick={() => navigate('/calls')} className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all">View History</button>
                 </div>
              </div>
            </section>
          </div>

          <section className="bg-white p-10 rounded-[3rem] border border-brand-primary/5 shadow-2xl shadow-brand-primary/5 h-fit sticky top-24">
            <h3 className="serif text-2xl font-bold text-brand-dark mb-8 border-b border-brand-cream pb-4">Real-time Activity</h3>
            <div className="space-y-8">
              {recentActivities.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No recent activity. Start matching to see updates!</p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-5 items-start cursor-pointer hover:bg-brand-cream/20 p-2 rounded-xl transition-all"
                    onClick={() => {
                      if (activity.type === 'match') navigate('/matches');
                      if (activity.type === 'view') navigate('/dashboard');
                    }}
                  >
                    <div className="mt-1.5 p-2 rounded-xl bg-brand-cream text-brand-dark">{activity.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark leading-tight">
                        <span className="font-bold">{activity.user}</span> {activity.type === 'match' ? (activity.time === 'Matched' ? 'and you are now matched!' : 'expressed interest in you') : 'viewed your profile'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-12 p-8 bg-brand-primary rounded-[2rem] text-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-brand-accent opacity-0 group-hover:opacity-10 transition-opacity" />
               <p className="text-[10px] font-bold text-brand-accent uppercase tracking-[0.3em] mb-2">Membership Status</p>
               <h4 className="text-white font-bold serif text-xl mb-1 italic">
                 {profile?.subscriptionStatus === 'premium' ? 'Royal Platinum' : 'Standard Member'}
               </h4>
               <p className="text-[10px] text-white/50 uppercase tracking-widest font-light">
                 {profile?.subscriptionStatus === 'premium' ? 'All features unlocked' : 'Limited features'}
               </p>
               <button 
                onClick={() => navigate('/subscribe')}
                className="mt-6 w-full py-3 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-all shadow-md"
               >
                {profile?.subscriptionStatus === 'premium' ? 'Manage Subscription' : 'Upgrade to Premium'}
               </button>

                {/* Admin Signaling Diagnostic */}
               {(user?.email === '27mahvishsid@gmail.com' || user?.email === 'nikaahconnect@gmail.com' || user?.email === 'mohdjaved52677@gmail.com' || user?.email === 'javeddd@student.iul.ac.in') && (
                 <div className="mt-3 space-y-2">
                   <button 
                    onClick={async () => {
                      const nextStatus = profile?.subscriptionStatus === 'premium' ? 'free' : 'premium';
                      try {
                        await updateDoc(doc(db, 'profiles', user.uid), {
                          subscriptionStatus: nextStatus,
                          updatedAt: serverTimestamp()
                        });
                        const { toast } = await import('sonner');
                        toast.info(`ADMIN: Switched to ${nextStatus} mode`);
                      } catch (e) {
                        console.error("Admin toggle failed", e);
                      }
                    }}
                    className="w-full py-2 bg-brand-dark/10 border border-brand-dark/20 text-brand-dark rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all opacity-50 hover:opacity-100"
                   >
                    Simulator: {profile?.subscriptionStatus === 'premium' ? 'Downgrade' : 'Upgrade'}
                   </button>
                   
                   <button 
                    onClick={async () => {
                      const { toast } = await import('sonner');
                      toast.loading("Sending test signal to self...");
                      try {
                        await addDoc(collection(db, 'calls'), {
                          matchId: 'test-match-id',
                          callerId: user.uid,
                          receiverId: user.uid, // Calling self
                          type: 'video',
                          status: 'pending',
                          createdAt: serverTimestamp()
                        });
                        toast.success("Signal sent! If listener is active, you should see the overlay now.");
                      } catch (e: any) {
                        toast.error("Signal failed: " + e.message);
                      }
                    }}
                    className="w-full py-2 bg-brand-accent/20 border border-brand-accent/30 text-brand-accent rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-all"
                   >
                    🧪 Diagnostic: Call Self
                   </button>
                 </div>
               )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
