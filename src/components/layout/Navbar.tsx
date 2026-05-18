import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Heart, Search, MessageSquare, User, Home, Bell, LogIn, Eye, Phone, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface NavbarProps {
  user?: any;
  profile?: any;
}

export default function Navbar({ user, profile }: NavbarProps) {
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotificationCount(0);
      return;
    }

    // Listen for visitors count (using views as a proxy for new alerts for now)
    const qViews = query(
      collection(db, 'views'),
      where('viewedId', '==', user.uid)
    );

    const unsubViews = onSnapshot(qViews, (snapshot) => {
      setNotificationCount(snapshot.size);
    }, (error) => {
      console.error("Navbar Views subscription error:", error);
    });

    return () => unsubViews();
  }, [user]);

  const links = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    ...(user ? [
      { to: '/discover', icon: <Search size={20} />, label: 'Discover' },
      { to: '/matches', icon: <Heart size={20} />, label: 'Matches' },
      { to: '/messages', icon: <MessageSquare size={20} />, label: 'Messages' },
      { to: '/calls', icon: <Phone size={20} />, label: 'Calls' },
      { to: '/subscribe', icon: <Sparkles size={20} className="text-brand-accent animate-pulse" />, label: 'Premium' },
      { to: '/dashboard', icon: <User size={20} />, label: 'Profile' },
    ] : [
      { to: '/login', icon: <LogIn size={20} />, label: 'Log In' },
    ])
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-brand-cream/80 backdrop-blur-2xl border-t md:border-t-0 md:border-b border-brand-primary/10 z-50 px-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-20">
        <NavLink to="/" className="hidden md:flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="p-2.5 bg-brand-primary rounded-2xl shadow-xl shadow-brand-primary/20 border border-brand-accent/30 relative group">
            <Heart className="text-white fill-white group-hover:scale-110 transition-transform" size={22} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full border-2 border-brand-cream" />
          </div>
          <div className="flex flex-col">
            <span className="serif text-2xl font-black tracking-tighter text-brand-dark uppercase italic leading-none">Nikaah<span className="script text-brand-primary not-italic font-normal ml-1 capitalize text-3xl">Connect</span></span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-brand-accent mt-0.5 leading-none">Premium Matrimonials</span>
          </div>
        </NavLink>
        
        <div className="flex w-full md:w-auto justify-around md:justify-end items-center gap-1 md:gap-8">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors ${
                  isActive ? 'text-brand-primary' : 'text-brand-dark/40 hover:text-brand-primary'
                }`
              }
            >
              <motion.div 
                whileHover={{ scale: 1.1, color: '#8B1A1A' }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center"
              >
                {link.icon}
              </motion.div>
              <span className="hidden sm:inline">{link.label}</span>
            </NavLink>
          ))}
          
          {user && (
            <div className="relative ml-2">
              <button 
                onClick={() => setShowAlerts(!showAlerts)}
                className={`p-2 rounded-xl transition-all relative ${showAlerts ? 'text-brand-primary bg-brand-primary/5' : 'text-brand-dark/40 hover:text-brand-primary'}`}
              >
                <Bell size={22} />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-primary rounded-full border-2 border-brand-cream animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showAlerts && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-72 bg-brand-cream rounded-3xl shadow-2xl shadow-brand-dark/10 border border-brand-primary/5 z-[60] overflow-hidden"
                  >
                    <div className="p-5 border-b border-brand-primary/5 flex justify-between items-center bg-white/50 backdrop-blur-md">
                       <h4 className="font-black uppercase tracking-widest text-brand-dark text-[10px]">Sanctuary Alerts</h4>
                       <span className="text-[9px] font-bold text-white bg-brand-primary px-2 py-0.5 rounded-full">Recent</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                       {notificationCount === 0 ? (
                         <div className="p-8 text-center text-brand-dark">
                            <Bell className="mx-auto text-brand-primary/10 mb-3" size={24} />
                            <p className="text-[10px] text-brand-dark/40 italic">Quiet in the sanctuary.</p>
                         </div>
                       ) : (
                         <div className="px-2 py-2">
                            <div className="p-3 flex gap-3 hover:bg-brand-primary/5 rounded-2xl transition-colors cursor-pointer" onClick={() => navigate('/dashboard')}>
                               <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                                  <Eye size={16} />
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-brand-dark">Profile Interest</p>
                                  <p className="text-[10px] text-brand-dark/40 leading-tight">You have {notificationCount} new visits.</p>
                                </div>
                            </div>
                         </div>
                       )}
                    </div>
                    <div className="p-3 bg-brand-primary/5 text-center">
                       <button 
                        onClick={() => {
                          setShowAlerts(false);
                          navigate('/dashboard');
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-brand-accent hover:text-brand-primary transition-colors"
                       >
                        Go to Dashboard
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
