import React from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, Lock, UserCheck, AlertTriangle, CheckCircle, Smartphone, Camera } from 'lucide-react';

export default function Safety() {
  const safetyTips = [
    {
      icon: <UserCheck className="text-brand-primary" />,
      title: "Verified Profiles",
      desc: "Look for the gold checkmark. It means the profile has been manually reviewed by our team."
    },
    {
      icon: <Eye className="text-brand-accent" />,
      title: "Private Communication",
      desc: "Use our in-app calling and messaging. Never share your phone number until you feel safe."
    },
    {
      icon: <Lock className="text-brand-primary" />,
      title: "Encrypted Data",
      desc: "Your personal details and photos are protected with advanced end-to-end encryption."
    },
    {
      icon: <Smartphone className="text-brand-accent" />,
      title: "Photo Privacy",
      desc: "You control who sees your photos. Use the blur feature or share only with matches."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative py-32 bg-brand-dark text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-brand-primary opacity-[0.05] blur-[150px] -translate-y-1/2 translate-x-1/2" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Shield className="text-brand-accent mx-auto mb-10 w-20 h-20" />
            <span className="text-brand-accent font-black tracking-[0.6em] text-[10px] uppercase mb-6 block">Our Sanctuary Promise</span>
            <h1 className="serif text-5xl md:text-7xl font-bold mb-10 leading-tight">
              Safety First. <br /> <span className="script text-white font-normal capitalize">Always.</span>
            </h1>
            <p className="text-xl font-light text-white/50 max-w-3xl mx-auto leading-relaxed italic">
              Your security is our highest priority. We use advanced technology and manual curation to ensure a safe matchmaking environment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Safety Guidelines */}
      <section className="py-24 bg-brand-cream">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {safetyTips.map((tip, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[3rem] border border-brand-primary/5 shadow-xl shadow-brand-primary/5 hover:shadow-brand-accent/10 transition-all text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-8">
                  {tip.icon}
                </div>
                <h3 className="serif text-2xl font-bold text-brand-dark mb-4">{tip.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed italic">{tip.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reporting Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div>
              <h2 className="serif text-5xl font-bold text-brand-dark mb-8">Your Vigilance Matters</h2>
              <p className="text-gray-500 font-light text-lg leading-relaxed mb-8">
                If you encounter any profile that seems suspicious or behavior that is disrespectful, please report it immediately. Our team investigates every report within 24 hours.
              </p>
            </div>
            <div className="space-y-6">
               {[
                 "Reporting is 100% Anonymous",
                 "Instant Profile Blocking",
                 "24/7 Human Moderation Team",
                 "Strict Terms of Service Enforcement"
               ].map((text, i) => (
                 <div key={i} className="flex items-center gap-4 text-brand-dark font-bold text-[10px] uppercase tracking-widest">
                    <CheckCircle className="text-green-500" size={18} />
                    {text}
                 </div>
               ))}
            </div>
          </div>
          <div className="bg-brand-dark rounded-[4rem] p-12 text-white relative overflow-hidden group">
             <div className="absolute inset-0 bg-brand-primary opacity-0 group-hover:opacity-10 transition-opacity" />
             <AlertTriangle className="text-brand-accent mb-8 w-12 h-12" />
             <h3 className="serif text-3xl font-bold mb-6">How to Report</h3>
             <ul className="space-y-6 text-white/60 font-light text-sm italic">
                <li>1. Go to the profile or message box of the user.</li>
                <li>2. Click the 'Report' button in the settings menu.</li>
                <li>3. Select a reason and provide details.</li>
                <li>4. We'll handle the rest and keep you updated.</li>
             </ul>
          </div>
        </div>
      </section>

      {/* Trust Badge Section */}
      <section className="py-32 bg-brand-cream border-t border-brand-primary/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
           <Camera className="text-brand-primary mx-auto mb-10 w-16 h-16 opacity-20" />
           <h2 className="serif text-4xl font-bold text-brand-dark mb-10">Verified Experience</h2>
           <p className="text-gray-500 font-light italic leading-relaxed mb-12">
             NikaahConnect is committed to providing a sanctuary where everyone is here for the right reasons. We strictly prohibit commercial activity, fake accounts, and harassment.
           </p>
           <div className="inline-block px-10 py-4 bg-brand-primary text-white font-black text-[10px] uppercase tracking-[0.5em] rounded-full shadow-2xl">
              Nikaah Sanctuary Protected
           </div>
        </div>
      </section>
    </div>
  );
}
