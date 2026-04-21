import React, { useState } from "react";
import { db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import { Camera, Upload, AlertCircle } from "lucide-react";
import { compressImage } from "../lib/utils";

export default function ProfileSetup() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [photoURL, setPhotoURL] = useState(`https://picsum.photos/seed/${user?.uid}/200`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setPhotoURL(compressed);
      } catch (error) {
        console.error("Image compression failed", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username || !fullName) return;

    const cleanUsername = username.toLowerCase().replace(/\s/g, "");
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Check if name is unique (optional, but per request "each user's name will be different")
      // Since names aren't strictly unique in DB logic, we prioritize username
      
      // 2. Check if username exists
      const usernameRef = doc(db, "usernames", cleanUsername);
      const usernameSnap = await getDoc(usernameRef);
      
      if (usernameSnap.exists()) {
        setError("This username is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);

      // Create user profile
      batch.set(doc(db, "users", user.uid), {
        uid: user.uid,
        username: cleanUsername,
        fullName,
        photoURL,
        email: user.email,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Reserve username
      batch.set(usernameRef, {
        uid: user.uid
      });

      await batch.commit();
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Failed to set up profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 rounded-3xl w-full max-w-md"
      >
        <h1 className="text-2xl font-display font-bold mb-2">Welcome to VeloxChat</h1>
        <p className="text-neutral-400 mb-8">Personalize your identity to start chatting.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img src={photoURL} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-neutral-700" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-neutral-500">Click avatar to upload from gallery</p>
            <button 
              type="button"
              className="text-[10px] text-blue-500 hover:underline"
              onClick={() => setPhotoURL(`https://picsum.photos/seed/${Math.random()}/200`)}
            >
              Or generate random
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-400">Full Name</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-400">Username</label>
            <input 
              required
              type="text" 
              className="input-field w-full" 
              placeholder="unique_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full h-12"
          >
            {loading ? "Setting up..." : "Complete Setup"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
