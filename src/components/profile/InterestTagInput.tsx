import React, { useState } from 'react';
import { X, Plus, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InterestTagInputProps {
  selectedInterests: string[];
  onChange: (interests: string[]) => void;
  maxInterests?: number;
}

const POPULAR_INTERESTS = [
  'Traveling', 'Cooking', 'Islam', 'Reading', 'Hiking', 
  'Photography', 'Art', 'Music', 'Fitness', 'Movies',
  'Coding', 'Gardening', 'Volunteering', 'Sports', 'Gaming'
];

export default function InterestTagInput({ selectedInterests, onChange, maxInterests = 10 }: InterestTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      const filtered = POPULAR_INTERESTS.filter(
        i => i.toLowerCase().includes(value.toLowerCase()) && !selectedInterests.includes(i)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !selectedInterests.includes(trimmed) && selectedInterests.length < maxInterests) {
      onChange([...selectedInterests, trimmed]);
      setInputValue('');
      setSuggestions([]);
    }
  };

  const removeInterest = (interest: string) => {
    onChange(selectedInterests.filter(i => i !== interest));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest(inputValue);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
           <Hash size={16} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={selectedInterests.length >= maxInterests ? "Max interests reached" : "Add an interest (e.g. Hiking, Cooking)"}
          disabled={selectedInterests.length >= maxInterests}
          className="w-full h-14 pl-12 pr-4 bg-brand-cream/30 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-primary/20 outline-none transition-all text-sm"
        />
        
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-brand-primary/5 p-2"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2 pt-1">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addInterest(s)}
                    className="px-3 py-1.5 bg-brand-cream/50 text-gray-600 rounded-xl text-xs font-medium hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1"
                  >
                    <Plus size={12} /> {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {selectedInterests.map((interest) => (
            <motion.span
              key={interest}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-brand-dark text-xs font-bold rounded-xl border border-brand-primary/10 shadow-sm"
            >
              {interest}
              <button
                type="button"
                onClick={() => removeInterest(interest)}
                className="p-0.5 hover:bg-brand-primary/10 rounded-full text-brand-primary transition-all"
              >
                <X size={12} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      
      {selectedInterests.length === 0 && !inputValue && (
        <p className="text-[10px] text-gray-400 font-medium italic pl-2">
          Share your hobbies to find people with similar passions.
        </p>
      )}
      
      <p className="text-[9px] text-gray-400 text-right pr-2">
        {selectedInterests.length} / {maxInterests} interests
      </p>
    </div>
  );
}
