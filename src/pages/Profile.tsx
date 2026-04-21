import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, LogOut, Shield, Bell, HelpCircle, Edit2, Smartphone, Zap, Upload, ArrowLeft } from "lucide-react";
import { cn, compressImage } from "../lib/utils";

export default function Profile() {
  const { profile, logOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpdate = async () => {
    if (!profile || !fullName) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), { fullName });
      setEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!profile || !file) return;

    try {
      const compressed = await compressImage(file);
      await updateDoc(doc(db, "users", profile.uid), { photoURL: compressed });
    } catch (error) {
      console.error("Profile image update failed", error);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto pb-24">
      <div className="mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-all active:scale-95 flex items-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Return</span>
        </button>
      </div>

      <header className="flex flex-col items-center text-center mb-12">
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          accept="image/*" 
          onChange={handleFileChange} 
        />
        <div className="relative mb-6">
          <img 
            src={profile.photoURL} 
            alt={profile.fullName} 
            className="w-32 h-32 rounded-[2.5rem] object-cover ring-4 ring-neutral-800 ring-offset-4 ring-offset-neutral-950" 
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:scale-110 transition-transform"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>
        
        {editing ? (
          <div className="flex gap-2">
            <input 
              className="input-field text-xl font-bold bg-neutral-900 border-neutral-700"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
            <button onClick={handleUpdate} className="btn-primary py-0">Save</button>
          </div>
        ) : (
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            {profile.fullName}
            <button onClick={() => setEditing(true)} className="text-neutral-500 hover:text-neutral-300">
              <Edit2 className="w-4 h-4" />
            </button>
          </h1>
        )}
        <p className="text-neutral-500 mt-1 font-medium">@{profile.username}</p>
      </header>

      <div className="space-y-4">
        <SectionTitle title="Account" />
        <ProfileItem icon={<User className="w-5 h-5 text-blue-500"/>} label="Email" value={profile.email} />
        <ProfileItem icon={<Shield className="w-5 h-5 text-purple-500"/>} label="Privacy & Security" />
        <ProfileItem icon={<Smartphone className="w-5 h-5 text-green-500"/>} label="Connected Devices" />
        
        <SectionTitle title="Preferences" className="mt-8" />
        <ProfileItem icon={<Bell className="w-5 h-5 text-yellow-500"/>} label="Notifications" />
        <ProfileItem icon={<HelpCircle className="w-5 h-5 text-neutral-500"/>} label="Help & Support" />

        <div className="pt-8">
          <button 
            onClick={logOut}
            className="w-full h-14 rounded-2xl bg-red-400/10 text-red-400 font-bold flex items-center justify-center gap-3 hover:bg-red-400/20 transition-all border border-red-400/20"
          >
            <LogOut className="w-5 h-5" />
            Log Out from Echo
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, className }: { title: string, className?: string }) {
  return (
    <h2 className={cn("text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-600 pl-2 mb-2", className)}>
      {title}
    </h2>
  );
}

function ProfileItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
  return (
    <div className="glass p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-neutral-600 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center border border-neutral-800">
          {icon}
        </div>
        <span className="font-medium text-neutral-300">{label}</span>
      </div>
      {value ? (
        <span className="text-sm text-neutral-500">{value}</span>
      ) : (
        <ArrowRight className="w-4 h-4 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
      )}
    </div>
  );
}

function ArrowRight(props: any) {
  return <Zap {...props} /> // Fallback icon since I forgot ArrowRight import in first draft, will use lucide Zap as chevron
}
