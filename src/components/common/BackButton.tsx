import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function BackButton({ label = "Back", className = "", to }: { label?: string, className?: string, to?: string }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.button
      whileHover={{ x: -4 }}
      onClick={handleClick}
      className={`flex items-center gap-2 text-gray-500 hover:text-brand-primary transition-colors font-medium text-sm group ${className}`}
    >
      <div className="p-2 bg-white rounded-xl shadow-sm border border-brand-primary/5 group-hover:border-brand-primary/20 transition-all">
        <ArrowLeft size={16} />
      </div>
      <span>{label}</span>
    </motion.button>
  );
}
