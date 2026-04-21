import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Chat, UserProfile } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search as SearchIcon, Plus, MoreVertical } from "lucide-react";
import { formatDate } from "../lib/utils";

export default function Home() {
  const { profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch recent users
    const usersQuery = query(
      collection(db, "users"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setRecentUsers(usersList.filter(u => u.uid !== profile?.uid));
    });

    return () => unsubscribeUsers();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", profile.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const startChat = async (otherUser: UserProfile) => {
    if (!profile) return;

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

  const filteredChats = chats.filter(chat => {
    // Note: In real app, we'd need to fetch participant profiles to search by name/username
    // For now, we search by chatId or display the chat
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 lg:p-8 shrink-0">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/profile" className="shrink-0 relative group">
              <img 
                src={profile?.photoURL} 
                alt={profile?.fullName} 
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-blue-500 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-neutral-900" />
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold text-neutral-100">{profile?.fullName}</h1>
              <p className="text-xs text-neutral-500 font-medium">@{profile?.username}</p>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold italic tracking-tight text-neutral-400">Messages</h2>
        </div>

        <div className="relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="input-field w-full pl-12 h-12 bg-neutral-800/50 border-neutral-700/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6 shrink-0">
        <div className="flex items-center justify-between px-6 lg:px-8 mb-4">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-600">Discover New</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 lg:px-8 no-scrollbar pb-2">
          {recentUsers.map((user) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => startChat(user)}
              className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
            >
              <div className="relative">
                <img 
                  src={user.photoURL} 
                  alt={user.fullName} 
                  className="w-16 h-16 rounded-[1.5rem] object-cover ring-2 ring-neutral-800 group-hover:ring-blue-500 transition-all"
                  referrerPolicy="no-referrer"
                />
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-neutral-900" />
                )}
              </div>
              <span className="text-[10px] font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors max-w-[64px] truncate capitalize">
                {user.username}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-32">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <SkeletonLoader />
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-neutral-500">
              <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mb-4 border border-neutral-800">
                <SearchIcon className="w-8 h-8 opacity-20" />
              </div>
              <p>No conversations yet.</p>
              <Link to="/search" className="text-blue-500 font-bold mt-2 hover:underline">Find people</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChats.map((chat) => (
                <ChatItem key={chat.id} chat={chat} currentUserId={profile?.uid!} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChatItem({ chat, currentUserId }: { chat: Chat, currentUserId: string, key?: any }) {
  const otherUserId = chat.participants.find(id => id !== currentUserId);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!otherUserId) return;
    const fetchUser = async () => {
      // In real scenario, use a global user cache or batch fetch
      const response = await fetch(`/api/users/${otherUserId}`); // Placeholder for user lookup logic
      // Since we don't have this API yet, we'll listen to Firestore directly for simplicity here
    };
  }, [otherUserId]);

  // Direct Firestore listen for the peer user
  useEffect(() => {
    if (!otherUserId) return;
    const q = query(collection(db, "users"), where("uid", "==", otherUserId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setOtherUser(snapshot.docs[0].data() as UserProfile);
      }
    });
    return () => unsubscribe();
  }, [otherUserId]);

  if (!otherUser) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Link 
        to={`/chat/${chat.id}`}
        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-800 group"
      >
        <div className="relative shrink-0">
          <img 
            src={otherUser.photoURL} 
            alt={otherUser.fullName} 
            className="w-14 h-14 rounded-2xl object-cover"
            referrerPolicy="no-referrer"
          />
          {otherUser.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-neutral-900" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className="font-bold truncate text-neutral-100">{otherUser.fullName}</h3>
            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 group-hover:text-neutral-400">
              {chat.lastMessageAt ? formatDate(chat.lastMessageAt) : ""}
            </span>
          </div>
          <p className="text-sm text-neutral-500 truncate group-hover:text-neutral-400">
            {chat.lastMessage || "Start a conversation"}
          </p>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
          <MoreVertical className="w-5 h-5 text-neutral-600" />
        </div>
      </Link>
    </motion.div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-4 p-4 animate-pulse">
          <div className="w-14 h-14 bg-neutral-800 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-neutral-800 rounded w-1/3" />
            <div className="h-3 bg-neutral-800 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
