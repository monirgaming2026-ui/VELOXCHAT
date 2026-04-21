import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap } from "lucide-react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 relative mb-8">
              <div className="absolute inset-0 bg-blue-600 rounded-[2rem] rotate-6 opacity-20 blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-neutral-900 border border-neutral-800 rounded-[2rem] flex items-center justify-center shadow-2xl">
                <Zap className="w-12 h-12 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              </div>
            </div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-display font-bold tracking-tighter italic uppercase text-white"
            >
              VeloxChat
            </motion.h1>
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 1.5 }}
              className="h-0.5 bg-blue-600 mt-4 overflow-hidden rounded-full w-48"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
