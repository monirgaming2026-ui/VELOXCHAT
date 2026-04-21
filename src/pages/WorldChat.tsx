import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { UserProfile, WorldMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Send, Video, Shield, UserPlus, MessageSquare, ArrowRight, X } from "lucide-react";
import { formatRelative } from "date-fns";
import { socket } from "../lib/socket";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

export default function WorldChat() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<WorldMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "world_messages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorldMessage));
      setMessages(msgs.reverse());
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    socket.on("match-found", ({ peerId, initiator }) => {
      setIsMatching(false);
      setMatchStatus("Match found! Starting video call...");
      
      // We would normally trigger the CallManager logic here
      // For the demo, we'll suggest a manual interaction or set state
      // that the CallManager can pick up if it's listening for 'start-world-call'
      socket.emit("start-world-call", { to: peerId, from: socket.id, fromId: profile?.uid, fromName: profile?.fullName, type: 'video' });
    });

    return () => { socket.off("match-found"); };
  }, [profile]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, "world_messages"), {
        senderId: profile.uid,
        senderName: profile.fullName,
        senderPhoto: profile.photoURL,
        text: newMessage,
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error(error);
    }
  };

  const startWorldMatch = () => {
    setIsMatching(true);
    setMatchStatus("Finding someone awesome to talk to...");
    socket.emit("join-world-match");
  };

  const cancelMatch = () => {
    setIsMatching(false);
    socket.emit("leave-world-match");
  };

  const startPersonalChat = async (otherUserId: string) => {
    if (!profile) return;
    const chatId = [profile.uid, otherUserId].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        participants: [profile.uid, otherUserId],
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastMessageAt: null
      });
    }
    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      <header className="p-6 lg:p-8 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
            <Globe className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold italic tracking-tight text-white">World Chat</h1>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">Global Live Feed</p>
          </div>
        </div>

        <button 
          onClick={startWorldMatch}
          disabled={isMatching}
          className="btn-primary flex items-center gap-2 group px-6 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/20"
        >
          <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Random Match</span>
        </button>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col relative">
        <AnimatePresence>
          {isMatching && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-neutral-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-20" />
                <div className="relative w-24 h-24 bg-neutral-900 rounded-[2.5rem] border border-neutral-800 flex items-center justify-center">
                  <Globe className="w-12 h-12 text-blue-500" />
                </div>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2 text-white">Searching the Globe...</h2>
              <p className="text-neutral-500 max-w-xs mb-8">{matchStatus}</p>
              <button 
                onClick={cancelMatch}
                className="px-8 h-12 rounded-2xl bg-neutral-800 text-neutral-400 font-bold hover:bg-neutral-700 transition-colors flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel Search
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 space-y-6 no-scrollbar">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex gap-4 group",
                msg.senderId === profile?.uid ? "flex-row-reverse" : ""
              )}
            >
              <div 
                className="shrink-0 cursor-pointer"
                onClick={() => msg.senderId !== profile?.uid && startPersonalChat(msg.senderId)}
              >
                <img 
                  src={msg.senderPhoto} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-transparent group-hover:ring-blue-500 transition-all shadow-lg" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className={cn(
                "max-w-[70%] space-y-1",
                msg.senderId === profile?.uid ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "flex items-center gap-2 mb-1",
                  msg.senderId === profile?.uid ? "flex-row-reverse" : ""
                )}>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{msg.senderName}</span>
                  <span className="text-[10px] text-neutral-700">
                    {msg.createdAt?.toDate ? formatRelative(msg.createdAt.toDate(), new Date()) : "Just now"}
                  </span>
                </div>
                <div className={cn(
                  "p-4 rounded-2xl text-sm relative",
                  msg.senderId === profile?.uid 
                    ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/20" 
                    : "bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700"
                )}>
                  {msg.text}
                  
                  {msg.senderId !== profile?.uid && (
                    <button 
                      onClick={() => startPersonalChat(msg.senderId)}
                      className="absolute -right-12 bottom-0 w-10 h-10 rounded-xl bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-neutral-500 hover:text-blue-500 border border-neutral-700"
                      title="Send Personal Message"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-6 lg:p-8 shrink-0">
          <form onSubmit={sendMessage} className="relative group">
            <input 
              type="text" 
              placeholder="Share something with the world..." 
              className="input-field w-full h-14 pl-6 pr-16 bg-neutral-800/50 border-neutral-700/50 text-white rounded-2xl"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[10px] text-center text-neutral-700 mt-4 uppercase font-bold tracking-[0.2em]">
            Keep it friendly. Messages are visible to everyone globally.
          </p>
        </div>
      </div>
    </div>
  );
}
