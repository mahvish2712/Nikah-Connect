import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, Mic, MicOff, VideoOff, Maximize2, User, Heart, X } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, setDoc, orderBy, limit, addDoc, or, and, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface CallData {
  id: string;
  matchId: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'missed';
  createdAt: any;
  acceptedAt?: any;
  endedAt?: any;
  duration?: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

export default function CallOverlay() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<CallData | null>(null);
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [peerProfile, setPeerProfile] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const servers = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // Refs for checking current state inside the snapshot listener without re-triggering effect
  const activeCallRef = useRef<CallData | null>(null);
  const incomingCallRef = useRef<CallData | null>(null);
  const outgoingCallRef = useRef<CallData | null>(null);

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  useEffect(() => { outgoingCallRef.current = outgoingCall; }, [outgoingCall]);

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      console.log("DEBUG CallOverlay: Auth changed, user:", user?.uid);
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // refs for streams to keep them across renders without state trigger overhead
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // 1. Listen for calls (Incoming & Outgoing)
  useEffect(() => {
    if (!currentUser) return;

    console.log("DEBUG CallOverlay: Starting signaling listener for", currentUser.uid);
    
    // Cleanup stale calls on mount for this user
    const cleanupStale = async () => {
      try {
        const staleQ = query(
          collection(db, 'calls'),
          and(
            where('status', '==', 'pending'),
            or(
              where('callerId', '==', currentUser.uid),
              where('receiverId', '==', currentUser.uid)
            )
          )
        );
        const snap = await getDocs(query(staleQ, limit(20)));
        const now = Date.now();
        const staleDocs = snap.docs.filter(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt?.seconds * 1000 || now);
          return (now - createdAt) > 120000; // Older than 2 minutes
        });

        if (staleDocs.length > 0) {
          console.log(`DEBUG CallOverlay: Cleaning up ${staleDocs.length} stale calls`);
          for (const sDoc of staleDocs) {
            await updateDoc(sDoc.ref, { 
              status: 'cancelled', 
              endedAt: serverTimestamp(),
              reason: 'stale_on_mount'
            });
          }
        }
      } catch (e) {
        console.error("DEBUG CallOverlay: Stale cleanup failed", e);
      }
    };
    cleanupStale();

    // Use a specific query that complies with security rules and filters current user's calls
    const q = query(
      collection(db, 'calls'),
      and(
        where('status', '==', 'pending'),
        or(
          where('callerId', '==', currentUser.uid),
          where('receiverId', '==', currentUser.uid)
        )
      ),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Filter in memory for extra safety, though the query is already specific
      const relevantCalls = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as CallData))
        .filter(c => c.receiverId === currentUser.uid || c.callerId === currentUser.uid);

      if (relevantCalls.length === 0) {
        // Only clear if we are not in an active session and no pending signals
        const isIdle = !activeCallRef.current && !activeCall && !incomingCallRef.current && !outgoingCallRef.current;
        if (isIdle) {
          console.log("DEBUG CallOverlay: Completely idle, clearing signals and profile");
          stopRingtone();
          setIncomingCall(null);
          setOutgoingCall(null);
          setPeerProfile(null);
          toast.dismiss('call-toast');
        }
        return;
      }

      // Priority: Newest relevant call
      const call = relevantCalls[0];
      const now = Date.now();
      const callTime = call.createdAt?.toMillis ? call.createdAt.toMillis() : (call.createdAt?.seconds * 1000 || now);
      const isStale = (now - callTime) > 60000; // Older than 1 minute is stale for real-time response

      if (isStale) {
        console.log("DEBUG CallOverlay: Ignoring stale call", call.id);
        return;
      }

      // CASE: INCOMING CALL
      if (call.receiverId === currentUser.uid && !activeCallRef.current) {
        if (!incomingCallRef.current || incomingCallRef.current.id !== call.id) {
          console.log("DEBUG CallOverlay: INCOMING CALL DETECTED:", call.id);
          setIncomingCall(call);
          setOutgoingCall(null);
          
          // Fetch profile first to ensure name is available for notification
          const profileSnap = await getDoc(doc(db, 'profiles', call.callerId));
          const profileData = profileSnap.exists() ? profileSnap.data() : null;
          setPeerProfile(profileData);
          
          showCallNotification(call, profileData);
          playRingtone();
        }
      } 
      // CASE: OUTGOING CALL (Initiated from another component by doc creation)
      else if (call.callerId === currentUser.uid && !activeCallRef.current) {
        if (!outgoingCallRef.current || outgoingCallRef.current.id !== call.id) {
          console.log("DEBUG CallOverlay: OUTGOING CALL DETECTED (I am the caller):", call.id);
          setOutgoingCall(call);
          setIncomingCall(null);
          
          const profileSnap = await getDoc(doc(db, 'profiles', call.receiverId));
          setPeerProfile(profileSnap.exists() ? profileSnap.data() : null);
          
          // Caller starts generating the offer immediately
          initiateCallerWebRTC(call);
        }
      }
    }, (error) => {
      console.error("DEBUG CallOverlay: Global signaling listener error", error);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  // Effect to ensure current user has a minimal profile and listen to it
  useEffect(() => {
    if (!currentUser) return;
    
    // Subscribe to own profile for local UI consistency
    const profileRef = doc(db, 'profiles', currentUser.uid);
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
       if (snap.exists()) {
          setMyProfile(snap.data());
       } else {
          // One-time creation if missing
          console.log("DEBUG CallOverlay: Auto-creating profile for current user:", currentUser.uid);
          await setDoc(profileRef, {
            uid: currentUser.uid,
            name: currentUser.displayName || 'User',
            photoUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=c5a021&color=fff&size=512`,
            profileComplete: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
       }
    });

    return () => unsubProfile();
  }, [currentUser?.uid]);

  // Effect to sync video refs with streams
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeCall) {
        if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
          console.log("DEBUG CallOverlay: Syncing local stream to ref");
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        if (remoteVideoRef.current && remoteStreamRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          console.log("DEBUG CallOverlay: Syncing remote stream to ref");
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      }
    }, 500);
    return () => clearInterval(timer);
  }, [activeCall]);

  const fetchPeerProfile = (uid: string) => {
    try {
      console.log(`DEBUG CallOverlay: Subscribing to profile updates for UID: ${uid}`);
      // Use real-time listener for profile so photo updates reflect immediately
      const profileRef = doc(db, 'profiles', uid);
      
      const unsubscribe = onSnapshot(profileRef, async (snap) => {
        if (snap.exists()) {
          console.log(`DEBUG CallOverlay: Profile updated by ID for ${uid}`);
          setPeerProfile(snap.data());
        } else {
          // Fallback: Try by 'uid' field if doc ID doesn't match
          const q = query(collection(db, 'profiles'), where('uid', '==', uid), limit(1));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            console.log(`DEBUG CallOverlay: Profile found by field search for ${uid}`);
            setPeerProfile(qSnap.docs[0].data());
          } else {
            console.warn(`DEBUG CallOverlay: Profile not found for ${uid}`);
            setPeerProfile({
              name: 'Partner',
              photoUrl: `https://ui-avatars.com/api/?name=Partner&background=c5a021&color=fff&size=512`
            });
          }
        }
      });

      return unsubscribe;
    } catch (e) {
      console.error("Profile subscription error", e);
    }
  };

  const showCallNotification = (call: CallData, profile: any = null) => {
    const callerName = profile?.name || peerProfile?.name || 'Your Match';
    const callerPhoto = profile?.photoUrl || peerProfile?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2';
    
    toast.dismiss('call-toast');
    toast.info(`${callerName} is calling...`, {
      duration: 30000,
      id: 'call-toast',
      icon: <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-accent shadow-sm">
        <img src={callerPhoto} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
      </div>,
      action: {
        label: 'Answer',
        onClick: () => handleAccept()
      }
    });

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Incoming ${call.type === 'video' ? 'Video' : 'Audio'} Call`, {
        body: `${callerName} is calling you on NikaahConnect`,
        icon: callerPhoto,
        tag: 'incoming-call'
      });
    }
  };

  const playRingtone = () => {
    try {
      if (ringtoneRef.current) stopRingtone();
      ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(e => {
        console.warn("Autoplay blocked");
      });
    } catch (e) {}
  };

  const initiateCallerWebRTC = async (call: CallData) => {
    console.log("DEBUG CallOverlay: initiateCallerWebRTC starting for call:", call.id);
    try {
      if (pcRef.current) {
        console.log("DEBUG CallOverlay: Closing existing PeerConnection");
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      console.log("DEBUG CallOverlay: Requesting media permissions...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      });
      console.log("DEBUG CallOverlay: Media stream obtained");
      localStreamRef.current = stream;
      streamRef.current = stream;

      stream.getTracks().forEach(track => {
        console.log(`DEBUG CallOverlay: Adding local track to pc: ${track.kind}`);
        pc.addTrack(track, stream);
      });

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      pc.ontrack = (event) => {
        console.log(`DEBUG CallOverlay: Remote track received! Kind: ${event.track.kind}`);
        remoteStream.addTrack(event.track);
        
        // Force remote playback
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => {
            console.error("Playback error, trying fallback", e);
            remoteVideoRef.current?.play().catch(() => {});
          });
        }
      };

      const iceCol = collection(db, 'calls', call.id, 'iceCandidates');
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log("DEBUG CallOverlay: New local ICE candidate (caller)");
          addDoc(iceCol, { ...e.candidate.toJSON(), type: 'caller' });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log("DEBUG CallOverlay: Offer created and uploaded");
      await updateDoc(doc(db, 'calls', call.id), { 
        offer: { sdp: offer.sdp, type: offer.type } 
      });

      // Status monitoring is now handled by the unified useEffect

      // Listen for receiver ICE candidates
      onSnapshot(iceCol, (snap) => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.type === 'receiver') {
              const candidateData = { ...data };
              delete candidateData.type;
              pc.addIceCandidate(new RTCIceCandidate(candidateData as any)).catch(e => {});
            }
          }
        });
      });

    } catch (err: any) {
      console.error("DEBUG CallOverlay: Caller WebRTC Error:", err);
      toast.error("Call failed: " + (err.message || "Permissions denied"));
      handleEndCall();
    }
  };

  // 2. Monitoring current call status for synchronization
  useEffect(() => {
    // Collect the ID from any of our tracking states
    const id = activeCall?.id || incomingCall?.id || outgoingCall?.id;
    if (!id || !currentUser) {
      console.log("DEBUG CallOverlay: [Monitor] No active ID to monitor");
      return;
    }

    console.log("DEBUG CallOverlay: [Monitor] Subscribing to status for ID:", id);
    
    // We use document monitoring as the primary sync mechanism
    // This is the CRITICAL part for "cut from both ends"
    const unsubscribe = onSnapshot(doc(db, 'calls', id), (snapshot) => {
      if (!snapshot.exists()) {
        console.log("DEBUG CallOverlay: [Monitor] Call document deleted, closing session");
        endCallSession();
        return;
      }

      const data = snapshot.data() as CallData;
      console.log(`DEBUG CallOverlay: [Monitor] Status update for ${id}:`, data.status);
      
      // TERMINAL STATES: Exit session immediately on BOTH ends
      if (['completed', 'cancelled', 'rejected', 'missed'].includes(data.status)) {
        console.log("DEBUG CallOverlay: [Monitor] Termination detected via status for ID:", id);
        stopRingtone();
        endCallSession();
        return;
      }
      
      // CALLER SIDE TRANSITION: Pending -> Accepted
      if (outgoingCallRef.current && data.status === 'accepted' && data.answer) {
        const pc = pcRef.current;
        if (pc && pc.signalingState === 'have-local-offer') {
          console.log("DEBUG CallOverlay: [Monitor] Caller detected acceptance, signaling state is have-local-offer, finishing WebRTC Handshake");
          pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            .then(() => {
              console.log("DEBUG CallOverlay: [Monitor] Peer connection established on caller side");
              setActiveCall({ id, ...data } as CallData);
              setOutgoingCall(null);
              stopRingtone();
            })
            .catch(e => console.error("DEBUG CallOverlay: [Monitor] PeerConnection setRemoteDescription error", e));
        }
      }
    }, (err) => {
      console.error("DEBUG CallOverlay: [Monitor] Status snapshot error", err);
    });

    // FAIL-SAFE: If the snapshot listener somehow fails to trigger, check status periodically
    const failSafeInterval = setInterval(async () => {
      try {
        const snap = await getDoc(doc(db, 'calls', id));
        if (snap.exists()) {
          const data = snap.data() as CallData;
          if (['completed', 'cancelled', 'rejected', 'missed'].includes(data.status)) {
            console.log("DEBUG CallOverlay: [Fail-safe] Termination detected via periodic check");
            endCallSession();
          }
        }
      } catch (e) {}
    }, 5000);

    return () => {
      console.log("DEBUG CallOverlay: [Monitor] Cleanup - Unsubscribing from ID:", id);
      unsubscribe();
      clearInterval(failSafeInterval);
    };
  }, [activeCall?.id, incomingCall?.id, outgoingCall?.id, currentUser?.uid]);

  // 3. Global termination watchdog (Fail-safe for any missed updates)
  useEffect(() => {
    if (!currentUser) return;

    // This listener looks for ANY terminated call that might involve the user
    // ensuring no "stuck" UI remains even if the document listener fails.
    const q = query(
      collection(db, 'calls'),
      and(
        where('status', 'in', ['completed', 'cancelled', 'rejected', 'missed']),
        or(
          where('callerId', '==', currentUser.uid),
          where('receiverId', '==', currentUser.uid)
        )
      ),
      orderBy('endedAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const currentId = activeCallRef.current?.id || incomingCallRef.current?.id || outgoingCallRef.current?.id;
      if (!currentId) return;

      if (!snap.empty) {
        const latestTerminatedCall = snap.docs[0];
        // If the latest terminated call recorded in DB is the one we are currently showing, force termination locally.
        if (currentId === latestTerminatedCall.id) {
          console.log(`DEBUG CallOverlay: [Watchdog] Detected termination for current interaction: ${currentId}`);
          stopRingtone();
          endCallSession();
        }
      }
    }, (err) => {
      console.warn("DEBUG CallOverlay: [Watchdog] Query failed", err);
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  // 4. Profile recovery effect - ensures peerProfile is always available during active sessions
  useEffect(() => {
    let profileUnsub: any;

    if ((activeCall || incomingCall || outgoingCall) && !peerProfile && currentUser) {
      const call = activeCall || incomingCall || outgoingCall;
      if (!call) return;
      const peerId = call.callerId === currentUser.uid ? call.receiverId : call.callerId;
      console.log("DEBUG CallOverlay: [Recovery] Profile missing for active interaction, subscribing to UID:", peerId);
      profileUnsub = fetchPeerProfile(peerId);
    }

    return () => {
      if (profileUnsub) profileUnsub();
    };
  }, [activeCall?.id, incomingCall?.id, outgoingCall?.id, peerProfile === null, currentUser?.uid]);

  // 5. Call duration timer
  useEffect(() => {
    let interval: any;
    if (activeCall && activeCall.status === 'accepted') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  };

  const endCallSession = () => {
    console.log("DEBUG CallOverlay: endCallSession executing cleanup");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
        });
        streamRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
        });
        localStreamRef.current = null;
      }
      if (pcRef.current) {
        try { pcRef.current.close(); } catch(e) {}
        pcRef.current = null;
      }
      
      // Clear all call states
      setActiveCall(null);
      setIncomingCall(null);
      setOutgoingCall(null);
      setPeerProfile(null);
      setCallDuration(0);
      
      // Clear refs
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      setIsMuted(false);
      setIsVideoOff(false);
      setIsJoining(false);
      
      stopRingtone();
      toast.dismiss('call-toast');
      console.log("DEBUG CallOverlay: endCallSession cleanup complete");
    } catch (e) {
      console.error("DEBUG CallOverlay: Error during endCallSession cleanup", e);
    }
  };

  const handleAccept = async () => {
    const call = incomingCallRef.current || incomingCall;
    if (!call || isJoining || pcRef.current) return;
    
    setIsJoining(true);
    const callId = call.id;
    stopRingtone();
    toast.dismiss('call-toast');

    try {
      console.log("DEBUG CallOverlay: Accepting call", callId);
      const callDocRef = doc(db, 'calls', callId);
      let callSnap = await getDoc(callDocRef);
      let callData = callSnap.data() as CallData;
      
      // Check terminal status first
      if (['completed', 'cancelled', 'rejected', 'missed'].includes(callData?.status)) {
        console.log("DEBUG CallOverlay: Cannot accept terminated call");
        endCallSession();
        return;
      }

      if (!callData?.offer) {
        console.log("DEBUG CallOverlay: Offer pending, waiting for caller to upload...");
        callData = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => { 
            unsub(); 
            reject(new Error("Connecting timeout: Caller failed to send signal.")); 
          }, 15000);
          const unsub = onSnapshot(callDocRef, (snap) => {
            const data = snap.data() as CallData;
            if (data?.offer) { 
              clearTimeout(timeout); 
              unsub(); 
              resolve(data); 
            } else if (data?.status && ['cancelled', 'rejected', 'completed'].includes(data.status)) {
              clearTimeout(timeout);
              unsub();
              reject(new Error("Call terminated."));
            }
          });
        });
      }

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.type === 'video' ? { facingMode: 'user' } : false,
        audio: true
      });
      localStreamRef.current = stream;
      streamRef.current = stream;
      
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      pc.ontrack = (event) => {
        console.log(`DEBUG CallOverlay: Receiver got remote track: ${event.track.kind}`);
        remoteStream.addTrack(event.track);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => {
            console.error("Receiver Playback error", e);
            remoteVideoRef.current?.play().catch(() => {});
          });
        }
      };

      const iceCandidatesCollection = collection(db, 'calls', callId, 'iceCandidates');
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(iceCandidatesCollection, { ...event.candidate.toJSON(), type: 'receiver' });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer!));
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      await updateDoc(callDocRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        answer: { type: answerDescription.type, sdp: answerDescription.sdp }
      });

      // Listen for caller ICE candidates
      onSnapshot(iceCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.type === 'caller') {
              const candidateData = { ...data };
              delete candidateData.type;
              pc.addIceCandidate(new RTCIceCandidate(candidateData as any)).catch(e => {});
            }
          }
        });
      });

      setActiveCall({ ...callData, status: 'accepted' });
      setIncomingCall(null);
      setIsJoining(false);
    } catch (err: any) {
      console.error("DEBUG CallOverlay: Accept Error:", err);
      toast.error(err.message || "Failed to accept call");
      setIsJoining(false);
      handleDecline();
    }
  };

  const handleDecline = async () => {
    await handleEndCall();
  };

  const handleEndCall = async () => {
    // Collect ID carefully
    const id = activeCall?.id || incomingCall?.id || outgoingCall?.id || activeCallRef.current?.id || incomingCallRef.current?.id || outgoingCallRef.current?.id;
    
    if (!id || !currentUser) {
      console.log("DEBUG CallOverlay: No active ID to terminate locally, clearing session");
      endCallSession();
      return;
    }

    console.log("DEBUG CallOverlay: User triggered end call for:", id);
    // Be reactive: Clear UI immediately for caller to provide instant feedback
    if (!activeCallRef.current && (outgoingCallRef.current?.id === id || incomingCallRef.current?.id === id)) {
       console.log("DEBUG CallOverlay: Pre-emptive UI termination for pending call");
       endCallSession();
    }

    try {
      const docRef = doc(db, 'calls', id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data() as CallData;
        if (!['completed', 'cancelled', 'rejected', 'missed'].includes(data.status)) {
          // Logic: If already accepted, it was a 'completed' call.
          // If still pending, it's 'cancelled' by caller or 'rejected' by receiver.
          const isReceiver = data.receiverId === currentUser.uid;
          const statusToSet = data.status === 'accepted' ? 'completed' : (isReceiver ? 'rejected' : 'cancelled');
          
          console.log(`DEBUG CallOverlay: Syncing termination to DB for ${id} with status ${statusToSet}`);
          await updateDoc(docRef, {
            status: statusToSet,
            duration: callDuration,
            endedAt: serverTimestamp()
          });
          
          // Cleanup locally if not already done by pre-emptive logic
          endCallSession();
        } else {
           endCallSession();
        }
      } else {
        endCallSession();
      }
    } catch (err: any) {
      console.error("End call Firestore error:", err);
      endCallSession();
    }
  };

  // 5. Shared UI helpers
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <AnimatePresence>
        {/* Outgoing Call Overlay */}
        {outgoingCall && !activeCall && (
          <motion.div
            key="outgoing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[9999] bg-brand-dark flex flex-col items-center justify-center p-6 text-center overflow-hidden"
          >
            {/* Blurred Background */}
            <div className="absolute inset-0 z-0">
              <img 
                src={peerProfile?.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'} 
                className="w-full h-full object-cover blur-[80px] scale-110 opacity-30" 
                alt="" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-neutral-950/60" />
            </div>

            <div className="max-w-md w-full flex flex-col items-center relative z-10">
              <div className="relative mb-12">
                <motion.div 
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 -m-8 border-2 border-brand-accent/30 rounded-full"
                />
                <div className="relative">
                  <img 
                    src={peerProfile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerProfile?.name || 'Partner')}&background=c5a021&color=fff&size=512`} 
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-8 border-white/5 shadow-2xl" 
                    alt="" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-neutral-900 shadow-xl bg-neutral-800">
                    <img 
                      src={myProfile?.photoUrl || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=c5a021&color=fff&size=512`} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
              <h3 className="serif text-3xl font-bold text-white mb-4">Calling {peerProfile?.name || 'Partner'}...</h3>
              <p className="text-brand-accent font-black uppercase tracking-[0.4em] text-[10px] mb-16 animate-pulse">Establishing Secure Link</p>
              
              <button
                onClick={handleEndCall}
                className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all !shadow-none active:scale-95 !border-none !outline-none !ring-0 !ring-transparent overflow-hidden appearance-none"
              >
                <Phone size={32} className="rotate-[135deg]" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Incoming Call Overlay */}
        {incomingCall && !activeCall && (
          <motion.div
            key="incoming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-brand-dark flex flex-col items-center justify-center p-6 text-center overflow-hidden"
          >
            {/* Blurred Background */}
            <div className="absolute inset-0 z-0">
              <img 
                src={peerProfile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerProfile?.name || 'Partner')}&background=c5a021&color=fff&size=512`} 
                className="w-full h-full object-cover blur-[80px] scale-110 opacity-30" 
                alt="" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-neutral-950/60" />
            </div>

            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full flex flex-col items-center relative z-10"
            >
              <div className="relative mb-12">
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 -m-8 border-2 border-brand-accent rounded-full"
                />
                <div className="relative">
                  <img 
                    src={peerProfile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerProfile?.name || 'Partner')}&background=c5a021&color=fff&size=512`} 
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-8 border-white/10 shadow-[0_0_80px_rgba(197,160,33,0.3)]" 
                    alt="" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-neutral-900 shadow-xl bg-neutral-800">
                    <img 
                      src={myProfile?.photoUrl || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=c5a021&color=fff&size=512`} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
              
              <h3 className="serif text-4xl md:text-5xl font-bold text-white mb-4">{peerProfile?.name || 'Partner'}</h3>
              <p className="text-brand-accent font-black uppercase tracking-[0.5em] text-xs mb-16 animate-pulse">
                Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call...
              </p>

              <div className="flex w-full gap-8 max-w-sm">
                <button
                  onClick={handleDecline}
                  className="flex-1 text-red-500 flex flex-col items-center gap-3 p-8 rounded-[2.5rem] active:scale-95 group !border-0 !border-none !outline-none !ring-0 !ring-transparent !shadow-none appearance-none bg-transparent select-none"
                >
                  <div className="p-4 bg-red-500 text-white rounded-2xl group-hover:bg-red-600 transition-colors !border-0 !border-none !outline-none !ring-0 !shadow-none overflow-hidden">
                    <Phone size={28} className="rotate-[135deg]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Decline</span>
                </button>
                
                <button
                  onClick={handleAccept}
                  className="flex-1 text-green-500 flex flex-col items-center gap-3 p-8 rounded-[2.5rem] active:scale-95 group !border-0 !border-none !outline-none !ring-0 !ring-transparent !shadow-none appearance-none bg-transparent select-none"
                >
                  <div className="p-4 bg-green-500 text-white rounded-2xl group-hover:bg-green-600 transition-colors animate-bounce !border-0 !border-none !outline-none !ring-0 !shadow-none overflow-hidden">
                    {incomingCall.type === 'video' ? <Video size={28} /> : <Phone size={28} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Accept</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-Call Active Session */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="fixed inset-0 z-[400] bg-neutral-950 flex flex-col overflow-hidden"
          >
            {/* Blurred Background with actual partner image - provides visual change */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img 
                src={peerProfile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerProfile?.name || 'Partner')}&background=c5a021&color=fff&size=512`} 
                className="w-full h-full object-cover blur-[100px] scale-125 opacity-40 mix-blend-screen" 
                alt="" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-neutral-950" />
            </div>

            {/* Top Info bar */}
            <div className="w-full pt-12 pb-4 flex flex-col items-center justify-center z-40 text-center relative px-8">
              <h2 className="serif text-xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg uppercase tracking-wider">
                {peerProfile?.name || 'Call Session'}
              </h2>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-3xl px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <p className="text-white/90 font-black uppercase tracking-[0.2em] text-[9px]">
                  {formatDuration(callDuration)}
                </p>
              </div>
            </div>

            {/* Video PiP (Local) */}
            {activeCall.type === 'video' && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="absolute top-8 right-8 w-28 h-40 md:w-40 md:h-60 rounded-[2rem] overflow-hidden bg-black/40 border-2 border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.6)] z-50 group backdrop-blur-md"
              >
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-brand-dark/95 flex items-center justify-center">
                    <User size={40} className="text-white/10" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 py-3 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em]">You</span>
                </div>
              </motion.div>
            )}

            {/* Main Content Area - Remote Stream */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-2 min-h-0">
               {/* Remote video/audio element - visible for video, hidden but active for audio */}
               <motion.div 
                 initial={{ scale: 0.95, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 1.05, opacity: 0 }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
                 className={`w-full h-full p-4 ${activeCall.type === 'video' ? 'block' : 'hidden'}`}
               >
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-contain rounded-[3rem] shadow-2xl"
                  />
               </motion.div>

               {activeCall.type === 'audio' && (
                 <div className="relative flex flex-col items-center">
                   {/* Audio-only UI with the same video ref for playback */}
                   <video ref={(el) => { if (el && activeCall.type === 'audio') remoteVideoRef.current = el; }} autoPlay playsInline className="hidden" />
                   
                    <div className="w-44 h-44 md:w-64 md:h-64 rounded-full overflow-hidden border-[12px] border-white/5 shadow-[0_0_150px_rgba(34,197,94,0.3)] relative z-20 group">
                      <img 
                        src={peerProfile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerProfile?.name || 'Partner')}&background=c5a021&color=fff&size=512`} 
                        className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-[3000ms]" 
                        alt="" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/20 to-transparent mix-blend-overlay" />
                      
                      {/* Overlapping Self Photo */}
                      <div className="absolute -bottom-2 -right-2 w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-8 border-neutral-900 shadow-2xl z-30 bg-neutral-800">
                         <img 
                           src={myProfile?.photoUrl || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'You')}&background=c5a021&color=fff&size=512`} 
                           className="w-full h-full object-cover" 
                           alt="" 
                           referrerPolicy="no-referrer"
                         />
                      </div>

                     {/* Pulse effect for audio call */}
                     <motion.div 
                       animate={{ 
                         scale: [1, 1.4, 1], 
                         opacity: [0.2, 0.5, 0.2] 
                       }}
                       transition={{ duration: 2, repeat: Infinity }}
                       className="absolute inset-0 bg-brand-accent rounded-full -z-10 mix-blend-screen overflow-hidden"
                     />
                   </div>
                   <div className="mt-12 flex flex-col items-center gap-3">
                     <div className="flex items-center gap-4">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-brand-accent rounded-full" />
                        <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.1 }} className="w-1 bg-brand-accent rounded-full" />
                        <motion.div animate={{ height: [6, 16, 6] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 bg-brand-accent rounded-full" />
                        <p className="text-white text-2xl font-bold tracking-tight">{peerProfile?.name}</p>
                        <motion.div animate={{ height: [6, 16, 6] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 bg-brand-accent rounded-full" />
                        <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.1 }} className="w-1 bg-brand-accent rounded-full" />
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 bg-brand-accent rounded-full" />
                     </div>
                     <p className="text-brand-accent/60 text-[11px] font-black uppercase tracking-[0.6em]">Voice Call Connected</p>
                   </div>
                 </div>
               )}
               <p className="mt-12 text-white/20 text-[10px] font-black uppercase tracking-[0.6em]">End-to-End Encrypted</p>
            </div>

            {/* Controls */}
            <div className="relative z-50 pb-16 px-6 mt-auto">
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center justify-center gap-8 bg-white/5 backdrop-blur-3xl p-6 rounded-[3rem] !border-0 !outline-none !ring-0 select-none shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  {/* Microphone Toggle with Pulsating Effect */}
                  <div className="relative">
                    <AnimatePresence>
                      {!isMuted && (
                        <motion.div
                          key="pulse"
                          initial={{ scale: 1, opacity: 0.5 }}
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 bg-brand-accent/20 rounded-2xl"
                        />
                      )}
                    </AnimatePresence>
                    <button 
                      onClick={toggleMute}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all relative z-10 !border-0 !shadow-none !outline-none !ring-0 ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>
                  </div>
                  
                  {activeCall.type === 'video' && (
                    <button 
                      onClick={toggleVideo}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all !border-0 !shadow-none !outline-none !ring-0 ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                    >
                      {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                  )}
                  
                  <button 
                    onClick={handleEndCall}
                    className="w-20 h-16 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all active:scale-90 !border-0 !border-none !outline-none !ring-0 !ring-transparent !shadow-none appearance-none"
                    title="End Call"
                  >
                    <div className="flex items-center gap-2">
                       <Phone size={26} className="rotate-[135deg]" />
                       <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">End</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

