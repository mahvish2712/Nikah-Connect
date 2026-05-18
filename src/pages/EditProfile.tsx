import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, MapPin, Briefcase, GraduationCap, User, Heart, ChevronRight, Check, AlertCircle, Upload, Hash, Info } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';
import InterestTagInput from '../components/profile/InterestTagInput';

export default function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    location: '',
    profession: '',
    education: '',
    bio: '',
    photoUrl: '',
    gender: 'male',
    interests: [] as string[],
    height: '',
    maritalStatus: '',
    motherTongue: '',
    familyType: '',
    sect: '',
    religiosity: '',
    skinTone: '',
    religion: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'profiles', auth.currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            name: data.name || '',
            age: data.age || 18,
            location: data.location || '',
            profession: data.profession || '',
            education: data.education || '',
            bio: data.bio || '',
            photoUrl: data.photoUrl || '',
            gender: data.gender || 'male',
            interests: data.interests || [],
            height: data.height || '',
            maritalStatus: data.maritalStatus || '',
            motherTongue: data.motherTongue || '',
            familyType: data.familyType || '',
            sect: data.sect || '',
            religiosity: data.religiosity || '',
            skinTone: data.skinTone || '',
            religion: data.religion || ''
          });
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, photoUrl: base64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Update Firestore
      await updateDoc(doc(db, 'profiles', auth.currentUser.uid), {
        ...formData,
        updatedAt: serverTimestamp()
      });

      // 2. Update Auth profile for immediate local consistency
      await updateProfile(auth.currentUser, {
        displayName: formData.name,
        photoURL: formData.photoUrl
      });

      setSuccess(true);
      toast.success("Profile updated successfully!");
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error("Update profile error:", err);
      setError("Failed to save changes. Please try again.");
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
       <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 bg-brand-cream/40">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <BackButton />
          <h1 className="serif text-3xl font-bold text-brand-dark">Edit Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Photo Section */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
              <Camera size={20} className="text-brand-primary" /> Profile Photo
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-44 h-44 rounded-[2rem] overflow-hidden border-4 border-brand-cream shadow-2xl relative">
                  <img 
                    src={formData.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=90&w=800&auto=format&fit=crop'} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                    <Upload size={32} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">Click to Change Photo</span>
                  </div>
                </div>
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="flex-1 w-full space-y-4">
                <p className="text-sm text-gray-500 italic leading-relaxed">
                  Click the avatar to upload a new profile photo from your device.
                </p>
                {formData.photoUrl.startsWith('data:') && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">New photo ready to save</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Basic Info */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
              <User size={20} className="text-brand-accent" /> Personal Details
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Full Name</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Age</label>
                <input 
                  type="number"
                  min="18"
                  max="100"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    required
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl pl-14 pr-6 focus:ring-2 focus:ring-brand-primary/30 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Professional Info */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
              <Briefcase size={20} className="text-brand-primary" /> Career & Education
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Profession</label>
                <div className="relative">
                  <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    required
                    value={formData.profession}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                    className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl pl-14 pr-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Education</label>
                <div className="relative">
                  <GraduationCap className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text"
                    required
                    value={formData.education}
                    onChange={(e) => setFormData({...formData, education: e.target.value})}
                    className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl pl-14 pr-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Personal Information Section */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
              <Info size={20} className="text-brand-accent" /> Personal Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Height</label>
                <input 
                  type="text"
                  required
                  value={formData.height}
                  onChange={(e) => setFormData({...formData, height: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Marital Status</label>
                <select 
                  value={formData.maritalStatus} 
                  onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                >
                  <option value="Never Married">Never Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widow/Widower">Widow/Widower</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Mother Tongue</label>
                <input 
                  type="text"
                  required
                  value={formData.motherTongue}
                  onChange={(e) => setFormData({...formData, motherTongue: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Family Type</label>
                <select 
                  value={formData.familyType} 
                  onChange={(e) => setFormData({...formData, familyType: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                >
                  <option value="Nuclear">Nuclear</option>
                  <option value="Joint">Joint</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Sect</label>
                <select 
                  value={formData.sect} 
                  onChange={(e) => setFormData({...formData, sect: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                >
                  <option value="Sunni">Sunni</option>
                  <option value="Shia">Shia</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Religiosity</label>
                <select 
                  value={formData.religiosity} 
                  onChange={(e) => setFormData({...formData, religiosity: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                >
                  <option value="Practicing">Practicing</option>
                  <option value="Very Practicing">Very Practicing</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Non-practicing">Non-practicing</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Complexion</label>
                <input 
                  type="text"
                  required
                  value={formData.skinTone}
                  onChange={(e) => setFormData({...formData, skinTone: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Religion</label>
                <input 
                  type="text"
                  required
                  value={formData.religion}
                  onChange={(e) => setFormData({...formData, religion: e.target.value})}
                  className="w-full h-14 bg-brand-cream/50 border border-brand-primary/10 rounded-2xl px-6 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Bio Section */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-xl font-bold text-brand-dark mb-6">About Yourself</h2>
            <textarea 
              required
              rows={4}
              placeholder="Tell us about your values, goals, and what you're looking for in a partner..."
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className="w-full bg-brand-cream/50 border border-brand-primary/10 rounded-3xl p-6 focus:ring-2 focus:ring-brand-primary/20 outline-none italic text-gray-600"
            />
          </section>

          {/* Interests Section */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-brand-primary/5">
            <h2 className="serif text-xl font-bold text-brand-dark mb-6 flex items-center gap-2">
              <Hash size={20} className="text-brand-accent" /> Interests & Hobbies
            </h2>
            <InterestTagInput 
              selectedInterests={formData.interests}
              onChange={(interests) => setFormData({...formData, interests})}
            />
          </section>

          {/* Feedback Messages */}
          {error && (
            <div className="bg-brand-accent/5 text-brand-accent p-4 rounded-2xl flex items-center gap-3 border border-brand-accent/10">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-2xl flex items-center gap-3 border border-green-100">
              <Check size={20} />
              <p className="text-sm font-medium">Profile updated!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
             <button 
               type="button"
               onClick={() => navigate('/dashboard')}
               className="px-10 py-4 border-2 border-brand-primary/10 text-gray-500 rounded-2xl font-bold hover:bg-brand-cream transition-all"
             >
                Cancel
             </button>
             <motion.button
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               type="submit"
               disabled={saving}
               className="flex-1 h-16 bg-brand-primary text-white rounded-2xl font-bold shadow-2xl shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-3"
             >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    Save Profile <Check size={20} />
                  </>
                )}
             </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
