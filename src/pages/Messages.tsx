import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MoreVertical, Phone, Video, Search, Heart, ArrowLeft, MessageCircle, Users, Palette, User, ShieldAlert, X, Mic, MicOff, VideoOff, Maximize2, PhoneOff, Trash2, Pause, Play, Star } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';

export default function Messages() {
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState('');
  const [chatTheme, setChatTheme] = useState('classic');

  useEffect(() => {
    if (activeChat) {
      setChatTheme(activeChat.theme || 'classic');
    }
  }, [activeChat?.id, activeChat?.theme]);
  const lastMessageIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isCancelledRef = useRef(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  const updateTheme = async (themeId: string) => {
    if (!activeChat) return;
    
    setChatTheme(themeId);
    setShowThemePicker(false);
    
    // Persist to the specific match document
    try {
      await updateDoc(doc(db, 'matches', activeChat.id), {
        theme: themeId,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error saving chat theme:", err);
    }
  };
  const [showConversationMenu, setShowConversationMenu] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const targetMatchId = location.state?.matchId;
  const autoCallType = location.state?.autoCall;

  // Selection logic for target match
  useEffect(() => {
    if (targetMatchId && !activeChat && chats.length > 0) {
      const match = chats.find(c => c.id === targetMatchId);
      if (match) {
        setActiveChat(match);
      }
    }
  }, [targetMatchId, chats, activeChat]);

  // Handle auto-calling
  useEffect(() => {
    if (autoCallType && activeChat?.id === targetMatchId) {
       // Short delay to ensure everything is ready
       const timer = setTimeout(() => {
         startCall(autoCallType);
         // Clear state to prevent repeat calls on refresh
         window.history.replaceState({}, document.title);
       }, 500);
       return () => clearTimeout(timer);
    }
  }, [activeChat, autoCallType, targetMatchId]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearId, setConfirmClearId] = useState<string | null>(null);

  const deleteConversation = async (matchId: string) => {
    if (!matchId || !auth.currentUser) return;
    
    const deletePromise = async () => {
      try {
        console.log(`[Messages] Deleting match: ${matchId}`);
        const msgsQuery = query(collection(db, `matches/${matchId}/messages`));
        const msgsSnap = await getDocs(msgsQuery);
        console.log(`[Messages] Deleting ${msgsSnap.docs.length} messages`);
        
        const mainBatch = writeBatch(db);
        
        // Use a more robust batching strategy
        if (msgsSnap.docs.length > 0) {
          // Process messages in chunks
          let count = 0;
          let currentBatch = writeBatch(db);
          
          for (const msgDoc of msgsSnap.docs) {
            currentBatch.delete(msgDoc.ref);
            count++;
            
            if (count >= 450) {
              await currentBatch.commit();
              currentBatch = writeBatch(db);
              count = 0;
            }
          }
          
          // Last few messages and the match document in the final batch
          // We use mainBatch for the final operation
          msgsSnap.docs.slice(msgsSnap.docs.length - count).forEach(d => mainBatch.delete(d.ref));
        }
        
        mainBatch.delete(doc(db, 'matches', matchId));
        await mainBatch.commit();
        
        console.log(`[Messages] Match ${matchId} fully deleted`);
        
        if (activeChat?.id === matchId) {
          setActiveChat(null);
        }
        setConfirmDeleteId(null);
      } catch (err: any) {
        console.error("[Messages] Delete failure:", err);
        throw err;
      }
    };

    toast.promise(deletePromise(), {
      loading: 'Deleting conversation...',
      success: 'Conversation deleted',
      error: (err) => `Failed: ${err.message || 'Unknown error'}`
    });
  };

  const clearChat = async (matchId: string) => {
    if (!matchId || !auth.currentUser) return;
    
    const clearPromise = async () => {
      try {
        console.log(`[Messages] Clearing chat: ${matchId}`);
        const msgsQuery = query(collection(db, `matches/${matchId}/messages`));
        const msgsSnap = await getDocs(msgsQuery);
        
        let count = 0;
        let currentBatch = writeBatch(db);
        
        if (msgsSnap.docs.length > 0) {
          for (const msgDoc of msgsSnap.docs) {
            currentBatch.delete(msgDoc.ref);
            count++;
            
            if (count >= 450) {
              await currentBatch.commit();
              currentBatch = writeBatch(db);
              count = 0;
            }
          }
        }
        
        // Final updates to the match document
        const matchRef = doc(db, 'matches', matchId);
        currentBatch.update(matchRef, {
          lastMessageType: null,
          lastMessageContent: null,
          lastMessageSenderId: null,
          updatedAt: serverTimestamp()
        });
        
        await currentBatch.commit();
        console.log(`[Messages] Chat ${matchId} cleared`);
        setConfirmClearId(null);
      } catch (err: any) {
        console.error("[Messages] Clear failure:", err);
        throw err;
      }
    };

    toast.promise(clearPromise(), {
      loading: 'Clearing conversation...',
      success: 'Conversation cleared',
      error: (err) => `Failed: ${err.message || 'Unknown error'}`
    });
  };

  // Load chats (Matches)
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'matches'),
      where('ids', 'array-contains', auth.currentUser?.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchData = async () => {
        try {
          const allMatches = snapshot.docs
            .sort((a, b) => {
              const dataA = a.data();
              const dataB = b.data();
              
              // Prioritize starred
              if (dataA.isStarred && !dataB.isStarred) return -1;
              if (!dataA.isStarred && dataB.isStarred) return 1;
              
              const timeA = dataA.updatedAt?.seconds || dataA.createdAt?.seconds || 0;
              const timeB = dataB.updatedAt?.seconds || dataB.createdAt?.seconds || 0;
              return timeB - timeA;
            });

          const matchData = await Promise.all(allMatches.map(async (matchDoc) => {
            const data = matchDoc.data();
            const otherUserId = data.ids.find((id: string) => id !== auth.currentUser?.uid);
            try {
              const userSnap = await getDoc(doc(db, 'profiles', otherUserId));
              const userData = userSnap.data();
              
              return {
                id: matchDoc.id,
                ...data,
                otherUser: {
                  id: otherUserId,
                  name: userData?.name || 'User',
                  photo: userData?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=90&w=800&auto=format&fit=crop&q=80',
                  online: true
                }
              };
            } catch (err) {
              console.error("Error fetching match profile:", err);
              handleFirestoreError(err, OperationType.GET, `profiles/${otherUserId}`);
              throw err;
            }
          }));
          
          setChats(matchData);
          
          // Set active chat from state if provided, otherwise wait for user selection
          if (matchData.length > 0 && targetMatchId && !activeChat) {
            const match = matchData.find(c => c.id === targetMatchId);
            if (match) {
              setActiveChat(match);
            }
          }
        } catch (err) {
          console.error("Error fetching match profiles:", err);
        } finally {
          setChatsLoading(false);
          setLoading(false);
        }
      };

      fetchData();
    }, (error) => {
      console.error("Matches subscription error:", error);
      handleFirestoreError(error, OperationType.LIST, 'matches');
      setChatsLoading(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid, targetMatchId]);

  // Sync activeChat with latest data from chats list
  useEffect(() => {
    if (activeChat && chats.length > 0) {
      const updatedMatch = chats.find(c => c.id === activeChat.id);
      if (updatedMatch) {
         if (JSON.stringify(updatedMatch) !== JSON.stringify(activeChat)) {
           setActiveChat(updatedMatch);
         }
      } else {
        // If match no longer in chats list (deleted), close the chat window
        setActiveChat(null);
      }
    }
  }, [chats, activeChat]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, `matches/${activeChat.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      // Notification for new received message
      if (msgs.length > 0) {
        const lastMsg: any = msgs[msgs.length - 1];
        if (lastMessageIdRef.current && lastMessageIdRef.current !== lastMsg.id) {
          if (lastMsg.senderId !== auth.currentUser?.uid) {
            // Enhanced "Alert Box" notification
            toast.custom((t) => (
              <div className="bg-brand-dark/95 backdrop-blur-2xl border-4 border-brand-accent p-6 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center gap-6 max-w-md pointer-events-auto ring-4 ring-brand-accent/20">
                <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden shadow-2xl border-2 border-white/20 flex-shrink-0">
                  <img src={activeChat?.otherUser?.photo} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                    <h4 className="font-black text-white text-xs uppercase tracking-widest">{activeChat?.otherUser?.name || 'Partner'}</h4>
                  </div>
                  <p className="text-sm text-white/80 font-bold italic serif">
                    {lastMsg.type === 'voice' ? 'Sent you a voice note' : (lastMsg.content?.length > 50 ? lastMsg.content.substring(0, 50) + '...' : lastMsg.content)}
                  </p>
                  <p className="text-[9px] text-brand-accent font-black uppercase tracking-[0.2em] mt-2">New Message Received</p>
                </div>
                <button 
                  onClick={() => toast.dismiss(t)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white"
                >
                  <X size={20} />
                </button>
              </div>
            ), {
              duration: 6000,
              position: 'top-center'
            });

            // Play a small notification sound if possible
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {}); // Avoid error if autoplay blocked
            } catch (e) {}
          }
        }
        lastMessageIdRef.current = lastMsg.id;
      }

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => {
      console.error("Messages subscription error:", error);
      handleFirestoreError(error, OperationType.LIST, `matches/${activeChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const [sendError, setSendError] = useState<string | null>(null);

  const startCall = async (type: 'audio' | 'video') => {
    if (!activeChat || !auth.currentUser) return;

    try {
      console.log("DEBUG Messages: Creating call doc for", activeChat.otherUser.id);
      // Let CallOverlay handle the UI and WebRTC. We just create the document.
      await addDoc(collection(db, 'calls'), {
        matchId: activeChat.id,
        callerId: auth.currentUser.uid,
        receiverId: activeChat.otherUser.id,
        type: type,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      console.log("DEBUG Messages: Call doc created");
    } catch (err: any) {
      console.error("DEBUG Messages: Start call failure", err);
      toast.error("Failed to start call: " + (err.message || "Unknown error"));
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeChat) return;
    
    try {
      const path = `matches/${activeChat.id}/messages/${messageId}`;
      await deleteDoc(doc(db, path));
      setDeletingMessageId(null);
      toast.success("Message deleted");
    } catch (err: any) {
      console.error("Error deleting message:", err);
      handleFirestoreError(err, OperationType.DELETE, `matches/${activeChat.id}/messages/${messageId}`);
      toast.error("Failed to delete message");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      isCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
        
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (isCancelledRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (chunksRef.current.length === 0) {
          toast.error("No audio data collected. Please try again.");
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio.length > 800000) { // Limit for Firestore document size
            toast.error("Recording too long. Please keep it under 40 seconds.");
            return;
          }
          await sendVoiceNote(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with 1000ms timeslice to ensure data available events
      mediaRecorder.start(1000);
      setRecorder(mediaRecorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 50) { // Auto-stop at 50 seconds to prevent size issues
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      toast.success("Voice note recording started.");
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Please allow microphone access to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      toast.success("Voice note recording ended.");
      toast.loading("Processing audio...", { id: 'voice-processing' });
    }
  };

  const cancelRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      isCancelledRef.current = true;
      recorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      toast.error("Recording cancelled.");
    }
  };

  const retakeRecording = () => {
    cancelRecording();
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  const sendVoiceNote = async (audioData: string) => {
    if (!activeChat || !auth.currentUser) {
      toast.dismiss('voice-processing');
      return;
    }

    try {
      const matchRef = doc(db, 'matches', activeChat.id);
      await addDoc(collection(db, `matches/${activeChat.id}/messages`), {
        matchId: activeChat.id,
        senderId: auth.currentUser.uid,
        receiverId: activeChat.otherUser.id,
        type: 'voice',
        audioData,
        timestamp: serverTimestamp(),
      });

      await updateDoc(matchRef, {
        lastMessageType: 'voice',
        lastMessageSenderId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      });

      toast.dismiss('voice-processing');
      toast.success("Voice note sent successfully!", {
        icon: <Mic size={16} className="text-green-500" />
      });
    } catch (error: any) {
      console.error("Send voice note error:", error);
      toast.dismiss('voice-processing');
      toast.error("Failed to send voice note");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !activeChat || !auth.currentUser) return;

    const content = msg;
    setMsg('');
    setSendError(null);

    try {
      const matchRef = doc(db, 'matches', activeChat.id);
      await addDoc(collection(db, `matches/${activeChat.id}/messages`), {
        matchId: activeChat.id,
        senderId: auth.currentUser.uid,
        receiverId: activeChat.otherUser.id,
        type: 'text',
        content,
        timestamp: serverTimestamp(),
      });
      
      await updateDoc(matchRef, {
        lastMessageType: 'text',
        lastMessageContent: content.substring(0, 50),
        lastMessageSenderId: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error("Send message error:", error);
      setSendError(error.message || "Failed to send message");
      handleFirestoreError(error, OperationType.CREATE, `matches/${activeChat.id}/messages`);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDayLabel = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString([], { 
      day: 'numeric', 
      month: 'long', 
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  const getThemeStyle = (theme: string) => {
    switch(theme) {
      case 'peach': return 'bg-[#fff5f0]';
      case 'ocean': return 'bg-[#f0f8ff]';
      case 'lavender': return 'bg-[#f8f0ff]';
      case 'night': return 'bg-gray-950 border-white/5';
      case 'doodle': return 'bg-[#dcedd5] border-green-900/5';
      default: return 'bg-transparent';
    }
  };

  const themes = [
    { id: 'classic', label: 'Classic', color: 'bg-brand-cream' },
    { id: 'peach', label: 'Warm Peach', color: 'bg-[#fff5f0]' },
    { id: 'ocean', label: 'Cool Blue', color: 'bg-[#f0f8ff]' },
    { id: 'lavender', label: 'Soft Lavender', color: 'bg-[#f8f0ff]' },
    { id: 'night', label: 'Midnight', color: 'bg-gray-950' },
    { id: 'doodle', label: 'Playful Doodle', color: 'bg-[#dcedd5]' },
  ];

  return (
    <div className="min-h-screen pt-20 md:pt-16 pb-24 md:pb-0 h-screen bg-brand-cream/30 flex overflow-hidden">
      {/* Photo Preview Modal */}
      <AnimatePresence>
        {showPhotoPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPhotoPreview(false)}
            className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={previewPhotoUrl} 
                className="max-w-full max-h-full object-contain rounded-lg lg:rounded-2xl shadow-2xl transition-all"
                alt="Preview"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setShowPhotoPreview(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors"
              >
                Close <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto w-full flex h-full border-x border-white/10 bg-white/40 backdrop-blur-3xl shadow-2xl">
        {/* Chat List */}
        <aside className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-brand-primary/5 bg-white/20 backdrop-blur-xl ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-brand-primary/5">
             <div className="flex items-center gap-4 mb-4">
               <BackButton />
               <h1 className="serif text-2xl font-bold text-brand-dark">Messages</h1>
             </div>
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search conversations..." 
                  className="w-full bg-brand-cream/50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-brand-accent italic"
                />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             {chatsLoading ? (
               <div className="p-6 space-y-4">
                 {[1, 2, 3, 4, 5].map((i) => (
                   <div key={i} className="flex gap-4 items-center">
                     <Skeleton circle width="56px" height="56px" />
                     <div className="flex-1 space-y-2">
                       <Skeleton width="60%" height="1rem" />
                       <Skeleton width="40%" height="0.75rem" />
                     </div>
                   </div>
                 ))}
               </div>
             ) : chats.length === 0 ? (
               <div className="p-8">
                 <EmptyState 
                    icon={MessageCircle}
                    title="No Chats Yet"
                    description="Your inbox is quiet. Once you and a match both like each other, you can start a conversation here."
                    actionLabel="Check Matches"
                    onAction={() => navigate('/matches')}
                    className="p-8 rounded-[2.5rem] shadow-none border-none bg-transparent"
                 />
               </div>
             ) : chats.map((chat) => (
                <div key={chat.id} className="relative group/chat">
                  <button
                    onClick={() => setActiveChat(chat)}
                    className={`w-full p-6 flex items-center gap-4 text-left border-b border-brand-primary/5 transition-colors ${activeChat?.id === chat.id ? 'bg-brand-cream/50' : 'hover:bg-brand-cream/20'}`}
                  >
                     <div className="relative" onClick={(e) => { e.stopPropagation(); setPreviewPhotoUrl(chat.otherUser.photo); setShowPhotoPreview(true); }}>
                        <img src={chat.otherUser.photo} className="w-14 h-14 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity" alt={chat.otherUser.name} />
                        {chat.otherUser.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white" />}
                        {chat.isStarred && <div className="absolute -top-1 -left-1 w-5 h-5 bg-brand-accent rounded-full border-4 border-white flex items-center justify-center text-[8px] text-white"><Star size={8} fill="currentColor" /></div>}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                           <h3 className="font-bold text-brand-dark truncate text-sm">{chat.otherUser.name}</h3>
                           <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${chat.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-brand-accent/10 text-brand-accent'}`}>
                             {chat.status === 'accepted' ? 'Match' : 'Interest'}
                           </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate italic font-light flex items-center gap-1">
                          {chat.lastMessageType === 'voice' && <Mic size={10} className="text-brand-primary" />}
                          {chat.lastMessageType === 'text' ? chat.lastMessageContent : (chat.lastMessageType === 'voice' ? 'Voice note' : 'Open conversation')}
                        </p>
                     </div>
                  </button>
                  
                  {/* Sidebar Item Menu */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 md:opacity-0 group-hover/chat:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConversationMenu(showConversationMenu === chat.id ? null : chat.id);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm shadow-xl rounded-xl text-brand-primary border border-brand-primary/10 hover:bg-white transition-all active:scale-95"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    <AnimatePresence>
                      {showConversationMenu === chat.id && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="absolute right-full mr-2 top-0 w-48 bg-white rounded-2xl shadow-2xl border border-brand-primary/5 p-2 z-[60]"
                        >
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmClearId(chat.id);
                               setShowConversationMenu(null);
                             }}
                             className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-brand-cream/50 rounded-xl transition-colors font-medium text-left"
                           >
                             <Trash2 size={16} className="text-brand-primary" /> Clear Conversation
                           </button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmDeleteId(chat.id);
                               setShowConversationMenu(null);
                             }}
                             className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium border-t border-brand-primary/5 mt-1 text-left"
                           >
                             <X size={16} /> Delete Conversation
                           </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
             ))}
          </div>
        </aside>

        {/* Chat Window */}
        <main className={`${activeChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col relative ${activeChat ? (chatTheme === 'doodle' ? 'bg-[#dcedd5]' : getThemeStyle(chatTheme)) : 'bg-transparent'}`}>
           {activeChat ? (
             <>
                {/* Doodle Background Pattern - Moved to cover whole chat */}
                {chatTheme === 'doodle' && (
                  <div className="absolute inset-0 opacity-[0.14] pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%231b5e20' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15 15c2-2 6 0 7 3s-1 5-4 5-5-2-3-8z'/%3E%3Cpath d='M40 20l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z'/%3E%3Cpath d='M70 15v20m0-5c0 0 5-2 5-5s-5-2-5-2'/%3E%3Cpath d='M100 20c-5 0-8 4-8 8s3 5 8 5h10c5 0 8-4 8-8s-3-8-8-8'/%3E%3Ccircle cx='130' cy='20' r='2'/%3E%3Ccircle cx='135' cy='25' r='2'/%3E%3Cpath d='M20 50c0 5 5 10 10 10s10-5 10-10'/%3E%3Ccircle cx='25' cy='45' r='1'/%3E%3Ccircle cx='35' cy='45' r='1'/%3E%3Cpath d='M60 50c5 0 5 5 10 5s5-5 10-5'/%3E%3Cpath d='M110 55h15v10c0 5-5 10-10 10h-5z'/%3E%3Cpath d='M125 58c3 0 5 2 5 5s-2 5-5 5'/%3E%3Cpath d='M30 90c0-5 5-10 10-10s10 5 10 10c0 10-10 15-10 15s-10-5-10-15z'/%3E%3Ccircle cx='40' cy='90' r='2'/%3E%3Crect x='80' y='80' width='15' height='25' rx='3'/%3E%3Ccircle cx='87.5' cy='100' r='1.5'/%3E%3Cpath d='M120 90l10 10m0-10l-10 10'/%3E%3Cpath d='M25 130l10 15h-20z'/%3E%3Ccircle cx='70' cy='130' r='5'/%3E%3Ccircle cx='110' cy='130' r='8' stroke-dasharray='2,2'/%3E%3C/g%3E%3C/svg%3E")` }} />
                )}
                <header className="p-6 bg-white/30 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-20 shadow-sm relative">
                  <div className="flex items-center gap-4 cursor-pointer group/header"
                    onClick={() => navigate(`/profile/${activeChat.otherUser.id}`)}
                  >
                     <button onClick={(e) => { e.stopPropagation(); setActiveChat(null); }} className="p-2 bg-brand-cream/50 rounded-xl text-gray-500 hover:text-brand-primary transition-all"><ArrowLeft size={18} /></button>
                     <div 
                       className="relative cursor-zoom-in"
                       onClick={(e) => {
                         e.stopPropagation();
                         setPreviewPhotoUrl(activeChat.otherUser.photo);
                         setShowPhotoPreview(true);
                       }}
                     >
                       <img src={activeChat.otherUser.photo} className="w-10 h-10 rounded-full object-cover group-hover/header:ring-2 ring-brand-accent transition-all ring-offset-2 ring-offset-white" alt="" />
                     </div>
                     <div>
                        <h2 className={`font-bold text-sm ${chatTheme === 'night' ? 'text-white' : 'text-brand-dark'}`}>{activeChat.otherUser.name}</h2>
                        <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                          {activeChat.status === 'accepted' ? (activeChat.otherUser.online ? 'Online now' : 'Connected') : 'Awaiting Response'}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 relative">
                     <button 
                       onClick={() => startCall('audio')}
                       className="hover:text-brand-primary transition-colors"
                     >
                       <Phone size={20} />
                     </button>
                     <button 
                       onClick={() => startCall('video')}
                       className="hover:text-brand-primary transition-colors"
                     >
                       <Video size={20} />
                     </button>

                     <button 
                        onClick={async () => {
                          if (!activeChat || !auth.currentUser) return;
                          const isStarred = activeChat.isStarred;
                          try {
                            await updateDoc(doc(db, 'matches', activeChat.id), {
                              isStarred: !isStarred,
                              updatedAt: serverTimestamp()
                            });
                            toast.success(isStarred ? "Removed from favorites" : "Added to favorites");
                          } catch (e) {
                            toast.error("Failed to update favorite status");
                          }
                        }}
                        className={`transition-colors ${activeChat?.isStarred ? 'text-brand-accent' : 'hover:text-brand-primary'}`}
                      >
                        <Star size={20} fill={activeChat?.isStarred ? 'currentColor' : 'none'} />
                      </button>
                     
                     {/* Theme Picker Trigger */}
                     <button 
                       onClick={() => setShowThemePicker(!showThemePicker)}
                       className={`hover:text-brand-primary transition-colors ${showThemePicker ? 'text-brand-primary' : ''}`}
                     >
                       <Palette size={20} />
                     </button>

                     {/* Three Dots Menu Trigger */}
                     <div className="relative">
                        <button 
                          onClick={() => setShowMenu(!showMenu)}
                          className={`hover:text-brand-primary transition-colors ${showMenu ? 'text-brand-primary' : ''}`}
                        >
                          <MoreVertical size={20} />
                        </button>
                        
                        <AnimatePresence>
                          {showMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-brand-primary/5 p-2 z-50 overflow-hidden"
                            >
                               <button 
                                 onClick={() => {
                                   navigate(`/profile/${activeChat.otherUser.id}`);
                                   setShowMenu(false);
                                 }}
                                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-brand-cream/50 rounded-xl transition-colors font-medium"
                               >
                                 <User size={16} className="text-brand-primary" /> Open Profile
                               </button>
                               <button 
                                 onClick={() => {
                                   setConfirmClearId(activeChat.id);
                                   setShowMenu(false);
                                 }}
                                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-brand-cream/50 rounded-xl transition-colors font-medium"
                               >
                                 <Trash2 size={16} className="text-brand-primary" /> Clear Conversation
                               </button>
                               <button 
                                 onClick={() => {
                                   setConfirmDeleteId(activeChat.id);
                                   setShowMenu(false);
                                 }}
                                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium border-t border-brand-primary/5 mt-1"
                               >
                                 <X size={16} /> Delete Conversation
                               </button>
                               <button 
                                 onClick={() => setShowMenu(false)}
                                 className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium border-t border-brand-primary/5 mt-1"
                               >
                                 <ShieldAlert size={16} /> Block User
                               </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  </div>

                  {/* Theme Picker Dropdown */}
                  <AnimatePresence>
                    {showThemePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-6 top-20 w-48 bg-white rounded-2xl shadow-2xl border border-brand-primary/5 p-2 z-50"
                      >
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest p-2 mb-1">Chat Themes</p>
                         <div className="space-y-1">
                            {themes.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => updateTheme(t.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${chatTheme === t.id ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-brand-cream'}`}
                              >
                                 <div className={`w-5 h-5 rounded-full ${t.color} border border-brand-primary/10`} />
                                 <span className="text-xs font-semibold">{t.label}</span>
                              </button>
                            ))}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </header>

               <div 
                 ref={scrollRef} 
                 onClick={() => setDeletingMessageId(null)}
                 className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 transition-colors duration-500 bg-transparent relative"
               >
                  {/* Blank Screen Click Handler Overlay */}
                  {deletingMessageId && (
                    <div 
                      className="fixed inset-0 z-[5] bg-transparent" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingMessageId(null);
                      }}
                    />
                  )}
                  <div className="text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${chatTheme === 'night' ? 'bg-white/10 text-white/60' : 'bg-brand-accent/10 text-brand-accent'}`}>
                      Secure Connection Established
                    </span>
                  </div>
                  
                   {messages.map((m, i) => {
                    const isOwn = m.senderId === auth.currentUser?.uid;
                    const prevMsg = i > 0 ? messages[i-1] : null;
                    const showDateLabel = !prevMsg || getDayLabel(m.timestamp) !== getDayLabel(prevMsg.timestamp);

                    return (
                      <React.Fragment key={m.id}>
                        {showDateLabel && (
                          <div className="flex justify-center my-4">
                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${chatTheme === 'night' ? 'bg-white/5 text-white/40' : 'bg-gray-100/50 text-gray-400'}`}>
                              {getDayLabel(m.timestamp)}
                            </span>
                          </div>
                        )}
                        <div 
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-full`}
                        >
                          <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''} relative group`}>
                             {!isOwn && (
                               <div 
                                 className="relative cursor-zoom-in"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setPreviewPhotoUrl(activeChat.otherUser.photo);
                                   setShowPhotoPreview(true);
                                 }}
                               >
                                 <img src={activeChat.otherUser.photo} className="w-8 h-8 rounded-full self-end mb-2 border border-brand-primary/10 hover:opacity-80 transition-opacity" alt="" />
                               </div>
                             )}
                             <div className="flex flex-col gap-1">
                               <div 
                                 onClick={() => setDeletingMessageId(deletingMessageId === m.id ? null : m.id)}
                                 className={`p-4 rounded-[1.5rem] shadow-sm text-sm leading-relaxed cursor-pointer relative group/bubble ${
                                 isOwn 
                                   ? 'bg-brand-primary text-white rounded-br-none font-medium' 
                                   : `${chatTheme === 'night' ? 'bg-white/10 text-white border-white/5' : 'bg-white text-gray-700 border-brand-primary/5'} rounded-bl-none font-light border`
                               }`}>
                                   <AnimatePresence>
                                     {deletingMessageId === m.id && (
                                       <motion.div 
                                         initial={{ opacity: 0, scale: 0.9 }}
                                         animate={{ opacity: 1, scale: 1 }}
                                         exit={{ opacity: 0, scale: 0.9 }}
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setDeletingMessageId(null);
                                         }}
                                         className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-inherit flex items-center justify-center z-10"
                                       >
                                         <button 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             deleteMessage(m.id);
                                           }}
                                           className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg"
                                         >
                                           Delete
                                         </button>
                                       </motion.div>
                                     )}
                                   </AnimatePresence>
                                    {/* Hover Delete Indicator - Now for all messages */}
                                    {!deletingMessageId && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingMessageId(m.id);
                                        }}
                                        className={`absolute top-0 ${isOwn ? '-left-10' : '-right-10'} opacity-0 group-hover/bubble:opacity-100 transition-opacity p-2 hover:text-red-500 rounded-lg hover:bg-red-50`}
                                      >
                                         <Trash2 size={16} />
                                      </button>
                                    )}
                                   {m.type === 'voice' ? (
                                  <div className="flex flex-col gap-2 min-w-[220px]">
                                    <div className="flex items-center gap-3 bg-black/5 rounded-2xl p-2 border border-black/5">
                                      <button 
                                        onClick={(e) => {
                                          const audio = e.currentTarget.nextElementSibling as HTMLAudioElement;
                                          if (audio.paused) audio.play();
                                          else audio.pause();
                                        }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isOwn ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'} hover:scale-105 active:scale-95`}
                                      >
                                        <Mic size={20} />
                                      </button>
                                      <audio 
                                        src={m.audioData} 
                                        className="hidden"
                                        onPlay={(e) => e.currentTarget.parentElement?.firstElementChild?.classList.add('animate-pulse')}
                                        onPause={(e) => e.currentTarget.parentElement?.firstElementChild?.classList.remove('animate-pulse')}
                                        onEnded={(e) => e.currentTarget.parentElement?.firstElementChild?.classList.remove('animate-pulse')}
                                      />
                                      <div className="flex-1 flex flex-col">
                                        <div className="h-1 bg-current opacity-20 rounded-full overflow-hidden">
                                          <motion.div 
                                            className="h-full bg-current"
                                            animate={{ width: ['0%', '100%'] }}
                                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                          />
                                        </div>
                                        <p className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${isOwn ? 'text-white/80' : 'text-brand-primary/80'}`}>
                                          Voice Message • Tap to Play
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  m.content
                                )}
                             </div>
                             <span className={`text-[9px] font-medium uppercase tracking-tighter px-1 ${chatTheme === 'night' ? 'text-white/40' : 'text-gray-400'}`}>
                               {formatTime(m.timestamp)}
                             </span>
                           </div>
                        </div>
                      </div>
                    </React.Fragment>
                    )
                  })}
               </div>

                <div className={`p-6 border-t border-white/10 transition-colors ${chatTheme === 'night' ? 'bg-gray-950/50 backdrop-blur-3xl' : 'bg-white/30 backdrop-blur-md'}`}>
                  {isRecording && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 flex items-center justify-between bg-brand-accent/10 p-4 rounded-3xl border border-brand-accent/20 backdrop-blur-md shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                          <motion.div 
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} 
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                          />
                          <span className="text-[10px] font-black text-red-500 tracking-tighter">LIVE</span>
                        </div>
                        <span className="text-xs font-bold text-brand-dark tabular-nums tracking-widest">
                          {formatDuration(recordingTime)}
                        </span>
                        <div className="flex gap-0.5 items-center h-4 ml-2">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ height: ['40%', '100%', '40%'] }}
                              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                              className="w-0.5 bg-brand-primary rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={cancelRecording}
                          className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={retakeRecording}
                          className="text-[10px] font-black uppercase tracking-widest text-brand-dark hover:text-brand-primary transition-colors border-x border-brand-dark/10 px-4"
                        >
                          Retake
                        </button>
                        <button 
                          onClick={stopRecording}
                          className="text-[10px] font-black uppercase tracking-widest text-white bg-brand-primary px-4 py-1.5 rounded-full hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/20"
                        >
                          Stop & Send
                        </button>
                      </div>
                    </motion.div>
                  )}
                  <form onSubmit={sendMessage} className={`flex gap-4 items-center rounded-2xl p-2 pr-4 transition-all shadow-sm ${chatTheme === 'night' ? 'bg-white/5 border border-white/10' : 'bg-white/60 backdrop-blur-sm border border-brand-primary/5 shadow-brand-primary/5'}`}>
                      <div className="flex items-center">
                         <button 
                           type="button" 
                           onClick={async () => {
                             if (!activeChat || !auth.currentUser) return;
                             try {
                               const matchRef = doc(db, 'matches', activeChat.id);
                               await addDoc(collection(db, `matches/${activeChat.id}/messages`), {
                                 matchId: activeChat.id,
                                 senderId: auth.currentUser.uid,
                                 receiverId: activeChat.otherUser.id,
                                 type: 'text',
                                 content: '❤️',
                                 timestamp: serverTimestamp(),
                               });
                               await updateDoc(matchRef, {
                                 lastMessageType: 'text',
                                 lastMessageContent: '❤️',
                                 lastMessageSenderId: auth.currentUser.uid,
                                 updatedAt: serverTimestamp()
                               });
                               // Pop sound
                               const pop = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                               pop.play().catch(() => {});
                             } catch (e) {}
                           }}
                           className={`p-3 transition-all hover:scale-125 active:scale-90 ${chatTheme === 'night' ? 'text-white/40 hover:text-brand-primary' : 'text-brand-primary'}`}
                         >
                          <motion.div
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                          >
                            <Heart size={20} fill={chatTheme === 'night' ? 'transparent' : 'currentColor'} />
                          </motion.div>
                        </button>
                        <button 
                         type="button" 
                         onClick={isRecording ? stopRecording : startRecording}
                         title={isRecording ? "Stop & Send" : "Voice Message"}
                         className={`p-3 rounded-full transition-all flex items-center justify-center ${isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-110' : (chatTheme === 'night' ? 'text-white/40 hover:text-brand-primary' : 'text-brand-primary hover:bg-brand-cream')}`}
                       >
                         {isRecording ? <Send size={20} className="animate-pulse" /> : <Mic size={20} />}
                       </button>
                     </div>
                     <input 
                       type="text" 
                       value={msg}
                       onChange={(e) => setMsg(e.target.value)}
                       disabled={isRecording}
                       placeholder={isRecording ? "Recording voice note..." : "Type a message..."} 
                       className={`flex-1 bg-transparent border-none focus:ring-0 text-sm italic font-light ${chatTheme === 'night' ? 'text-white placeholder:text-white/20' : 'text-brand-dark'} ${isRecording ? 'opacity-50' : ''}`}
                     />
                     <button type="submit" disabled={isRecording} className="p-3 bg-brand-accent text-white rounded-xl shadow-lg shadow-brand-accent/20 hover:scale-110 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100"><Send size={18} /></button>
                  </form>
                  {sendError && (
                    <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-2 px-2 text-center">
                       {sendError.includes('permission-denied') ? 'Security Violation: Cannot send' : sendError}
                    </p>
                  )}
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
               <div className="w-24 h-24 bg-brand-cream/50 rounded-full flex items-center justify-center mb-6">
                 <MessageCircle className="text-brand-accent" size={48} />
               </div>
               <h2 className="serif text-2xl font-bold text-brand-dark mb-2">Select a Conversation</h2>
               <p className="text-sm font-light italic">Your shared values and future goals start with a simple Salaam.</p>
             </div>
           )}
                 {/* Confirmation Modals */}
      <AnimatePresence>
        {(confirmDeleteId || confirmClearId) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => { setConfirmDeleteId(null); setConfirmClearId(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-brand-primary/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                {confirmDeleteId ? <Trash2 className="text-red-500" size={32} /> : <MessageCircle className="text-brand-primary" size={32} />}
              </div>
              <h3 className="serif text-2xl font-bold text-center text-brand-dark mb-4">
                {confirmDeleteId ? 'Delete Conversation?' : 'Clear Chat?'}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-8 italic font-light">
                {confirmDeleteId 
                  ? 'This will permanently remove all messages and the match. You won\'t be able to undo this.' 
                  : 'This will remove all messages but keep the match. Your message history will be gone.'}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (confirmDeleteId) deleteConversation(confirmDeleteId);
                    if (confirmClearId) clearChat(confirmClearId);
                  }}
                  className={`w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest text-white transition-all shadow-lg ${confirmDeleteId ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-brand-primary hover:bg-brand-primary/90 shadow-brand-primary/20'}`}
                >
                  {confirmDeleteId ? 'Delete Forever' : 'Clear History'}
                </button>
                <button
                  onClick={() => { setConfirmDeleteId(null); setConfirmClearId(null); }}
                  className="w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
