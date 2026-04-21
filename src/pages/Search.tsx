import React, { useState } from "react";
import { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, UserPlus, ArrowRight, Check, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function Search() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<string[]>([]);
  const navigate = useNavigate();

  // Load existing friends to show correct status
  React.useEffect(() => {
    if (!profile) return;
    const loadFriends = async () => {
      const snap = await getDocs(collection(db, "users", profile.uid, "friends"));
      setFriends(snap.docs.map(doc => doc.id));
    };
    loadFriends();
  }, [profile]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) return;

    setLoading(true);
    setResults([]);
    try {
      // 1. Exact Username Search
      const userQ = query(
        collection(db, "users"),
        where("username", "==", queryStr.toLowerCase()),
        limit(1)
      );
      const userSnap = await getDocs(userQ);
      
      if (!userSnap.empty) {
        setResults(userSnap.docs.map(doc => doc.data() as UserProfile));
      } else {
        // 2. Name Search (Case sensitive in Firestore, usually better to store a lowercase version for searching)
        // For now we do exact match or startsWith if possible, but Firestore 'where' is limited.
        // We'll do exact name match as fallback.
        const nameQ = query(
          collection(db, "users"),
          where("fullName", "==", queryStr),
          limit(10)
        );
        const nameSnap = await getDocs(nameQ);
        const nameResults = nameSnap.docs.map(doc => doc.data() as UserProfile);
        
        // Remove self from results
        setResults(nameResults.filter(u => u.uid !== profile?.uid));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = async (otherUser: UserProfile) => {
    if (!profile) return;

    const isFriend = friends.includes(otherUser.uid);
    const friendRef = doc(db, "users", profile.uid, "friends", otherUser.uid);

    try {
      if (isFriend) {
        // Remove friend (optional, but good for UX)
        // await deleteDoc(friendRef);
        // setFriends(prev => prev.filter(id => id !== otherUser.uid));
      } else {
        await setDoc(friendRef, {
          uid: otherUser.uid,
          status: 'accepted', // Auto-accepting for simplicity per "the user who talks ... will be added"
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setFriends(prev => [...prev, otherUser.uid]);
      }
    } catch (error) {
      console.error("Failed to update friendship", error);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!profile) return;

    // Auto-friend when starting a chat per request
    if (!friends.includes(otherUser.uid)) {
      await toggleFriend(otherUser);
    }

    const chatId = [profile.uid, otherUser.uid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        participants: [profile.uid, otherUser.uid],
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastMessageAt: null
      });
    }

    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto min-h-screen">
      <h1 className="text-3xl font-display font-bold mb-8 italic">Find People</h1>
      
      <form onSubmit={handleSearch} className="relative mb-12 group">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Search by name or @username..." 
          className="input-field w-full pl-12 h-14 bg-neutral-800/50"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <p className="text-[10px] text-neutral-600 mt-2 px-2 uppercase font-bold tracking-widest leading-relaxed">
          Search for names to find colleagues, or use @username for a precise ID match.
        </p>
      </form>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            </motion.div>
          ) : results.length > 0 ? (
            results.map((user) => (
              <motion.div 
                key={user.uid}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-4 rounded-3xl flex items-center gap-4 hover:border-neutral-700 transition-all"
              >
                <img src={user.photoURL} alt={user.fullName} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate text-neutral-100">{user.fullName}</h3>
                  <p className="text-xs text-neutral-500">@{user.username}</p>
                  <p className="text-[8px] text-neutral-700 mt-1 uppercase font-black font-mono">ID: {user.uid.slice(0, 8)}...</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleFriend(user)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      friends.includes(user.uid) 
                        ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                        : "bg-neutral-800 text-neutral-400 hover:text-blue-500 border border-neutral-700"
                    )}
                    title={friends.includes(user.uid) ? "Remove Friend" : "Add Friend"}
                  >
                    {friends.includes(user.uid) ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </button>
                  
                  <button 
                    onClick={() => startChat(user)}
                    className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition-all active:scale-90 shadow-lg shadow-blue-600/20"
                  >
                    <ArrowRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : searchQuery && !loading && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-neutral-500"
            >
              <p>No users found matching "{searchQuery}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-20">
        <h2 className="text-xs uppercase font-bold tracking-widest text-neutral-600 mb-6">Suggested for you</h2>
        <div className="grid grid-cols-2 gap-4">
          <SuggestedCard name="Alice Studio" username="alice_s" delay={0.1} />
          <SuggestedCard name="Bob Echo" username="bob_echo" delay={0.2} />
        </div>
      </div>
    </div>
  );
}

function SuggestedCard({ name, username, delay }: { name: string, username: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center text-center"
    >
      <img src={`https://picsum.photos/seed/${username}/96`} className="w-16 h-16 rounded-full mb-3 bg-neutral-800" referrerPolicy="no-referrer" />
      <h4 className="text-sm font-bold truncate w-full">{name}</h4>
      <p className="text-[10px] text-neutral-600 mb-4">@{username}</p>
      <button className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors">
        View Profile
      </button>
    </motion.div>
  );
}
