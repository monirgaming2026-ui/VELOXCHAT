import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { CallLog, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User, ArrowLeft, MoreVertical } from "lucide-react";
import { formatDate } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

export default function Calls() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<(CallLog & { otherUser?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, "users", profile.uid, "calls"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const callLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallLog));
      
      // Fetch user profiles for the other participants
      const otherUserIds = Array.from(new Set(callLogs.map(log => log.receiverId === profile.uid ? log.callerId : log.receiverId)));
      
      if (otherUserIds.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // Batch fetch (limit 30)
      const usersQuery = query(collection(db, "users"), where("uid", "in", otherUserIds.slice(0, 30)));
      const usersSnap = await getDocs(usersQuery);
      const userMap = new Map(usersSnap.docs.map(doc => [doc.id, doc.data() as UserProfile]));

      const enrichedLogs = callLogs.map(log => ({
        ...log,
        otherUser: userMap.get(log.receiverId === profile.uid ? log.callerId : log.receiverId)
      }));

      setLogs(enrichedLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

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
            <h1 className="text-3xl font-display font-bold italic tracking-tight">Call History</h1>
            <p className="text-sm text-neutral-500 font-medium uppercase tracking-widest leading-none mt-1">Review your connections</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500">
           <Phone className="w-6 h-6" />
        </div>
      </header>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="glass p-5 rounded-[2rem] flex items-center gap-4 animate-pulse opacity-50">
                <div className="w-14 h-14 bg-neutral-800 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-1/3" />
                  <div className="h-3 bg-neutral-800 rounded w-1/4" />
                </div>
              </div>
            ))
          ) : logs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-600">
                <PhoneMissed className="w-8 h-8" />
              </div>
              <p className="text-neutral-500 font-medium">No call history found.</p>
            </motion.div>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-4 rounded-[2rem] flex items-center gap-4 group hover:bg-neutral-800/50 transition-all"
              >
                <div className="relative">
                  <img 
                    src={log.otherUser?.photoURL || `https://picsum.photos/seed/${log.id}/200`} 
                    alt={log.otherUser?.fullName} 
                    className="w-14 h-14 rounded-2xl object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" 
                    referrerPolicy="no-referrer"
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg",
                    log.status === 'missed' ? "bg-red-500" : log.status === 'rejected' ? "bg-neutral-600" : "bg-green-500"
                  )}>
                    {log.callerId === profile?.uid ? (
                      <PhoneOutgoing className="w-3 h-3 text-white" />
                    ) : log.status === 'missed' ? (
                      <PhoneMissed className="w-3 h-3 text-white" />
                    ) : (
                      <PhoneIncoming className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-100 truncate">
                    {log.otherUser?.fullName || "Private User"}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                    <span>{log.type}</span>
                    <span>•</span>
                    <span>{log.status}</span>
                    {log.duration ? (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                           <Clock className="w-3 h-3" /> {Math.floor(log.duration / 60)}:{(log.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-tighter">
                    {formatDate(log.createdAt?.toDate ? log.createdAt.toDate() : new Date())}
                  </p>
                </div>

                <button className="p-3 text-neutral-600 hover:text-white transition-all">
                   <MoreVertical className="w-5 h-5" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
