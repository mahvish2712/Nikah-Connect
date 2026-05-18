import React from 'react';
import { motion } from 'motion/react';
import { Heart, Shield, Users, Globe, Target, Sparkles, Handshake } from 'lucide-react';

export default function About() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-32 bg-brand-cream overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-brand-primary rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-accent rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-brand-primary font-black tracking-[0.6em] text-[10px] uppercase mb-6 block">The Legacy</span>
            <h1 className="serif text-5xl md:text-7xl font-bold text-brand-dark mb-10 leading-tight">
              Where Faith Meets <br /> <span className="script text-brand-accent font-normal capitalize">Destiny</span>
            </h1>
            <p className="text-xl md:text-2xl font-light text-brand-dark/60 max-w-3xl mx-auto leading-relaxed italic">
              NikaahConnect was founded on the belief that finding your life partner should be a dignified, spiritual, and beautiful journey.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-20 items-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-brand-primary/5 rounded-[3rem] blur-2xl group-hover:bg-brand-primary/10 transition-all" />
            <img 
              src="https://images.unsplash.com/photo-1522673607200-16488354495f?q=80&w=800&auto=format&fit=crop" 
              alt="Artistic Islamic Architecture" 
              className="relative z-10 w-full h-[500px] object-cover rounded-[3rem] shadow-2xl transition-transform duration-1000 group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-12">
            <div>
              <h2 className="serif text-4xl md:text-5xl font-bold text-brand-dark mb-8">Our Mission</h2>
              <p className="text-gray-500 font-light text-lg leading-relaxed">
                To create a safe and respectful space for Muslims globally to find companions who share their values, traditions, and faith. We prioritize quality over quantity, and meaningful connection over superficial interactions.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10">
               <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/5 flex items-center justify-center text-brand-primary">
                    <Shield size={24} />
                  </div>
                  <h4 className="font-bold text-brand-dark">Integrity</h4>
                  <p className="text-xs text-gray-400">Honesty and transparency in every interaction.</p>
               </div>
               <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-brand-accent/5 flex items-center justify-center text-brand-accent">
                    <Heart size={24} />
                  </div>
                  <h4 className="font-bold text-brand-dark">Compassion</h4>
                  <p className="text-xs text-gray-400">Empathy-led design for sensitive journeys.</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-32 bg-brand-cream relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="serif text-5xl font-bold text-brand-dark mb-6">Our Core Pillars</h2>
            <div className="w-20 h-1 bg-brand-accent mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: <Target className="text-brand-primary" />, title: "Precision", desc: "Advanced algorithmic matching guided by ethical values." },
              { icon: <Globe className="text-brand-accent" />, title: "Global Reach", desc: "Connecting souls across borders while maintaining local traditions." },
              { icon: <Handshake className="text-brand-primary" />, title: "Community", desc: "A curated circle committed to serious, meaningful search." },
              { icon: <Sparkles className="text-brand-accent" />, title: "Excellence", desc: "Premium technology meeting timeless matrimonial standards." },
            ].map((pillar, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] border border-brand-primary/5 shadow-xl shadow-brand-primary/5 text-center group transition-all"
              >
                <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mx-auto mb-8 group-hover:bg-brand-primary group-hover:text-white transition-all">
                  {pillar.icon}
                </div>
                <h3 className="serif text-2xl font-bold text-brand-dark mb-4">{pillar.title}</h3>
                <p className="text-xs text-gray-500 font-light leading-relaxed">{pillar.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders Section - Branding specific to the users */}
      <section className="py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-brand-primary font-black tracking-[0.4em] text-[10px] uppercase mb-8 block">The Visionaries</span>
          <h2 className="serif text-5xl font-bold text-brand-dark mb-12">Behind NikaahConnect</h2>
          <div className="flex flex-col md:flex-row justify-center gap-16 md:gap-32">
             <div className="space-y-6">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-brand-primary/10 mx-auto shadow-2xl">
                   <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400" alt="Founder 1" className="w-full h-full object-cover" />
                </div>
                <div>
                   <h4 className="font-bold text-brand-dark text-xl">Mahvish Siddiqui</h4>
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Founder & Design Lead</p>
                </div>
             </div>
             <div className="space-y-6">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-brand-accent/10 mx-auto shadow-2xl">
                   <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400" alt="Founder 2" className="w-full h-full object-cover" />
                </div>
                <div>
                   <h4 className="font-bold text-brand-dark text-xl">Javed Masood</h4>
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Co-Founder & Product Strategist</p>
                </div>
             </div>
          </div>
          <p className="mt-20 text-gray-500 font-light italic leading-relaxed max-w-2xl mx-auto">
            "We built NikaahConnect because we wanted to see a platform that treats matrimonial search with the elegance and sacredness it deserves."
          </p>
        </div>
      </section>

      {/* Footer is added in App.tsx globally or specifically here if needed */}
    </div>
  );
}
