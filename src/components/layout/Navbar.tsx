import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MessageSquare, Search, User, LogOut, Users, Globe } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

export default function Navbar() {
  const { logOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logOut();
    navigate("/");
  };

  if (!profile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-auto lg:w-20 bg-neutral-900 border-t lg:border-t-0 lg:border-r border-neutral-800 z-50 flex lg:flex-col items-center justify-between p-1 lg:p-4 px-2 lg:px-2">
      <div className="hidden lg:block mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-display font-bold text-xl drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          V
        </div>
      </div>

      <div className="flex lg:flex-col gap-1 lg:gap-4 flex-1 justify-around lg:justify-start items-center w-full">
        <NavItem to="/" icon={<MessageSquare className="w-6 h-6" />} label="Chats" />
        <NavItem to="/world" icon={<Globe className="w-6 h-6" />} label="World" />
        <NavItem to="/friends" icon={<Users className="w-6 h-6" />} label="Friends" />
        <NavItem to="/search" icon={<Search className="w-6 h-6" />} label="Search" />
        <NavItem to="/profile" icon={<User className="w-6 h-6" />} label="Profile" />
      </div>

      <div className="hidden lg:flex lg:flex-col gap-4 items-center">
        <button 
          onClick={handleLogout}
          className="p-3 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"
        >
          <LogOut className="w-6 h-6" />
        </button>
        <img 
          src={profile.photoURL} 
          alt="Profile" 
          className="w-10 h-10 rounded-xl object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    </nav>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "p-2 lg:p-3 rounded-2xl transition-all flex flex-col items-center gap-1 lg:gap-0",
        isActive ? "bg-blue-600/10 text-blue-500" : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
      )}
    >
      {icon}
      <span className="text-[9px] uppercase font-bold tracking-tighter lg:hidden">{label}</span>
    </NavLink>
  );
}
