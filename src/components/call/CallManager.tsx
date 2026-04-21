import React, { useState, useEffect, useRef } from "react";
import Peer from "simple-peer";
import { socket } from "../../lib/socket";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, Camera } from "lucide-react";
import { cn } from "../../lib/utils";

import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function CallManager() {
  const { profile } = useAuth();
  const [call, setCall] = useState<{
    from: string;
    fromId?: string;
    fromName: string;
    offer: any;
    type: 'audio' | 'video';
    receiving: boolean;
  } | null>(null);
  
  const [outgoingCall, setOutgoingCall] = useState<{ toId: string; type: 'audio' | 'video' } | null>(null);
  const [calling, setCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [otherStream, setOtherStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile) return;

    socket.on("incoming-call", ({ from, fromId, fromName, offer, type }) => {
      setCall({ from, fromId, fromName, offer, type, receiving: true });
    });

    socket.on("start-world-call", async ({ to, fromId, type }) => {
      setCalling(true);
      setOutgoingCall({ toId: fromId, type });
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: type === 'video', 
          audio: true 
        });
        setStream(mediaStream);

        const p = new Peer({
          initiator: true,
          trickle: false,
          stream: mediaStream,
        });

        p.on("signal", (data) => {
          socket.emit("call-user", { to, offer: data, from: socket.id, fromId: profile.uid, fromName: profile.fullName, type });
        });

        p.on("stream", (remoteStream) => {
          setOtherStream(remoteStream);
          startTimeRef.current = Date.now();
        });

        setPeer(p);
      } catch (err) {
        console.error(err);
        handleEndCall();
      }
    });

    socket.on("call-ended", () => {
      logCall('completed');
      handleEndCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("start-world-call");
      socket.off("call-ended");
    };
  }, [profile]);

  const logCall = async (status: 'completed' | 'missed' | 'rejected') => {
    if (!profile) return;

    // Determine target user ID
    let otherId = call?.fromId || outgoingCall?.toId;
    if (!otherId) return;

    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const type = call?.type || outgoingCall?.type || 'video';

    try {
      await addDoc(collection(db, "users", profile.uid, "calls"), {
        id: crypto.randomUUID(),
        participants: [profile.uid, otherId],
        callerId: outgoingCall ? profile.uid : otherId,
        receiverId: outgoingCall ? otherId : profile.uid,
        type,
        status,
        duration,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to log call", error);
    }
  };

  const handleEndCall = () => {
    if (peer) peer.destroy();
    if (stream) stream.getTracks().forEach(track => track.stop());
    setCall(null);
    setOutgoingCall(null);
    setCalling(false);
    setCallAccepted(false);
    setStream(null);
    setOtherStream(null);
    setPeer(null);
    setIsMuted(false);
    startTimeRef.current = null;
  };

  const answerCall = async () => {
    if (!call) return;
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: call.type === 'video', 
        audio: true 
      });
      setStream(mediaStream);
      setCallAccepted(true);
      startTimeRef.current = Date.now();

      const p = new Peer({
        initiator: false,
        trickle: false,
        stream: mediaStream,
      });

      p.on("signal", (data) => {
        socket.emit("answer-call", { to: call.from, answer: data });
      });

      p.on("stream", (remoteStream) => {
        setOtherStream(remoteStream);
      });

      p.signal(call.offer);
      setPeer(p);
    } catch (err) {
      console.error(err);
      handleEndCall();
    }
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const rejectCall = () => {
    if (call) {
      socket.emit("end-call", { to: call.from });
      logCall('rejected');
      setCall(null);
    }
  };

  // Effect to initiate outgoing call logic when calling state changes
  // Note: For brevity, outgoing initiation is triggered here when we'll add 'setCalling' logic elsewhere or via socket
  useEffect(() => {
    socket.on("call-answered", ({ answer }) => {
      if (peer) peer.signal(answer);
      setCallAccepted(true);
    });
    return () => { socket.off("call-answered"); };
  }, [peer]);

  if (!call && !calling) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 lg:p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-4xl aspect-video glass rounded-[3rem] overflow-hidden flex flex-col relative shadow-2xl"
        >
          {/* Background blurred video / preview */}
          {callAccepted && (
            <div className="absolute inset-0 z-0">
               <video 
                 playsInline 
                 autoPlay 
                 ref={(el) => { if(el && otherStream) el.srcObject = otherStream }}
                 className="w-full h-full object-cover opacity-60 filter blur-xl"
               />
            </div>
          )}

          {/* Main Video Area */}
          <div className="flex-1 relative z-10 flex items-center justify-center p-8">
            {callAccepted ? (
              <div className="w-full h-full relative grid grid-cols-1 gap-4">
                <video 
                  playsInline 
                  autoPlay 
                  ref={(el) => { if(el && otherStream) el.srcObject = otherStream }}
                  className="w-full h-full object-contain rounded-3xl"
                />
                <div className="absolute bottom-6 right-6 w-1/4 aspect-video rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-2xl">
                  <video 
                    playsInline 
                    muted 
                    autoPlay 
                    ref={(el) => { if(el && stream) el.srcObject = stream }}
                    className="w-full h-full object-cover bg-neutral-900"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <img 
                  src={`https://picsum.photos/seed/${call?.from || 'unknown'}/200`} 
                  className="w-32 h-32 rounded-full mx-auto mb-6 ring-4 ring-blue-500/50"
                  referrerPolicy="no-referrer"
                />
                <h2 className="text-3xl font-display font-bold mb-2">{call?.fromName || "Someone"}</h2>
                <p className="text-neutral-400 font-medium tracking-widest uppercase text-xs animate-pulse">
                  {call?.receiving ? `Incoming ${call.type} Call...` : "Calling..."}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-8 pb-12 shrink-0 z-20 flex items-center justify-center gap-6">
            {!callAccepted && call?.receiving ? (
              <>
                <ControlButton 
                  onClick={answerCall} 
                  icon={call.type === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />} 
                  className="bg-green-500 hover:bg-green-400 text-white w-20 h-20"
                />
                <ControlButton 
                  onClick={rejectCall} 
                  icon={<PhoneOff className="w-8 h-8" />} 
                  className="bg-red-500 hover:bg-red-400 text-white w-20 h-20"
                />
              </>
            ) : (
              <>
                <ControlButton 
                  onClick={toggleMute}
                  icon={isMuted ? <MicOff className="w-6 h-6 text-red-500" /> : <Mic className="w-6 h-6" />} 
                  className={cn(isMuted && "bg-red-500/10 border-red-500/20")}
                />
                <ControlButton icon={<VideoOff className="w-6 h-6" />} />
                <ControlButton 
                  onClick={handleEndCall} 
                  icon={<PhoneOff className="w-6 h-6" />} 
                  className="bg-red-500 hover:bg-red-400 text-white w-16 h-16"
                />
                <ControlButton icon={<Minimize2 className="w-6 h-6" />} />
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ControlButton({ icon, onClick, className }: { icon: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95",
        className
      )}
    >
      {icon}
    </button>
  );
}
