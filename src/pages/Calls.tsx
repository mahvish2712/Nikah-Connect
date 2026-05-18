import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Calendar, Search, Trash2, MessageCircle } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';

import { toast } from 'sonner';

export default function Calls() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'audio' | 'video'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'missed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calls'),
      where('callerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const q2 = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Since we can't do an OR query with multiple orderBy fields easily in simple rules/queries without composite indexes
    // we listen to both and merge.
    
    let logs1: any[] = [];
    let logs2: any[] = [];

    const profilesCache = new Map();

    const updateLogs = async () => {
      const allLogs = [...logs1, ...logs2].sort((a, b) => {
        const timeA = b.createdAt?.seconds || 0;
        const timeB = a.createdAt?.seconds || 0;
        return timeA - timeB;
      });

      const uniqueLogs = Array.from(new Map(allLogs.map(item => [item.id, item])).values());
      
      const enrichedLogs = await Promise.all(uniqueLogs.map(async (log) => {
        const otherUserId = log.callerId === user.uid ? log.receiverId : log.callerId;
        
        if (!profilesCache.has(otherUserId)) {
          const profileSnap = await getDoc(doc(db, 'profiles', otherUserId));
          profilesCache.set(otherUserId, profileSnap.data());
        }
        
        const profileData = profilesCache.get(otherUserId);
        
        return {
          ...log,
          otherUser: {
            id: otherUserId,
            name: profileData?.name || 'User',
            photo: profileData?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop'
          }
        };
      }));

      setLogs(enrichedLogs);
      setLoading(false);
    };

    const unsub1 = onSnapshot(q, (snap) => {
      logs1 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateLogs();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      logs2 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateLogs();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const startCall = async (otherUserId: string, matchId: string, type: 'audio' | 'video') => {
    if (!user) return;
    try {
      toast.loading(`Initiating ${type} call...`, { id: 'starting-call' });
      await addDoc(collection(db, 'calls'), {
        matchId,
        callerId: user.uid,
        receiverId: otherUserId,
        type,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Calling...", { id: 'starting-call' });
    } catch (err: any) {
      console.error("Direct call error:", err);
      toast.error("Failed to start call", { id: 'starting-call' });
    }
  };

  const deleteLog = async (logId: string) => {
    const previousLogs = [...logs];
    try {
      // Optimistic update
      setLogs(prev => prev.filter(l => l.id !== logId));
      await deleteDoc(doc(db, 'calls', logId));
      toast.success("Call log deleted");
    } catch (err: any) {
      setLogs(previousLogs);
      console.error("Error deleting call log:", err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `calls/${logId}`);
      } catch (e) {
        // Error already handled/logged
      }
      toast.error("Failed to delete log");
    }
  };

  return (
    <div className="min-h-screen pt-20 md:pt-16 pb-24 md:pb-0 bg-brand-cream/30">
      <div className="max-w-4xl mx-auto px-6">
        <header className="flex items-center gap-6 mb-10">
          <BackButton />
          <div>
            <h1 className="serif text-4xl font-bold text-brand-dark">Call Logs</h1>
            <p className="text-gray-500 italic mt-1">Review your recent audio and video connections.</p>
          </div>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/60 backdrop-blur-md border border-brand-primary/10 rounded-[2rem] py-5 pl-16 pr-8 text-sm focus:ring-2 focus:ring-brand-accent shadow-xl shadow-brand-primary/5 italic"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2 p-1 bg-white/40 backdrop-blur-md rounded-2xl border border-brand-primary/5 w-fit">
            {[
              { id: 'all', label: 'All Types', icon: Phone },
              { id: 'audio', label: 'Audio', icon: Phone },
              { id: 'video', label: 'Video', icon: Video },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setTypeFilter(type.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  typeFilter === type.id 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-gray-500 hover:bg-brand-primary/10'
                }`}
              >
                <type.icon size={12} />
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 p-1 bg-white/40 backdrop-blur-md rounded-2xl border border-brand-primary/5 w-fit">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'completed', label: 'Completed' },
              { id: 'missed', label: 'Missed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setStatusFilter(status.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === status.id 
                    ? 'bg-brand-accent text-white shadow-md' 
                    : 'text-gray-500 hover:bg-brand-accent/10'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-white/40 p-6 rounded-[2rem] flex items-center gap-6">
                <Skeleton circle width="64px" height="64px" />
                <div className="flex-1 space-y-3">
                  <Skeleton width="40%" height="1.25rem" />
                  <Skeleton width="20%" height="0.75rem" />
                </div>
              </div>
            ))
          ) : filteredLogs.length === 0 ? (
            <EmptyState 
              icon={Phone}
              title={searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? "No Matches Found" : "No Call History"}
              description={searchTerm || typeFilter !== 'all' || statusFilter !== 'all' 
                ? `We couldn't find any call logs matching your current filters.` 
                : "You haven't made any calls yet. Start a conversation and reach out to your matches!"}
              actionLabel={searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? "Clear All Filters" : "Go to Messages"}
              onAction={searchTerm || typeFilter !== 'all' || statusFilter !== 'all' 
                ? () => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all'); } 
                : () => navigate('/messages')}
            />
          ) : (
            filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-brand-primary/5 shadow-xl shadow-brand-primary/5 hover:shadow-2xl hover:shadow-brand-primary/10 transition-all group flex items-center gap-6"
              >
                <div 
                  className="relative cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/profile/${log.otherUser.id}`)}
                >
                  <img 
                    src={log.otherUser.photo} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg" 
                    alt="" 
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${log.type === 'video' ? 'bg-indigo-500' : 'bg-brand-accent'}`}>
                    {log.type === 'video' ? <Video size={12} className="text-white" /> : <Phone size={12} className="text-white" />}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-brand-dark cursor-pointer hover:text-brand-primary transition-colors" onClick={() => navigate(`/profile/${log.otherUser.id}`)}>{log.otherUser.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${log.callerId === user.uid ? 'text-gray-400' : 'text-brand-accent'}`}>
                          {log.callerId === user.uid ? <PhoneOutgoing size={12} /> : <PhoneIncoming size={12} />}
                          {log.callerId === user.uid ? 'Outgoing' : 'Incoming'}
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${
                        log.status === 'completed' ? 'bg-green-100 text-green-600' : 
                        log.status === 'missed' ? 'bg-red-100 text-red-600' : 
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {log.status}
                      </div>
                      {log.status === 'completed' && (
                        <div className="text-[10px] text-gray-400 font-bold flex items-center justify-end gap-1">
                          <Clock size={12} /> {formatDuration(log.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => startCall(log.otherUser.id, log.matchId, 'video')}
                    className="p-4 bg-brand-cream/50 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                    title="Video Call Back"
                  >
                    <Video size={20} />
                  </button>
                  <button 
                    onClick={() => startCall(log.otherUser.id, log.matchId, 'audio')}
                    className="p-4 bg-brand-cream/50 rounded-2xl text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                    title="Audio Call Back"
                  >
                    <Phone size={20} />
                  </button>
                  <button 
                    onClick={() => navigate('/messages', { state: { matchId: log.matchId } })}
                    className="p-4 bg-brand-cream/50 rounded-2xl text-gray-400 hover:bg-brand-accent hover:text-white transition-all shadow-sm"
                    title="Message Partner"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button 
                    onClick={() => deleteLog(log.id)}
                    className="p-4 bg-red-50 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                    title="Delete Log"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
