import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Phone, LogOut, Settings, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

export default function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { logOut, profile } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logOut();
    navigate("/");
  };

  if (!profile) return null;

  return (
    <div className="fixed top-4 right-4 z-[60]" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-700 transition-all shadow-xl"
      >
        <MoreVertical className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-14 right-0 w-56 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden py-2"
          >
            <div className="px-4 py-3 border-b border-neutral-800 mb-2">
               <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest mb-1 leading-none">Signed in as</p>
               <p className="font-bold text-sm text-neutral-200 truncate">{profile.fullName}</p>
            </div>

            <MenuItem 
              icon={<Phone className="w-4 h-4" />} 
              label="Call History" 
              onClick={() => { navigate("/calls"); setIsOpen(false); }} 
            />
            
            <MenuItem 
              icon={<User className="w-4 h-4" />} 
              label="Profile Settings" 
              onClick={() => { navigate("/profile"); setIsOpen(false); }} 
            />

            <div className="h-px bg-neutral-800 my-2 mx-4" />

            <MenuItem 
              icon={<LogOut className="w-4 h-4" />} 
              label="Log Out" 
              className="text-red-400 hover:bg-red-400/10"
              onClick={handleLogout} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, onClick, className }: { icon: React.ReactNode, label: string, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-all text-left",
        className
      )}
    >
      <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      {label}
    </button>
  );
}
