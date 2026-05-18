import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = "" 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center text-center p-12 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-brand-primary/5 border border-white/50 ${className}`}
    >
      <div className="w-24 h-24 bg-gradient-to-br from-brand-cream to-white rounded-[2.5rem] flex items-center justify-center text-brand-primary mb-8 shadow-inner shadow-brand-primary/5 border border-brand-primary/5">
        <Icon size={40} className="drop-shadow-sm" />
      </div>
      <h3 className="serif text-3xl font-bold text-brand-dark mb-4 tracking-tight">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-10 leading-relaxed italic font-light">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="group relative px-10 py-4 bg-brand-primary text-white font-bold rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-brand-primary/30 active:scale-95 shadow-lg shadow-brand-primary/20"
        >
          <span className="relative z-10 uppercase tracking-widest text-[10px]">{actionLabel}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </button>
      )}
    </motion.div>
  );
}
