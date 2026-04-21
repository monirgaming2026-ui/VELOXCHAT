import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  doc, onSnapshot, collection, query, orderBy, 
  addDoc, serverTimestamp, updateDoc, where, getDocs, limit 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Chat as ChatType, Message, UserProfile } from "../types";
import { socket } from "../lib/socket";
import { motion, AnimatePresence } from "motion/react";
import { Send, Phone, Video, MoreVertical, ArrowLeft, Check, CheckCheck, Smile } from "lucide-react";
import { cn, formatDate } from "../lib/utils";

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const navigate = useNavigate();

  // Fetch chat metadata and other user
  useEffect(() => {
    if (!chatId || !profile) return;

    socket.emit("join-chat", chatId);

    const unsubscribeChat = onSnapshot(doc(db, "chats", chatId), async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as ChatType;
      const otherId = data.participants.find(id => id !== profile.uid);
      
      if (otherId) {
        const uRes = await getDocs(query(collection(db, "users"), where("uid", "==", otherId), limit(1)));
        if (!uRes.empty) setOtherUser(uRes.docs[0].data() as UserProfile);
      }
    });

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgList);
      
      // Update read receipts for incoming messages
      snapshot.docs.forEach(async (d) => {
        const msg = d.data() as Message;
        if (msg.senderId !== profile.uid && msg.status !== 'read') {
          await updateDoc(d.ref, { status: 'read' });
        }
      });
    });

    // Socket events
    socket.on("user-typing", ({ username }) => setTypingUser(username));
    socket.on("user-stop-typing", () => setTypingUser(null));

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
      socket.off("user-typing");
      socket.off("user-stop-typing");
    };
  }, [chatId, profile]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chatId || !profile) return;

    const text = inputText;
    setInputText("");
    
    try {
      const msgData = {
        chatId,
        senderId: profile.uid,
        text,
        status: 'sent',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, "chats", chatId, "messages"), msgData);
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      socket.emit("stop-typing", { chatId, userId: profile.uid });
    } catch (error) {
      console.error(error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!profile || !chatId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { chatId, userId: profile.uid, username: profile.username });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop-typing", { chatId, userId: profile.uid });
    }, 3000);
  };

  const startCall = (type: 'audio' | 'video') => {
    if (!otherUser) return;
    // We'll emit a signal to the other user. 
    // The actual WebRTC logic will be in a global listener we'll add later.
    // For now, let's trigger the call intent
    socket.emit("call-user", { 
      to: otherUser.uid, 
      from: profile?.uid, 
      fromName: profile?.fullName, 
      type 
    });
    // This should open a local Call UI in 'calling' state
  };

  if (!otherUser) return null;

  return (
    <div className="flex flex-col h-full bg-neutral-900 overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl flex items-center gap-4 z-10 shrink-0">
        <button onClick={() => navigate("/")} className="lg:hidden p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="relative">
          <img src={otherUser.photoURL} alt={otherUser.fullName} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
          {otherUser.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-neutral-900" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate text-sm lg:text-base">{otherUser.fullName}</h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-neutral-500">
            {otherUser.isOnline ? "Online Now" : `Last seen ${formatDate(otherUser.lastSeen)}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconButton onClick={() => startCall('audio')} icon={<Phone className="w-5 h-5" />} />
          <IconButton onClick={() => startCall('video')} icon={<Video className="w-5 h-5 text-blue-500" />} />
          <IconButton icon={<MoreVertical className="w-5 h-5" />} />
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === profile?.uid;
          const showTime = idx === 0 || (msg.createdAt?.seconds - messages[idx-1].createdAt?.seconds > 300);
          
          return (
            <React.Fragment key={msg.id}>
              {showTime && (
                <div className="text-center my-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 bg-neutral-800/50 px-3 py-1 rounded-full">{formatDate(msg.createdAt)}</span>
                </div>
              )}
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("flex w-full mb-1", isMine ? "justify-end" : "justify-start")}
              >
                <div className={cn(
                  "max-w-[80%] px-4 py-2 rounded-2xl relative group",
                  isMine ? "bg-blue-600 text-white rounded-tr-none" : "bg-neutral-800 text-neutral-200 rounded-tl-none"
                )}>
                  <p className="text-sm lg:text-base leading-relaxed break-words">{msg.text}</p>
                  <div className={cn(
                    "flex items-center gap-1 mt-1 justify-end",
                    isMine ? "text-blue-100" : "text-neutral-500"
                  )}>
                    <span className="text-[9px] font-medium opacity-70">{formatDate(msg.createdAt)}</span>
                    {isMine && (
                      msg.status === 'read' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3 opacity-50" />
                    )}
                  </div>
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
        {typingUser && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 items-center text-neutral-500 text-xs ml-2 italic"
          >
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-neutral-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            {typingUser} is typing...
          </motion.div>
        )}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input area */}
      <div className="p-4 bg-neutral-900/50 backdrop-blur-xl border-t border-neutral-800 shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative flex items-center bg-neutral-800 rounded-[1.5rem] border border-neutral-700/50 focus-within:border-blue-500/50 transition-all p-1">
            <button type="button" className="p-3 text-neutral-500 hover:text-neutral-300">
              <Smile className="w-6 h-6" />
            </button>
            <input 
              type="text" 
              className="flex-1 bg-transparent py-3 px-2 focus:outline-none text-neutral-100 placeholder:text-neutral-600"
              placeholder="Type your message..."
              value={inputText}
              onChange={handleTyping}
            />
            <button 
              type="button" 
              className="p-3 text-neutral-500 hover:text-neutral-300 transition-colors"
              onClick={() => handleSendMessage()}
            >
              <Send className={cn("w-6 h-6 transition-all", inputText.trim() ? "text-blue-500 scale-110" : "scale-100")} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IconButton({ icon, onClick, className }: { icon: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn("p-3 text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800 rounded-xl transition-all active:scale-90", className)}
    >
      {icon}
    </button>
  );
}
