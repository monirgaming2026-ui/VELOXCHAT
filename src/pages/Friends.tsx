import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, deleteDoc, getDocs, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { UserProfile, FriendShip } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Users, UserX, MessageSquare, ArrowLeft, Search } from "lucide-react";
import { cn } from "../lib/utils";

export default function Friends() {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;

    // Listen to the friends subcollection
    const unsubscribe = onSnapshot(collection(db, "users", profile.uid, "friends"), async (snapshot) => {
      const friendIds = snapshot.docs.map(doc => doc.id);
      
      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Batch fetch friend profiles
      // Firestore 'in' query supports up to 30 IDs
      const friendUIDs = friendIds.slice(0, 30);
      const q = query(collection(db, "users"), where("uid", "in", friendUIDs));
      const userSnap = await getDocs(q);
      const profiles = userSnap.docs.map(doc => doc.data() as UserProfile);
      
      setFriends(profiles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const removeFriend = async (friendId: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, "users", profile.uid, "friends", friendId));
    } catch (error) {
      console.error("Failed to remove friend", error);
    }
  };

  const startChat = (friendId: string) => {
    if (!profile) return;
    const chatId = [profile.uid, friendId].sort().join("_");
    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto pb-32 min-h-screen">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 hover:text-neutral-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold italic">Your Friends</h1>
            <p className="text-sm text-neutral-500 font-medium">Manage your VeloxChat connections</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-500" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
             <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
             <p className="text-neutral-600 uppercase font-black tracking-widest text-[10px]">Loading Network...</p>
          </div>
        ) : friends.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 glass rounded-[2.5rem]"
          >
            <div className="w-20 h-20 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-neutral-700" />
            </div>
            <h2 className="text-xl font-bold mb-2">No friends yet</h2>
            <p className="text-neutral-500 mb-8 max-w-xs mx-auto">Start searching for usernames to build your network and stay connected.</p>
            <Link to="/search" className="btn-primary inline-flex items-center gap-2">
               Find People <Search className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((friend) => (
              <motion.div
                key={friend.uid}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-5 rounded-[2rem] flex items-center gap-4 group"
              >
                <div className="relative">
                  <img src={friend.photoURL} alt={friend.fullName} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  {friend.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-neutral-900" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-100 truncate">{friend.fullName}</h3>
                  <p className="text-xs text-neutral-500">@{friend.username}</p>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startChat(friend.uid)}
                    className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition-all text-white shadow-lg shadow-blue-600/20"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => removeFriend(friend.uid)}
                    className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-red-400/10 text-neutral-500 hover:text-red-400 border border-neutral-700 transition-all"
                    title="Remove Friend"
                  >
                    <UserX className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
