/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { CryptoPair } from "../types";
import { TrendingUp, RefreshCw, Layers, ShieldCheck, Zap, User, LogIn, LogOut, ChevronDown, Shield, Home, Bug, Copy, Check, Sun, Moon, Sliders, HelpCircle, Send, Youtube, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { authTexts, headerUiTexts } from "../i18n/header";
import { 
  getCurrentUser, 
  seedAdminAccount, 
  loginUser, 
  registerUser, 
  authenticateWithGoogle, 
  authenticateWithAdmin, 
  logoutUser,
  AuthUser
} from "../auth/mockAuth";

interface HeaderProps {
  isTickingAll: boolean;
  onToggleTicking: () => void;
  connectionStatus: "connected" | "syncing" | "stale";
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  onOpenAdmin?: () => void;
  language: "RU" | "EN" | "KZ";
  onLanguageChange: (lang: "RU" | "EN" | "KZ") => void;
  userRole: "Guest" | "Free" | "Pro" | "VIP" | "Admin";
  onChangeUserRole: (role: "Guest" | "Free" | "Pro" | "VIP" | "Admin") => void;
  onOpenProfile?: () => void;
  onOpenHome?: () => void;
  onOpenRoadmap?: () => void;
  onToggleMobileSettings?: () => void;
  isMobileSettingsOpen?: boolean;
  activeMobileTab?: "chart" | "dom";
  setActiveMobileTab?: (tab: "chart" | "dom") => void;
  isAdminView?: boolean;
}

export default function Header({
  isTickingAll,
  onToggleTicking,
  connectionStatus,
  theme = "dark",
  onToggleTheme,
  onOpenAdmin,
  language,
  onLanguageChange,
  userRole,
  onChangeUserRole,
  onOpenProfile,
  onOpenHome,
  onOpenRoadmap,
  onToggleMobileSettings,
  isMobileSettingsOpen = false,
  activeMobileTab,
  setActiveMobileTab,
  isAdminView = false
}: HeaderProps) {
  
  const isLight = theme === "light";
  
  // Real-time simulated authorized profile state matching email/name from request, loading from localStorage
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());

  // Listen for external profile updates from local storage or profile page
  useEffect(() => {
    const handleUpdate = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener("procluster_user_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("procluster_user_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(0);
  
  // Custom inputs for login inside clean modal
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");

  const [copied, setCopied] = useState(false);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileLangOpen, setIsMobileLangOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const mobileLangDropdownRef = useRef<HTMLDivElement>(null);

  // Seed default admin account on startup so the user can test login immediately
  useEffect(() => {
    seedAdminAccount();
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (mobileLangDropdownRef.current && !mobileLangDropdownRef.current.contains(event.target as Node)) {
        setIsMobileLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync logout
  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setDropdownOpen(false);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    const langTexts = authTexts[language] || authTexts.EN;

    if (authTab === "login") {
      const result = loginUser(loginName, loginPassword, langTexts);
      if (result.success && result.user) {
        setUser(result.user);
        setShowLoginModal(false);
        // Clear fields
        setLoginName("");
        setLoginPassword("");
        setLoginEmail("");
        setConfirmPassword("");
      } else {
        setAuthError(result.error || "");
      }
    } else {
      const result = registerUser(loginName, loginEmail, loginPassword, confirmPassword, langTexts);
      if (result.success && result.user) {
        setUser(result.user);
        setShowLoginModal(false);
        // Clear fields
        setLoginName("");
        setLoginPassword("");
        setLoginEmail("");
        setConfirmPassword("");
      } else {
        setAuthError(result.error || "");
      }
    }
  };

  // Google Authentication Simulation with primary email
  const handleGoogleAuth = () => {
    const gUser = authenticateWithGoogle();
    setUser(gUser);
    setShowLoginModal(false);
  };

  // Custom stenciled PROCLUSTER Logo - responsive Vector SVG / Typography design
  const Logo = () => (
    <div className="flex items-center gap-1.5 sm:gap-3 select-none cursor-pointer group hover:opacity-95 transition-all duration-200" title="ProCluster">
      {/* Visual Identity Icon Frame */}
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-md scale-100 group-hover:scale-105 active:scale-95 transition-all duration-200 ${
        isLight ? "shadow-amber-600/10" : "shadow-amber-500/15"
      }`}>
        <Layers className="text-slate-950 stroke-[2.5]" style={{ width: "17px", height: "17px" }} />
      </div>
      <div className="hidden sm:flex flex-col text-left leading-none">
        <span className="text-sm sm:text-lg font-black tracking-tight leading-none font-sans">
          <span className={isLight ? "text-slate-900" : "text-white"}>PRO</span>
          <span className={isLight ? "text-amber-600" : "text-amber-400"}>CLUSTER</span>
        </span>
        <span className={`text-[7px] sm:text-[9px] font-mono tracking-widest font-bold uppercase leading-none mt-0.5 sm:mt-1.5 ${
          isLight ? "text-slate-500" : "text-slate-400"
        }`}>
          Cluster Analytics
        </span>
      </div>
    </div>
  );

  return (
    <header className={`border-b px-2 py-2 sm:px-6 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 lg:gap-4 z-50 sticky top-0 transition-all duration-300 relative ${
      isLight ? "border-slate-300 shadow-md shadow-slate-200/10" : "border-white/10 shadow-2xl"
    }`}>
      {/* Background layer decoupled to avoid nested backdrop-filter browser rendering conflicts */}
      <div className={`absolute inset-0 z-0 pointer-events-none rounded-none transition-all duration-300 ${
        isLight ? "bg-slate-100" : "bg-slate-950/45 backdrop-blur-md"
      }`} />

      {/* MOBILE FIRST ROW: Logo (left), Right controls: Theme, Profile, Admin | DESKTOP LEFT COLS */}
      <div className="flex w-full lg:w-auto items-center justify-between gap-2 relative z-10">
        <Logo />

        {/* Mobile Right Controls: Theme, Profile, Admin */}
        <div className="flex lg:hidden items-center gap-1.5" ref={dropdownRef}>
          {/* LIGHT/DARK THEME TOGGLE BUTTON */}
          <button
            onClick={onToggleTheme}
            className={`flex items-center justify-center p-1.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
              isLight
                ? "bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
                : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5 text-yellow-400 hover:text-yellow-300 shadow-inner"
            }`}
            title={isLight 
              ? headerUiTexts[language].enableDarkTheme
              : headerUiTexts[language].enableLightTheme
            }
          >
            {isLight ? (
              <Moon className="w-3.5 h-3.5 text-slate-705 font-bold" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/10" />
            )}
          </button>

          {/* MOBILE LANGUAGE SWITCHER DROPDOWN */}
          <div className="relative" ref={mobileLangDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileLangOpen(!isMobileLangOpen);
              }}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-[10px] font-mono font-bold ${
                isLight
                  ? "bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
                  : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5 text-slate-300 hover:text-white shadow-inner"
              }`}
            >
              <Globe className="w-3 h-3 text-slate-500 hover:text-slate-400" />
              <span>{language}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isMobileLangOpen ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {isMobileLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 mt-1.5 w-24 rounded-xl border shadow-lg overflow-hidden z-50 ${
                    isLight
                      ? "bg-white border-slate-200"
                      : "bg-[#0c0f1d] border-white/10"
                  }`}
                >
                  <div className="p-1 flex flex-col gap-0.5">
                    {(["RU", "EN", "KZ"] as const).map((lang) => {
                      const isSelected = language === lang;
                      return (
                        <button
                          key={lang}
                          onClick={() => {
                            onLanguageChange(lang);
                            setIsMobileLangOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors border-0 outline-none cursor-pointer ${
                            isSelected
                              ? isLight
                                ? "bg-slate-100 text-slate-900 font-extrabold"
                                : "bg-white/10 text-white font-extrabold"
                              : isLight
                                ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PROFILE / SIGN IN BUTTONS */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1 p-1 rounded-xl transition-all duration-200 cursor-pointer border shadow-inner ${
                  isLight
                    ? "border-slate-200 bg-slate-100 hover:bg-slate-200/80"
                    : "border-white/5 bg-slate-950/40 hover:bg-slate-900/60"
                }`}
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className={`w-6 h-6 rounded-lg object-cover select-none border ${
                    isLight ? "border-slate-300" : "border-white/25"
                  }`}
                />
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                  isLight ? "text-slate-700" : "text-slate-400"
                } ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`absolute right-0 mt-2 w-60 rounded-[20px] p-4 z-[99] text-left select-none font-sans border shadow-2xl ${
                      isLight
                        ? "bg-white border-slate-200 text-slate-800"
                        : "muddy-glass-popover text-slate-100"
                    }`}
                  >
                    <div className={`flex items-center gap-2.5 pb-3 mb-3 border-b ${
                      isLight ? "border-slate-100" : "border-white/5"
                    }`}>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                        className={`w-8 h-8 rounded-full object-cover border shadow-sm ${
                          isLight ? "border-slate-200" : "border-white/10"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className={`text-[12px] font-black leading-none ${
                          isLight ? "text-slate-800" : "text-slate-100"
                        }`}>
                          {user.name.toLowerCase()}
                        </div>
                        <div className={`text-[9px] font-mono mt-1 leading-none truncate ${
                          isLight ? "text-slate-505" : "text-slate-400"
                        }`}>
                          {user.email.toLowerCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenProfile) onOpenProfile();
                        }}
                        className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition text-left ${
                        isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}>
                        <User className="w-3.5 h-3.5 text-slate-505" />
                        <span>{headerUiTexts[language].profileAvatar}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onOpenHome) onOpenHome();
                        }}
                        className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition text-left ${
                        isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}>
                        <Home className="w-3.5 h-3.5 text-slate-505" />
                        <span>{headerUiTexts[language].home}</span>
                      </button>

                      <button 
                        onClick={() => {
                          setDropdownOpen(false);
                          setShowFaqModal(true);
                        }}
                        className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition text-left ${
                          isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                        <span>FAQ</span>
                      </button>

                      <div className={`my-1 border-t ${isLight ? "border-slate-100" : "border-white/5"}`} />
                      <div className="flex items-center justify-around gap-2 px-1 py-1">
                        <a 
                          href="https://t.me/your_telegram_channel" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-1.5 flex-1 py-1 rounded-lg text-[9.5px] font-bold transition ${
                            isLight ? "text-sky-600 hover:bg-sky-50 bg-sky-50/30" : "text-sky-400 hover:bg-[#0284c7]/10 bg-sky-500/5"
                          }`}
                        >
                          <Send className="w-3 h-3 hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform" />
                          <span>Telegram</span>
                        </a>
                        <a 
                          href="https://youtube.com/@your_youtube_channel" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center justify-center gap-1.5 flex-1 py-1 rounded-lg text-[9.5px] font-bold transition ${
                            isLight ? "text-red-600 hover:bg-red-50 bg-red-50/30" : "text-red-400 hover:bg-[#dc2626]/10 bg-red-500/5"
                          }`}
                        >
                          <Youtube className="w-3 h-3 hover:scale-110 transition-transform" />
                          <span>YouTube</span>
                        </a>
                      </div>
                    </div>



                    <div className={`mt-3 pt-3 border-t text-left ${isLight ? "border-slate-100" : "border-white/5"}`}>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-505/5 cursor-pointer transition text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{headerUiTexts[language].logout}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthError("");
                setAuthTab("login");
                setShowLoginModal(true);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border font-bold text-[10px] uppercase tracking-wide cursor-pointer transition select-none ${
                isLight
                  ? "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900 shadow-sm"
                  : "bg-yellow-500/10 hover:bg-yellow-500/15 border-yellow-500/20 text-yellow-500"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-yellow-500" />
              <span>Sign In</span>
            </button>
          )}

          {/* ADMIN TRIGGER */}
          {user && (user.name === "Admin" || user.email === "admin@procluster.io") && (
            <button
              onClick={onOpenAdmin}
              className={`flex items-center justify-center p-1.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-[10px] font-bold ${
                isLight
                  ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700 shadow-sm"
                  : "bg-red-950/20 hover:bg-red-900/40 border-red-900/30 text-red-400 shadow-inner"
              }`}
              title={headerUiTexts[language].adminPanelTooltip}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MID SECTION FOR DESKTOP ONLY: BETA Badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:flex items-center">
        <button
          onClick={onOpenRoadmap}
          className={`px-3 py-1 rounded-full border text-[9.5px] font-extrabold uppercase tracking-widest cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-97 select-none ${
            isLight
              ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 shadow-sm"
              : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 shadow-sm"
          }`}
          title={headerUiTexts[language].roadmapTooltip}
        >
          <span>BETA</span>
        </button>
      </div>

      {/* MOBILE SECOND ROW: Settings Toggle button on the left, Chart & DOM switch on the right */}
      {!isAdminView && activeMobileTab && setActiveMobileTab && (
        <div className="flex lg:hidden w-full items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200/50 dark:border-white/5 relative z-10">
          {/* Settings Trigger for Mobile */}
          <button
            onClick={onToggleMobileSettings}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all duration-200 select-none ${
              isMobileSettingsOpen
                ? "bg-yellow-500 text-slate-955 border-yellow-500 shadow-sm font-black"
                : isLight
                  ? "bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-amber-700 shadow-xs"
                  : "bg-yellow-500/10 hover:bg-yellow-500/15 border-yellow-500/20 text-yellow-400 shadow-inner"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>
              {language === "RU" ? "Настройки" : language === "KZ" ? "Реттеу" : "Params"}
            </span>
          </button>

          {/* Chart & DOM Switcher */}
          <div className={`flex items-center p-0.5 rounded-lg border text-[10px] font-bold select-none gap-0.5 transition-all duration-300 ${
            isLight ? "bg-slate-100 border-slate-300/60" : "bg-slate-900/60 border-white/5"
          }`}>
            <button
              onClick={() => setActiveMobileTab("chart")}
              className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                activeMobileTab === "chart"
                  ? isLight
                    ? "bg-white text-slate-900 border border-slate-300/80 shadow-xs font-black"
                    : "bg-yellow-500/25 border border-yellow-500/30 text-yellow-500 font-extrabold"
                  : isLight
                    ? "text-slate-500 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>📊</span>
              <span className="font-bold">
                {language === "RU" ? "ГРАФИК" : language === "KZ" ? "ГРАФИКА" : "CHART"}
              </span>
            </button>
            <button
              onClick={() => setActiveMobileTab("dom")}
              className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                activeMobileTab === "dom"
                  ? isLight
                    ? "bg-white text-slate-900 border border-slate-300/80 shadow-xs font-black"
                    : "bg-yellow-500/25 border border-yellow-500/30 text-yellow-500 font-extrabold"
                  : isLight
                    ? "text-slate-550 hover:text-slate-900"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>🧱</span>
              <span className="font-bold">
                {language === "RU" ? "СТАКАН" : language === "KZ" ? "СТАКАН" : "DOM"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP RIGHTS PANEL (Hidden on Mobile) */}
      <div className="hidden lg:flex items-center gap-1.5 sm:gap-3 relative z-10" ref={dropdownRef}>
        {/* ADMIN MODAL TRIGGER (Desktop) */}
        {user && (user.name === "Admin" || user.email === "admin@procluster.io") && (
          <button
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs font-bold leading-none select-none ${
              isLight
                ? "bg-red-50 hover:bg-red-105 border-red-200 text-red-700 shadow-sm"
                : "bg-red-950/20 hover:bg-red-900/40 border-red-900/30 text-red-400 shadow-inner hover:text-red-300"
            }`}
            title={headerUiTexts[language].adminPanelTooltip}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="inline">
              {headerUiTexts[language].adminLabel}
            </span>
          </button>
        )}

        {/* LIGHT/DARK THEME TOGGLE BUTTON (Desktop) */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
            isLight
              ? "bg-slate-205 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
              : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5 text-yellow-400 hover:text-yellow-300 shadow-inner"
          }`}
          title={isLight 
            ? headerUiTexts[language].enableDarkTheme
            : headerUiTexts[language].enableLightTheme
          }
        >
          {isLight ? (
            <Moon className="w-4 h-4 text-slate-700 font-bold" />
          ) : (
            <Sun className="w-4 h-4 text-yellow-500 fill-yellow-500/10" />
          )}
        </button>

        {/* LANGUAGE SWITCHER DROPDOWN (Desktop) */}
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs font-mono font-bold ${
              isLight
                ? "bg-slate-205 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
                : "bg-slate-950/40 hover:bg-slate-900/60 border-white/5 text-slate-300 hover:text-white shadow-inner"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
            <span>{language}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isLangOpen ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {isLangOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-1.5 w-24 rounded-xl border shadow-lg overflow-hidden z-50 ${
                  isLight
                    ? "bg-white border-slate-200"
                    : "bg-[#0c0f1d] border-white/10"
                }`}
              >
                <div className="p-1 flex flex-col gap-0.5">
                  {(["RU", "EN", "KZ"] as const).map((lang) => {
                    const isSelected = language === lang;
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          onLanguageChange(lang);
                          setIsLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors border-0 outline-none cursor-pointer ${
                          isSelected
                            ? isLight
                              ? "bg-slate-100 text-slate-900 font-extrabold"
                              : "bg-white/10 text-white font-extrabold"
                            : isLight
                              ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {lang === "RU" ? "RU" : lang === "EN" ? "EN" : "KZ"}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user ? (
          // USER IS LOGGED IN (Desktop)
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 rounded-xl transition-all duration-200 cursor-pointer border shadow-inner hover:scale-[1.01] active:scale-[0.99] ${
                isLight
                  ? "border-slate-300 bg-slate-200 hover:bg-slate-300"
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
              <div className="text-left hidden md:block">
                <div className={`text-[11px] font-sans font-black leading-tight ${
                  isLight ? "text-slate-900" : "text-slate-200"
                }`}>
                  {user.name}
                </div>
                <div className={`text-[9px] font-mono leading-none ${
                  isLight ? "text-slate-600 font-bold" : "text-slate-400"
                }`}>
                  PRO MEMBER
                </div>
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                isLight ? "text-slate-700" : "text-slate-400"
              } ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu (Desktop) */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`absolute right-0 mt-2.5 w-64 rounded-[28px] p-5 z-[99] text-left select-none font-sans border ${
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
                        isLight ? "border-slate-205" : "border-white/10"
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
                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-bold cursor-pointer transition text-left ${
                      isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}>
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{headerUiTexts[language].profileAvatar}</span>
                    </button>

                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onOpenHome) onOpenHome();
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-bold cursor-pointer transition text-left ${
                      isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}>
                      <Home className="w-4 h-4 text-slate-500" />
                      <span>{headerUiTexts[language].home}</span>
                    </button>

                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        setShowFaqModal(true);
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[12px] font-bold cursor-pointer transition text-left ${
                        isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}>
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                      <span>FAQ</span>
                    </button>

                    <div className={`my-1.5 border-t ${isLight ? "border-slate-100" : "border-white/5"}`} />
                    <div className="flex items-center justify-around gap-2 px-1">
                      <a 
                        href="https://t.me/your_telegram_channel" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 flex-1 py-1.5 rounded-xl text-[10.5px] font-bold transition ${
                          isLight ? "text-sky-600 hover:bg-sky-50 bg-sky-50/30" : "text-sky-400 hover:bg-[#0284c7]/10 bg-sky-500/5"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform" />
                        <span>Telegram</span>
                      </a>
                      <a 
                        href="https://youtube.com/@your_youtube_channel" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 flex-1 py-1.5 rounded-xl text-[10.5px] font-bold transition ${
                          isLight ? "text-red-600 hover:bg-red-50 bg-red-50/30" : "text-red-400 hover:bg-[#dc2626]/10 bg-red-500/5"
                        }`}
                      >
                        <Youtube className="w-3.5 h-3.5 hover:scale-110 transition-transform" />
                        <span>YouTube</span>
                      </a>
                    </div>
                  </div>



                  {userRole === "Admin" && (
                    <div className={`mt-4 pt-3.5 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                      <span className={`text-[9px] font-mono font-extrabold tracking-widest uppercase block mb-2 px-1 ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {headerUiTexts[language].subRole}
                      </span>
                      <div className={`grid ${
                        user && (user.name === "Admin" || user.email === "admin@procluster.io") ? "grid-cols-5" : "grid-cols-3"
                      } gap-1 p-[3px] rounded-2xl border shadow-inner ${
                        isLight ? "bg-slate-200 border-slate-300" : "bg-slate-950/60 border-white/5"
                      }`}>
                        {(user && (user.name === "Admin" || user.email === "admin@procluster.io") 
                          ? ["Guest", "Free", "Pro", "VIP", "Admin"] 
                          : ["Guest", "VIP", "Admin"]
                        ).map((roleOption) => {
                          const isSelected = userRole === roleOption;
                          let roleLabel = roleOption;
                          if (roleOption === "Guest") roleLabel = language === "RU" ? "Гость" : language === "KZ" ? "Қонақ" : "Guest";
                          if (roleOption === "Admin") roleLabel = language === "RU" ? "Админ" : language === "KZ" ? "Админ" : "Admin";
                          
                          return (
                            <button
                              key={roleOption}
                              onClick={() => onChangeUserRole(roleOption as any)}
                              className="py-1.5 rounded-xl text-[9px] font-black cursor-pointer text-center relative border-0 outline-none"
                            >
                              {isSelected && (
                                <motion.div
                                  layoutId="activeRole"
                                  className={`absolute inset-0 rounded-xl ${
                                    roleOption === "Admin"
                                      ? "bg-rose-500/25 border border-rose-500/35"
                                      : roleOption === "VIP"
                                        ? "bg-amber-500/25 border border-amber-500/35"
                                        : roleOption === "Pro"
                                          ? "bg-blue-500/25 border border-blue-500/35"
                                          : roleOption === "Free"
                                            ? "bg-slate-400/20 border border-slate-400/30"
                                            : "bg-purple-500/25 border border-purple-500/35"
                                  }`}
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                  style={{ zIndex: 0 }}
                                />
                              )}
                              <span className={`relative z-10 transition-colors duration-200 text-[8px] sm:text-[9.5px] font-bold ${
                                isSelected
                                  ? isLight ? "text-slate-900" : "text-white"
                                  : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"
                              }`}>
                                {roleLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className={`mt-4 pt-3.5 border-t ${isLight ? "border-slate-100" : "border-white/5"}`}>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50/55 cursor-pointer transition duration-150 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{headerUiTexts[language].logout}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => {
              setAuthError("");
              setAuthTab("login");
              setShowLoginModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer text-yellow-600 hover:scale-[1.02] active:scale-[0.98] transition-all border liquid-glass-active"
          >
            <LogIn className="w-4 h-4 text-yellow-500" />
            Sign In
          </button>
        )}
      </div>

      {/* Glassy Login Modal overlay adapted for dark/light themes */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Blur screen shadow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className={`absolute inset-0 backdrop-blur-md transition-opacity duration-300 ${
                isLight ? "bg-slate-900/30" : "bg-[#020617]/75"
              }`}
            />

            {/* Modal Body with deep glassy premium design, optimized for theme transparency */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-sm rounded-[24px] p-6 border transition-all duration-300 muddy-glass-popover ${
                isLight 
                  ? "border-slate-200/80 text-slate-900" 
                  : "border-white/5 text-slate-100"
              }`}
            >
              {/* Modal Header */}
              <div className="text-center mb-5">
                <div className={`inline-flex p-3 rounded-2xl mb-3 shadow-md ${
                  isLight 
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-600" 
                    : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <h3 className={`text-base font-black tracking-tight leading-none mb-1.5 uppercase ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}>
                  {(authTexts[language] || authTexts.EN).title}
                </h3>
                <p className={`text-[10px] leading-snug font-semibold max-w-[250px] mx-auto ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}>
                  {(authTexts[language] || authTexts.EN).subtitle}
                </p>
              </div>

              {/* Dynamic Tabs Indicator Selection */}
              <div className={`grid grid-cols-2 p-1 rounded-2xl border mb-5 ${
                isLight ? "bg-slate-200 border-slate-300" : "bg-slate-950/60 border-white/10"
              }`}>
                {(["login", "register"] as const).map((tab) => {
                  const isSelected = authTab === tab;
                  const label = tab === "login" 
                    ? (authTexts[language] || authTexts.EN).loginTab
                    : (authTexts[language] || authTexts.EN).registerTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setAuthError("");
                        setAuthTab(tab);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-black uppercase transition-all relative border-0 outline-none cursor-pointer ${
                        isSelected 
                          ? isLight 
                            ? "bg-white text-slate-900 border border-slate-300 shadow-sm" 
                            : "bg-yellow-500/10 border border-yellow-500/25 text-yellow-500"
                          : isLight 
                            ? "text-slate-600 hover:text-slate-900" 
                            : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Error messages block */}
              {authError && (
                <div className={`px-3 py-2.5 rounded-xl text-center text-[10px] font-black mb-4 border ${
                  isLight 
                    ? "bg-rose-50 border-rose-200 text-rose-700" 
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  {authError}
                </div>
              )}

              {/* Form implementation */}
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 font-sans text-xs">
                <div>
                  <label className={`text-[9px] font-extrabold uppercase tracking-widest block mb-1 ${
                    isLight ? "text-slate-700" : "text-slate-400"
                  }`}>
                    {(authTexts[language] || authTexts.EN).usernameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={authTab === "login" ? "e.g. admin" : "e.g. user1"}
                    value={loginName}
                    onChange={(e) => {
                      setAuthError("");
                      setLoginName(e.target.value);
                    }}
                    className={`w-full rounded-xl px-4 py-2.5 outline-none transition font-black ${
                      isLight 
                        ? "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500/80 shadow-inner" 
                        : "bg-slate-950/60 border border-white/15 text-slate-200 placeholder-slate-600 focus:border-yellow-500/50"
                    }`}
                  />
                </div>

                {authTab === "register" && (
                  <div>
                    <label className={`text-[9px] font-extrabold uppercase tracking-widest block mb-1 ${
                      isLight ? "text-slate-700" : "text-slate-400"
                    }`}>
                      {(authTexts[language] || authTexts.EN).emailLabel}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. email@domain.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setAuthError("");
                        setLoginEmail(e.target.value);
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 outline-none transition font-black font-mono ${
                        isLight 
                          ? "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500/80 shadow-inner" 
                          : "bg-slate-950/60 border border-white/15 text-slate-200 placeholder-slate-600 focus:border-yellow-500/50"
                      }`}
                    />
                  </div>
                )}

                <div>
                  <label className={`text-[9px] font-extrabold uppercase tracking-widest block mb-1 ${
                    isLight ? "text-slate-700" : "text-slate-400"
                  }`}>
                    {(authTexts[language] || authTexts.EN).passwordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setAuthError("");
                      setLoginPassword(e.target.value);
                    }}
                    className={`w-full rounded-xl px-4 py-2.5 outline-none transition font-black font-mono ${
                      isLight 
                        ? "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500/80 shadow-inner" 
                        : "bg-slate-950/60 border border-white/15 text-slate-200 placeholder-slate-600 focus:border-yellow-500/50"
                    }`}
                  />
                </div>

                {authTab === "register" && (
                  <div>
                    <label className={`text-[9px] font-extrabold uppercase tracking-widest block mb-1 ${
                      isLight ? "text-slate-700" : "text-slate-400"
                    }`}>
                      {(authTexts[language] || authTexts.EN).confirmPasswordLabel}
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setAuthError("");
                        setConfirmPassword(e.target.value);
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 outline-none transition font-black font-mono ${
                        isLight 
                          ? "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500/80 shadow-inner" 
                          : "bg-slate-950/60 border border-white/15 text-slate-200 placeholder-slate-600 focus:border-yellow-500/50"
                      }`}
                    />
                  </div>
                )}

                {/* Form cancel/authorize triggers */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide cursor-pointer transition liquid-glass-button"
                  >
                    {(authTexts[language] || authTexts.EN).cancelBtn}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wide cursor-pointer transition liquid-glass-gold-button"
                  >
                    {authTab === "login" 
                      ? (authTexts[language] || authTexts.EN).authBtn
                      : (authTexts[language] || authTexts.EN).regBtn
                    }
                  </button>
                </div>
              </form>

              {/* OAuth and Prepopulated Quick-Sign-Ins */}
              <div className={`mt-5 pt-4 border-t flex flex-col gap-2 ${
                isLight ? "border-slate-200" : "border-white/5"
              }`}>
                <span className={`text-[8px] font-mono font-bold tracking-widest uppercase block text-center mb-1 ${
                  isLight ? "text-slate-500" : "text-slate-400/80"
                }`}>
                  {(authTexts[language] || authTexts.EN).orInstant}
                </span>

                {/* Google Authentication Integration */}
                <button
                  onClick={handleGoogleAuth}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10.5px] font-bold cursor-pointer transition-all border ${
                    isLight 
                      ? "bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm" 
                      : "bg-white/5 hover:bg-white/10 border-white/5 text-slate-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>{(authTexts[language] || authTexts.EN).googleAuth}</span>
                </button>

                {/* Prepopulated admin quick-action triggers */}
                <button
                  type="button"
                  onClick={() => {
                    const adminUser = authenticateWithAdmin();
                    setUser(adminUser);
                    setShowLoginModal(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all border ${
                    isLight 
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" 
                      : "bg-white/5 hover:bg-white/10 border-white/5 text-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />
                  <span>{(authTexts[language] || authTexts.EN).autoLogin}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Glassy FAQ Modal overlay */}
      <AnimatePresence>
        {showFaqModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop Blur screen shadow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFaqModal(false)}
              className={`absolute inset-0 backdrop-blur-md transition-opacity duration-300 ${
                isLight ? "bg-slate-900/40" : "bg-[#020617]/80"
              }`}
            />

            {/* Modal Body with premium glassy layout */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className={`relative w-full max-w-2xl overflow-hidden rounded-3xl p-6 shadow-2xl border transition-all duration-300 ${
                isLight 
                  ? "bg-white/95 border-slate-200 text-slate-800" 
                  : "bg-[#090d16]/98 border-white/5 text-slate-100"
              }`}
            >
              {/* Decorative radial gradients for high-fidelity ambient feel */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5 relative z-10 pb-3 border-b border-dashed border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black uppercase tracking-wide">
                      {language === "RU" ? "Часто задаваемые вопросы (FAQ)" : language === "KZ" ? "Жиі қойылатын сұрақтар" : "Frequently Asked Questions"}
                    </h3>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                      {language === "RU" ? "Руководство и полезная информация" : language === "KZ" ? "Нұсқаулық пен ақпарат" : "Guide & core information"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFaqModal(false)}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${
                    isLight ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/5 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Collapsible FAQ Content Items */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 relative z-10 custom-scrollbar text-[12px] font-medium">
                {[
                  {
                    q_ru: "Как устроен кластерный график рынка?",
                    q_en: "How does the Cluster Chart work?",
                    a_ru: "Кластерный график делит каждую свечу на ценовые уровни (шаг цены) и отображает проторгованный объем раздельно на покупку (Ask) и продажу (Bid). Это позволяет заглянуть внутрь свечи, увидеть уровни максимального объема (POC) и дисбалансы спроса/предложения.",
                    a_en: "The cluster chart divides each candlestick into specific price levels, displaying the traded volume split into buy (Ask) and sell (Bid). This lets you see inside the candle to spot Points of Control (POC) and supply/demand imbalances."
                  },
                  {
                    q_ru: "Как управлять масштабированием и прокруткой графиков?",
                    q_en: "How to use Zoom and Navigation?",
                    a_ru: "Используйте колесо мыши для стандартного масштабирования (одновременно по вертикали и горизонтали). Нажав Shift + Колесо мыши, вы можете растягивать/сжимать ценовую шкалу по вертикали, а Ctrl + Колесо мыши фокусируется на временной шкале.",
                    a_en: "Use standard mouse wheel to zoom both axes at once. Press Shift + Wheel to scale vertically, and Ctrl + Wheel to stretch/squeeze the horizontal timeline."
                  },
                  {
                    q_ru: "Что такое кумулятивная дельта (CVD)?",
                    q_en: "What is Cumulative Volume Delta (CVD)?",
                    a_ru: "Кумулятивная дельта (CVD) отображает накопленную разницу рыночных покупок и продаж во времени. Резкие всплески CVD указывают на агрессивный интерес участников рынка, а расхождения с ценой (дивергенции) намекают на разворот тренда.",
                    a_en: "Cumulative Volume Delta (CVD) shows the running total of structural market buying vs market selling over time. Surges show aggressive participants, and divergence with price signals turning points."
                  },
                  {
                    q_ru: "Как добавить индикаторы или линии поддержки?",
                    q_en: "How to apply drawing tools?",
                    a_ru: "Нажмите на кнопку 'Индикаторы' в углу рабочей области, чтобы вызвать конфигуратор. Чтобы нарисовать линию, выберите инструмент рисования на боковой панели и кликните по графику для установки опорных точек.",
                    a_en: "Click the 'Indicators' panel in the platform workspace corner to customize parameters, or select drawing tools from the sidebar and place line anchors directly on the chart."
                  }
                ].map((item, idx) => {
                  const isOpen = faqActiveIndex === idx;
                  const q = language === "RU" ? item.q_ru : item.q_en;
                  const a = language === "RU" ? item.a_ru : item.a_en;

                  return (
                    <div 
                      key={idx}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isOpen 
                          ? isLight ? "bg-blue-50/20 border-blue-100" : "bg-blue-500/5 border-blue-500/20"
                          : isLight ? "bg-slate-50/50 border-slate-100 hover:border-slate-200" : "bg-white/2 hover:bg-white/4 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <button
                        onClick={() => setFaqActiveIndex(isOpen ? null : idx)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left font-bold cursor-pointer outline-none"
                      >
                        <span className={`text-[12.5px] tracking-wide transition-colors ${isOpen ? "text-blue-500" : ""}`}>{q}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-500" : ""}`} />
                      </button>
                      <motion.div
                        initial={false}
                        animate={{ height: isOpen ? "auto" : 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-4 pb-4 pt-1.5 text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          {a}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer with quick contacts */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
                <span className={isLight ? "text-slate-500" : "text-slate-400"}>
                  {language === "RU" ? "Остались вопросы? Присоединяйтесь к сообществу:" : language === "KZ" ? "Сұрақтарыңыз бар ма? Қауымдастыққа қосылыңыз:" : "Have questions? Join our community:"}
                </span>

                <div className="flex items-center gap-2">
                  <a 
                    href="https://t.me/your_telegram_channel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold transition duration-200"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </a>
                  <a 
                    href="https://youtube.com/@your_youtube_channel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition duration-200"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>YouTube</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
