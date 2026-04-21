import React from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import { MessageSquare, Shield, Zap, Globe } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-radial-[circle_at_50%_50%] from-blue-900/10 via-transparent to-transparent" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-12"
      >
        <div className="w-24 h-24 relative mx-auto mb-8">
          <div className="absolute inset-0 bg-blue-600 rounded-[2rem] rotate-6 opacity-20 blur-xl animate-pulse" />
          <div className="relative w-full h-full bg-neutral-900 border border-neutral-800 rounded-[2rem] flex items-center justify-center shadow-2xl group transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-[2rem]" />
            <Zap className="w-12 h-12 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
        </div>
        
        <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-blue-500 mb-3 animate-fade-in">
          Fast. Simple. Secure Messaging
        </p>
        <h1 className="text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500 italic uppercase">
          Login to your account
        </h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass p-8 rounded-[2rem] w-full max-w-md shadow-2xl"
      >
        <button 
          onClick={signIn}
          className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all active:scale-95 group"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <div className="grid grid-cols-1 gap-6 mt-10">
          <Feature icon={<Shield className="w-5 h-5 text-blue-500" />} title="End-to-End Encryption" desc="Your conversations stay between you and your friends." />
          <Feature icon={<Zap className="w-5 h-5 text-yellow-500" />} title="Real-Time Performance" desc="Zero latency messaging and high-quality voice/video." />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 flex items-center gap-2 px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full"
      >
        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shadow-[0_0_10px_rgba(37,211,102,0.3)]">
          <MessageSquare className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="text-neutral-400 font-mono text-sm tracking-tighter">+8801857041172</span>
      </motion.div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700/50">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-sm text-neutral-200">{title}</h3>
        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
