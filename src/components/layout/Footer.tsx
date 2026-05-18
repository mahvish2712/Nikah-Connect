import React from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Instagram, Facebook, Twitter, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white pt-24 pb-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1 md:col-span-1 border-b md:border-b-0 border-white/5 pb-10 md:pb-0">
            <NavLink to="/" className="flex items-center gap-3 mb-8 group">
              <div className="p-2 bg-brand-primary rounded-xl shadow-lg border border-brand-accent/20 transition-transform group-hover:scale-110">
                <Heart className="text-white fill-white" size={24} />
              </div>
              <span className="serif text-2xl font-bold tracking-tight text-white uppercase italic">Nikaah<span className="script text-brand-primary not-italic font-normal ml-2 capitalize text-3xl">Connect</span></span>
            </NavLink>
            <p className="text-white/40 font-light text-sm italic mb-8 leading-relaxed">
              A sovereign sanctuary where faith meet destiny. Dedicated to the pursuit of blessed unions and eternal connections.
            </p>
            <div className="flex gap-4">
               {[Instagram, Facebook, Twitter].map((Icon, i) => (
                 <a key={i} href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-brand-accent hover:border-brand-accent transition-all">
                   <Icon size={18} />
                 </a>
               ))}
            </div>
          </div>

          <div className="space-y-8">
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-brand-accent">Company</h4>
            <ul className="space-y-4">
              <li><NavLink to="/about" className="text-white/60 hover:text-white transition-colors text-[13px] font-medium italic">Our Story</NavLink></li>
              <li><NavLink to="/safety" className="text-white/60 hover:text-white transition-colors text-[13px] font-medium italic">Sanctuary Safety</NavLink></li>
              <li><NavLink to="/subscribe" className="text-white/60 hover:text-white transition-colors text-[13px] font-medium italic">Premium Membership</NavLink></li>
            </ul>
          </div>

          <div className="space-y-8">
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-brand-accent">Guidance</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-[13px] font-medium italic">Islamic Guidance</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-[13px] font-medium italic">Safety Guidelines</a></li>
              <li><a href="#" className="text-white/60 hover:text-white transition-colors text-[13px] font-medium italic">Halal Dating Tips</a></li>
            </ul>
          </div>

          <div className="space-y-8">
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-brand-accent">Stay Connected</h4>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
               <Mail size={18} className="text-brand-accent shrink-0" />
               <input 
                 type="email" 
                 placeholder="Join the newsletter" 
                 className="bg-transparent text-xs w-full focus:outline-none placeholder:text-white/20 italic"
               />
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
               <ShieldCheck size={18} className="text-brand-accent shrink-0" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Verified Secure Environment</span>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div>
             <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.6em] mb-2 font-mono">
               &copy; {new Date().getFullYear()} NikaahConnect. All Rights Reserved.
             </p>
             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-accent">
               Sanctuary Crafted by <span className="text-white">MAHVISH</span> & <span className="text-white">JAVED MASOOD</span>
             </p>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-brand-accent transition-colors">Privacy Policy</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-brand-accent transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
