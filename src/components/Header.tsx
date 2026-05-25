/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { CryptoPair } from "../types";
import { TrendingUp, RefreshCw, Layers, ShieldCheck, Zap, User, LogIn, LogOut, ChevronDown, Shield, Home, Bug, Copy, Check, Sun, Moon, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  isTickingAll: boolean;
  onToggleTicking: () => void;
  connectionStatus: "connected" | "syncing" | "stale";
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  onOpenAdmin?: () => void;
  language: "RU" | "EN" | "KZ";
  onLanguageChange: (lang: "RU" | "EN" | "KZ") => void;
}

export default function Header({
  isTickingAll,
  onToggleTicking,
  connectionStatus,
  theme = "dark",
  onToggleTheme,
  onOpenAdmin,
  language,
  onLanguageChange
}: HeaderProps) {
  
  const isLight = theme === "light";
  // Real-time simulated authorized profile state matching email/name from request
  const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>({
    name: "Lynat1k",
    email: "xxLynat1kxx@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Custom inputs for login inside clean modal
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");

  const [copied, setCopied] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      name: loginName.trim() || "Lynat1k",
      email: loginEmail.trim() || "xxLynat1kxx@gmail.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    });
    setLoginName("");
    setLoginEmail("");
    setShowLoginModal(false);
  };

  // Custom stenciled PROCLUSTER SVG Logo - pure vector, razor-sharp, perfectly transparent
  const Logo = () => (
    <div className="flex items-center select-none">
      <svg
        viewBox="0 0 210 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[44px] sm:h-[48px] w-auto drop-shadow-[0_2px_12px_rgba(234,179,8,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
      >
        <defs>
          {/* Pro orange/yellow solid color */}
          <linearGradient id="proGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          
          {/* Custom Mask to introduce horizontal stencil gaps exactly matching the logo design */}
          <mask id="stencilMask">
            <rect x="0" y="0" width="210" height="38" fill="#FFFFFF" />
            {/* Horizontal gaps for the authentic stencil font slits */}
            <rect x="35" y="15" width="175" height="1.75" fill="#000000" />
            <rect x="35" y="24" width="175" height="1.0" fill="#000000" />
          </mask>
        </defs>

        {/* 1. Icon Section: 4 Trading Bars (Green, Red, Green, Green) */}
        {/* Bar 1: Green */}
        <rect x="4" y="25" width="4.5" height="9" rx="1.2" fill="#10B981" />
        {/* Bar 2: Red */}
        <rect x="11" y="19" width="4.5" height="15" rx="1.2" fill="#EF4444" />
        {/* Bar 3: Green */}
        <rect x="18" y="13" width="4.5" height="21" rx="1.2" fill="#10B981" />
        {/* Bar 4: Green */}
        <rect x="25" y="7" width="4.5" height="27" rx="1.2" fill="#10B981" />

        {/* Curve overlays the bars */}
        <path
          d="M 1 27 Q 13 19 29 10"
          stroke={isLight ? "#0f172a" : "#FFFFFF"}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrow pointer head matching image */}
        <path
          d="M 23 9 L 31 8 L 28 16 Z"
          fill={isLight ? "#0f172a" : "#FFFFFF"}
        />

        {/* 2. Text Section with mask for stencil cut gaps */}
        <g mask="url(#stencilMask)">
          {/* PRO text in bold golden/orange */}
          <text
            x="38"
            y="28"
            fill="url(#proGradient)"
            fontFamily="'Space Grotesk', 'Inter', system-ui, sans-serif"
            fontWeight="900"
            fontSize="23"
            letterSpacing="0.04em"
            className="select-none"
          >
            PRO
          </text>
          
          {/* CLUSTER text in white stenciled outline */}
          <text
            x="92"
            y="28"
            fill="none"
            stroke={isLight ? "#0f172a" : "#FFFFFF"}
            strokeWidth="1.25"
            fontFamily="'Space Grotesk', 'Inter', system-ui, sans-serif"
            fontWeight="300"
            fontSize="23"
            letterSpacing="0.04em"
            className="select-none"
            strokeOpacity="0.95"
          >
            CLUSTER
          </text>
        </g>
      </svg>
    </div>
  );

  return (
    <header className={`border-b px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-50 sticky top-0 transition-all duration-300 relative ${
      isLight ? "border-slate-200 shadow-sm" : "border-white/10 shadow-2xl"
    }`}>
      {/* Background layer decoupled to avoid nested backdrop-filter browser rendering conflicts */}
      <div className={`absolute inset-0 z-0 pointer-events-none rounded-none transition-all duration-300 ${
        isLight ? "bg-white/85 backdrop-blur-md" : "bg-slate-950/45 backdrop-blur-md"
      }`} />

      <div className="flex items-center gap-8 relative z-10">
        <Logo />
      </div>

      {/* Right Controls: Simple & Clean Authorized Profile / Login Section */}
      <div className="flex items-center gap-3 relative z-10" ref={dropdownRef}>
        {/* ADMIN MODAL TRIGGER */}
        <button
          onClick={onOpenAdmin}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs font-bold leading-none select-none ${
            isLight
              ? "bg-red-50 hover:bg-red-100 border-red-150 text-red-700 shadow-sm"
              : "bg-red-950/20 hover:bg-red-900/40 border-red-900/30 text-red-400 shadow-inner hover:text-red-300"
          }`}
          title={language === "EN" ? "Admin Panel" : language === "KZ" ? "Әкімшілік панелі" : "Панель администратора"}
        >
          <Sliders className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">
            {language === "EN" ? "Admin" : language === "KZ" ? "Әкімшілік" : "Админка"}
          </span>
        </button>

        {/* LIGHT/DARK THEME TOGGLE BUTTON right next to the profile chip */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
            isLight
              ? "bg-slate-150 hover:bg-slate-200 border-slate-250 text-slate-800 shadow-sm"
              : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5 text-yellow-400 hover:text-yellow-300 shadow-inner"
          }`}
          title={isLight 
            ? language === "EN" ? "Enable Dark Theme" : language === "KZ" ? "Түнгі режим" : "Включить темную тему"
            : language === "EN" ? "Enable Light Theme" : language === "KZ" ? "Күндізгі режим" : "Включить светлую тему"
          }
        >
          {isLight ? (
            <Moon className="w-4 h-4 text-slate-700 font-bold" />
          ) : (
            <Sun className="w-4 h-4 text-yellow-500 fill-yellow-500/10" />
          )}
        </button>

        {user ? (
          // USER IS LOGGED IN: Beautiful glassy profile chip
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer border shadow-inner hover:scale-[1.01] active:scale-[0.99] ${
                isLight
                  ? "border-slate-200 bg-slate-100 hover:bg-slate-200/80"
                  : "border-white/5 bg-slate-950/40 hover:bg-slate-900/60"
              }`}
            >
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className={`w-6 h-6 rounded-lg object-cover select-none shadow border ${
                  isLight ? "border-slate-300" : "border-white/25"
                }`}
              />
              <div className="text-left hidden sm:block">
                <div className={`text-[11px] font-sans font-black leading-tight ${
                  isLight ? "text-slate-850" : "text-slate-200"
                }`}>
                  {user.name}
                </div>
                <div className={`text-[9px] font-mono leading-none ${
                  isLight ? "text-slate-500 font-semibold" : "text-slate-400"
                }`}>
                  PRO MEMBER
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isLight ? "text-slate-600" : "text-slate-450"
              } ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`absolute right-0 mt-2.5 w-64 rounded-[28px] p-5 z-[99] text-left select-none font-sans transition-all border ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-800 shadow-2xl"
                      : "muddy-glass-popover text-slate-100"
                  }`}
                >
                  {/* User Profile Header section */}
                  <div className={`flex items-center gap-3.5 pb-4 mb-4 border-b ${
                    isLight ? "border-slate-100" : "border-white/5"
                  }`}>
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className={`w-11 h-11 rounded-full object-cover border-2 shadow-sm ${
                        isLight ? "border-slate-200" : "border-white/10"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className={`text-[14px] font-black flex items-center gap-1.5 leading-none ${
                        isLight ? "text-slate-800" : "text-slate-100"
                      }`}>
                        {user.name.toLowerCase()}
                      </div>
                      <div className={`text-[10px] font-mono mt-1 leading-none truncate ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {user.email.toLowerCase()}
                      </div>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-1">
                    <button className={`flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-bold cursor-pointer transition text-left ${
                      isLight ? "text-slate-650 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}>
                      <User className="w-4 h-4 text-slate-450" />
                      <span>{language === "EN" ? "Profile & avatar" : language === "KZ" ? "Профиль және аватар" : "Профиль и аватар"}</span>
                    </button>

                    <button className={`flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-bold cursor-pointer transition text-left ${
                      isLight ? "text-slate-650 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}>
                      <Home className="w-4 h-4 text-slate-455" />
                      <span>{language === "EN" ? "Home" : language === "KZ" ? "Басты бет" : "Главная"}</span>
                    </button>

                    <button className={`flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-bold cursor-pointer transition text-left ${
                      isLight ? "text-slate-650 hover:bg-red-50 hover:text-rose-600" : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}>
                      <Bug className="w-4 h-4 text-rose-450" />
                      <span>{language === "EN" ? "Found an error?" : language === "KZ" ? "Қате таптыңыз ба?" : "Нашли ошибку?"}</span>
                    </button>

                    {/* Copyable Workspace Segment */}
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("7D53CEC5");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`flex items-center justify-between gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-mono font-bold cursor-pointer transition text-left ${
                        isLight ? "text-slate-550 hover:text-slate-850 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Copy className="w-4 h-4 text-slate-450" />
                        <span className={`tracking-wider text-[11px] ${isLight ? "text-slate-700" : "text-slate-300"}`}>7D53CEC5</span>
                      </div>
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className={`text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border ${
                          isLight ? "bg-slate-150 border-slate-200 text-slate-600" : "bg-white/5 border-white/5 text-slate-500"
                        }`}>
                          {language === "EN" ? "COPY" : language === "KZ" ? "КӨШІРУ" : "КОПИРОВАТЬ"}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Language selection block */}
                  <div className={`mt-4 pt-3.5 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                    <span className={`text-[9px] font-mono font-extrabold tracking-widest uppercase block mb-2 px-1 ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {language === "EN" ? "LANGUAGE" : language === "KZ" ? "ТІЛ" : "ЯЗЫК"}
                    </span>
                    <div className={`grid grid-cols-3 gap-1.5 p-[3px] rounded-2xl border shadow-inner ${
                      isLight ? "bg-slate-100/80 border-slate-200/50" : "bg-slate-950/60 border-white/5"
                    }`}>
                      {["RU", "EN", "KZ"].map((lang) => {
                        const isSelected = language === lang;
                        return (
                          <button
                            key={lang}
                            onClick={() => onLanguageChange(lang as any)}
                            className="py-1.5 rounded-xl text-[10.5px] font-bold font-mono cursor-pointer text-center relative border-0 outline-none"
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="activeLanguage"
                                className={`absolute inset-0 rounded-xl ${
                                  isLight 
                                    ? "bg-slate-100 border border-slate-250 shadow-sm"
                                    : "bg-slate-800 border border-white/10 shadow-md"
                                }`}
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                style={{ zIndex: 0 }}
                              />
                            )}
                            <span className={`relative z-10 transition-colors duration-200 ${
                              isSelected
                                ? isLight ? "text-slate-900 font-extrabold" : "text-white font-extrabold"
                                : isLight ? "text-slate-505 hover:text-slate-800 text-slate-500" : "text-slate-450 hover:text-slate-205 text-slate-400 hover:text-slate-200"
                            }`}>
                              {lang}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Exiting separator */}
                  <div className={`mt-4 pt-3 border-t text-left ${isLight ? "border-slate-100" : "border-white/5"}`}>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setUser(null);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50/55 cursor-pointer transition duration-150 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{language === "EN" ? "Logout" : language === "KZ" ? "Шығу" : "Выйти"}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // USER IS NOT LOGGED IN: Beautiful glassy Sign In Button
          <button
            onClick={() => setShowLoginModal(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer text-yellow-500 hover:scale-[1.02] active:scale-[0.98] transition-all border ${
              isLight ? "bg-amber-50 hover:bg-amber-100 border-amber-200" : "liquid-glass-active"
            }`}
          >
            <LogIn className="w-4 h-4 text-yellow-500" />
            Sign In
          </button>
        )}
      </div>

      {/* Glassy Login Modal overlay */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Blur screen shadow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-[#020617]/75 backdrop-blur-md"
            />

            {/* Modal Body with deep glassy premium design */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[24px] muddy-glass-popover p-6"
            >
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 mb-3 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-100 tracking-tight leading-none mb-1.5 uppercase">
                  Terminal Authorization
                </h3>
                <p className="text-[10px] text-slate-400 leading-snug font-medium max-w-[240px] mx-auto">
                  Sign in to save custom limit orders and sync footprint layouts across devices.
                </p>
              </div>

              <form onSubmit={handleMockLogin} className="flex flex-col gap-4 font-sans text-xs">
                <div>
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lynat1k"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none transition font-bold"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. xxLynat1kxx@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none transition font-bold font-mono"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 liquid-glass-button text-slate-300 hover:text-white py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 liquid-glass-gold-button text-slate-900 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide cursor-pointer transition"
                  >
                    Authorize
                  </button>
                </div>
              </form>

              {/* Quick Preset Buttons for hassle-free login */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-2">
                <span className="text-[8px] font-mono font-bold text-slate-400/80 tracking-widest uppercase block text-center mb-1">
                  Or Instant Authorization
                </span>
                <button
                  onClick={() => {
                    setUser({
                      name: "Lynat1k",
                      email: "xxLynat1kxx@gmail.com",
                      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                    });
                    setShowLoginModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] text-slate-200 font-bold border border-white/5 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" /> Auto-login as xxLynat1kxx@gmail.com
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
