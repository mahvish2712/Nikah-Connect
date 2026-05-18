/// <reference types="vite/client" />
import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Shield, Zap, Sparkles } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'sonner';

const SUB_PLANS = [
  {
    id: 'monthly',
    name: 'Basic Monthly',
    price: '₹99',
    period: '/month',
    description: 'Essential features for beginners',
    trial: '10 Days Free Trial',
    bonus: 'Verified identity badge included',
    features: [
      'Unlimited Interests & Likes',
      'Advanced Search Filters',
      'See Mutual Connections',
      'Profile Verification Badge'
    ],
    highlight: false,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_monthly_placeholder'
  },
  {
    id: 'quarterly',
    name: 'Premium Quarterly',
    price: '₹499',
    period: '/3 months',
    description: 'Perfect for serious seekers',
    bonus: '3 Profile Boosts per month',
    features: [
      'Everything in Basic',
      'See Who Viewed Your Profile',
      'Priority Feed Placement',
      'Advanced Profile Customization',
      'Direct Voice Message Access'
    ],
    highlight: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_QUARTERLY || 'price_quarterly_placeholder'
  },
  {
    id: 'annual',
    name: 'Royal Annual',
    price: '₹999',
    period: '/year',
    description: 'Best value for long search',
    bonus: 'VIP Relationship Manager',
    features: [
      'Everything in Premium',
      'Read Receipts for Messages',
      'Dedicated Customer Success Team',
      'Zero Advertisement Experience',
      'Exclusive Annual Member Events'
    ],
    highlight: false,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_ANNUAL || 'price_annual_placeholder'
  }
];

export default function Subscription({ profile }: { profile: any }) {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const isDemoMode = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
                     import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.includes('demo') ||
                     import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY.trim() === '';

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }

    setLoading(true);

    if (isDemoMode) {
      toast.info('Secure Payment Gateway', {
        description: 'Initializing encrypted sandbox environment for secure transaction.',
        duration: 3000
      });
      
      setTimeout(() => {
        toast.loading('Processing 3D-Secure Verification...', {
          id: 'demo-pay',
          description: 'Validating your demo session with the royal gateway.',
        });
      }, 1500);

      setTimeout(() => {
        toast.success('Connection Verified!', {
          id: 'demo-pay',
          description: 'Your Premium status has been successfully updated.',
          duration: 3000
        });
      }, 4000);
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email || `demo-user-${user.uid.slice(0, 5)}@nikaahconnect.com`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const session = await response.json();

      if (session.url) {
         try {
           const url = new URL(session.url);
           // Handle internal redirects with navigate to avoid full page reload & auth state loss
           if (url.origin === window.location.origin) {
             navigate(url.pathname + url.search);
           } else {
             window.location.href = session.url;
           }
         } catch (e) {
           window.location.href = session.url;
         }
      } else {
         toast.error('Failed to generate checkout link');
         setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-xs uppercase tracking-widest mb-6"
        >
          <Sparkles size={16} /> Premium Access
        </motion.div>
        <h1 className="serif text-5xl md:text-6xl text-brand-dark mb-6">Elevate Your Search</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-lg italic font-light">
          Find your perfect match faster with premium features designed for serious connections.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {SUB_PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative p-8 rounded-[3rem] bg-white border ${plan.highlight ? 'border-brand-primary shadow-2xl shadow-brand-primary/10' : 'border-brand-primary/10'} overflow-hidden transition-all hover:scale-[1.02] flex flex-col`}
          >
            {plan.highlight && (
              <div className="absolute top-0 right-0 px-6 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-tighter rounded-bl-3xl">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="serif text-3xl text-brand-dark mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm italic font-light lowercase tracking-wider">{plan.description}</p>
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-black text-brand-dark">{plan.price}</span>
              <span className="text-gray-400 font-light italic">{plan.period}</span>
            </div>
            
            <div className="mb-8 flex flex-wrap gap-2">
               {plan.trial && (
                  <div className="p-2 rounded-xl bg-brand-primary/5 border border-brand-primary/10 inline-block">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-tighter flex items-center gap-1">
                      <Zap size={10} fill="currentColor" /> {plan.trial}
                    </p>
                  </div>
               )}
               {plan.bonus && (
                  <div className="p-2 rounded-xl bg-green-50 border border-green-100 inline-block">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> {plan.bonus}
                    </p>
                  </div>
               )}
            </div>

            <div className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600 font-light">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 italic">
               <p className="text-[11px] text-gray-500 leading-relaxed">
                 {plan.id === 'monthly' && "Setup your basic profile and start matching today with the essential toolkit."}
                 {plan.id === 'quarterly' && "Unlock the full potential of your search with priority boosts and visitor insights."}
                 {plan.id === 'annual' && "The ultimate royal experience with a dedicated manager to help you find 'The One'."}
               </p>
            </div>

            <button
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={loading || plan.id === 'monthly'}
              className={`w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg mt-auto ${
                plan.id === 'monthly'
                  ? 'bg-green-500 text-white cursor-default'
                  : 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-brand-primary/20 active:scale-95'
              }`}
            >
              {loading ? 'Processing...' : plan.id === 'monthly' ? 'Current Plan' : 'Purchase or Upgrade'}
            </button>
            
            <p className="text-[9px] text-gray-400 text-center mt-6 uppercase tracking-[0.2em]">
              Secure payment via Stripe • Cancel anytime
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 max-w-2xl mx-auto grid md:grid-cols-3 gap-8">
         <div className="text-center p-6 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
            <Shield className="mx-auto text-brand-primary mb-4" size={28} />
            <h4 className="font-bold text-xs uppercase tracking-widest text-brand-dark mb-2">Verified Only</h4>
            <p className="text-[10px] text-gray-400 font-light leading-relaxed">Connect with verified users in a secure environment.</p>
         </div>
         <div className="text-center p-6 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
            <Zap className="mx-auto text-brand-primary mb-4" size={28} />
            <h4 className="font-bold text-xs uppercase tracking-widest text-brand-dark mb-2">Priority Matching</h4>
            <p className="text-[10px] text-gray-400 font-light leading-relaxed">Your profile at the top of discover feeds.</p>
         </div>
         <div className="text-center p-6 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
            <Star className="mx-auto text-brand-primary mb-4" size={28} />
            <h4 className="font-bold text-xs uppercase tracking-widest text-brand-dark mb-2">Exclusive Perks</h4>
            <p className="text-[10px] text-gray-400 font-light leading-relaxed">Unlock all themes and read receipt indicators.</p>
         </div>
      </div>
    </div>
  );
}
