/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ProfileUser } from "../types";
import { 
  User, Mail, Calendar, ShieldCheck, Zap, ArrowLeft, Check, Camera, 
  RefreshCw, BarChart2, Server, Award, Layout, Clock, Sparkles, ChevronRight
} from "lucide-react";
import { motion } from "motion/react";

interface UserProfileProps {
  user: ProfileUser | null;
  onUpdateUser: (updatedUser: ProfileUser | null) => void;
  onClose: () => void;
  theme: "dark" | "light";
  language: "RU" | "EN" | "KZ";
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80"
];

const LOCALIZATION = {
  RU: {
    backToTerminal: "Вернуться в терминал",
    title: "Личный кабинет",
    subtitle: "Управление вашим профилем ProCluster, правами доступа и подпиской",
    personalInfo: "Персональные данные",
    username: "Логин / Никнейм",
    email: "Электронная почта",
    regDate: "Дата регистрации",
    tierStatus: "Статус профиля",
    saveChanges: "Сохранить изменения",
    savedSuccess: "Изменения сохранены!",
    avatarSelect: "Выберите аватар:",
    orCustomUrl: "Или укажите свою ссылку на аватар:",
    statusFree: "БЕСПЛАТНЫЙ",
    statusPro: "PRO ДОСТУП",
    statusVip: "VIP ТЕРМИНАЛ",
    choosePlan: "План подписки",
    planFreeDesc: "Режим реального реал-тайма и симуляций. Фиксированный шаг.",
    planProDesc: "Кастомизация сжатия, режим 50T, полная история ОЗУ свечей.",
    planVipDesc: "Максимальный приоритет, доступ к алгоритмическим аномалиям.",
    currentPlan: "Текущий тариф",
    activatedPlan: "План изменен на",
    unlimited: "Безлимитно",
    statsTitle: "Показатели терминала в сессии",
    metricMemory: "Объем ОЗУ кластеров",
    metricMemoryVal: "4.82 ГБ / 32 ГБ",
    metricTicks: "Обработано тиков рынка",
    metricTicksVal: "384,192 тиков",
    metricLatency: "Задержка сетевого коннекта",
    metricLatencyVal: "1.2 мс (Биржа Binance)",
    recentSessions: "Активность сессий",
    sessionAuth: "Авторизован вход в ProCluster",
    sessionTick: "Запущена сетевая лента сделок",
    sessionWmark: "Интегрирован водяной знак PNG"
  },
  EN: {
    backToTerminal: "Back to Terminal",
    title: "User Profile Center",
    subtitle: "Manage your ProCluster profile, access credentials, and subscription status",
    personalInfo: "Personal Details",
    username: "Username / Handle",
    email: "Email Address",
    regDate: "Registration Date",
    tierStatus: "Profile Tier",
    saveChanges: "Save Changes",
    savedSuccess: "Profile changes saved!",
    avatarSelect: "Select Avatar:",
    orCustomUrl: "Or paste your custom avatar URL:",
    statusFree: "FREE LICENSE",
    statusPro: "PRO SPECIALIST",
    statusVip: "VIP TERMINAL",
    choosePlan: "Subscription Tier Selection",
    planFreeDesc: "Real-time feeds and simulated indicators. Standard step sizes.",
    planProDesc: "Custom chart compression scales, 50T intervals, full clustered footprint history.",
    planVipDesc: "Highest priority calculations, premium indicators, custom alerts and deep support.",
    currentPlan: "Current Tier",
    activatedPlan: "Tier changed to",
    unlimited: "Unlimited",
    statsTitle: "Terminal Live Diagnostics",
    metricMemory: "Active Stack Footprint RAM",
    metricMemoryVal: "4.82 GB / 32 GB",
    metricTicks: "Ticks Processed Today",
    metricTicksVal: "384,192 ticks",
    metricLatency: "Network WebSocket Ingress Delay",
    metricLatencyVal: "1.2 ms (Binance REST API)",
    recentSessions: "Recent Terminal Actions",
    sessionAuth: "Successfully authenticated terminal",
    sessionTick: "Active real-time tape streams initiated",
    sessionWmark: "Configured PNG brand watermark"
  },
  KZ: {
    backToTerminal: "Терминалға оралу",
    title: "Жеке кабинет",
    subtitle: "ProCluster профилін, рұқсат деңгейлерін және жазылымдарды басқару",
    personalInfo: "Жеке мәліметтер",
    username: "Логин / Никнейм",
    email: "Электрондық пошта",
    regDate: "Тіркелген күні",
    tierStatus: "Профиль дәрежесі",
    saveChanges: "Өзгерістерді сақтау",
    savedSuccess: "Өзгерістер сәтті сақталды!",
    avatarSelect: "Аватар таңдаңыз:",
    orCustomUrl: "Немесе аватарға жеке сілтеме жазыңыз:",
    statusFree: "ТЕГІН НҰСҚА",
    statusPro: "PRO ДӘРЕЖЕ",
    statusVip: "VIP ТЕРМИНАЛ",
    choosePlan: "Жазылым пакеттері",
    planFreeDesc: "Нақты уақыттағы негізгі деректер. Бекітілген кестелер.",
    planProDesc: "График қысымын баптау, 50T индикаторлары, толық footprint тарихы.",
    planVipDesc: "Жоғары есептеу басымдығы, премиум алгоритмдер және жеке қолдау.",
    currentPlan: "Белсенді тариф",
    activatedPlan: "Тариф өзгертілді:",
    unlimited: "Шексіз",
    statsTitle: "Терминалдық белсенділік",
    metricMemory: "Кластерлер үшін ОЗУ көлемі",
    metricMemoryVal: "4.82 ГБ / 32 ГБ",
    metricTicks: "Өңделген нарықтық тиктер",
    metricTicksVal: "384,192 тик",
    metricLatency: "Желілік қосылу жылдамдығы",
    metricLatencyVal: "1.2 мс (Binance биржасы)",
    recentSessions: "Сессия белсенділігі",
    sessionAuth: "ProCluster жүйесіне кіру расталды",
    sessionTick: "Нақты келісімдер лентасы қосылды",
    sessionWmark: "PNG брендтік су таңбасы бапталды"
  }
};

export default function UserProfile({
  user,
  onUpdateUser,
  onClose,
  theme,
  language
}: UserProfileProps) {
  const isLight = theme === "light";
  const t = LOCALIZATION[language] || LOCALIZATION.EN;

  // Active form fields, with fallback if user is null
  const [nickname, setNickname] = useState(user?.name || "Guest User");
  const [email, setEmail] = useState(user?.email || "guest@procluster.io");
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_PRESETS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [tier, setTier] = useState<"Free" | "Pro" | "VIP">(user?.tier || "Pro");
  const [regDate, setRegDate] = useState(user?.regDate || "2026-05-29");
  
  const [notification, setNotification] = useState("");

  // Keep state synced with props when loaded/changed
  useEffect(() => {
    if (user) {
      setNickname(user.name);
      setEmail(user.email);
      setAvatar(user.avatar);
      setTier(user.tier);
      setRegDate(user.regDate || "2026-05-29");
    }
  }, [user]);

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalAvatar = customAvatarUrl.trim() ? customAvatarUrl.trim() : avatar;
    
    // Create updated user object
    const updated: ProfileUser = {
      name: nickname.trim(),
      email: email.trim(),
      avatar: finalAvatar,
      regDate: regDate,
      tier: tier
    };

    onUpdateUser(updated);
    
    // Save to localStorage so it persists correctly
    localStorage.setItem("procluster_user", JSON.stringify(updated));
    
    setNotification(t.savedSuccess);
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  const handleTierChange = (newTier: "Free" | "Pro" | "VIP") => {
    setTier(newTier);
    
    const updated: ProfileUser = {
      name: nickname,
      email: email,
      avatar: customAvatarUrl.trim() ? customAvatarUrl.trim() : avatar,
      regDate: regDate,
      tier: newTier
    };

    onUpdateUser(updated);
    localStorage.setItem("procluster_user", JSON.stringify(updated));

    setNotification(`${t.activatedPlan}: ${newTier}`);
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto overflow-y-auto px-6 py-6 relative z-10 flex flex-col gap-6 scrollbar-thin">
      
      {/* Navigation Header bar with Back trigger */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer transition border hover:scale-[1.02] active:scale-[0.98] ${
            isLight
              ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow"
              : "bg-slate-950/40 hover:bg-slate-900/50 border-white/5 text-slate-300"
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
          <span>{t.backToTerminal}</span>
        </button>

        {/* Global Notifications system */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-black uppercase bg-emerald-500/10 border border-emerald-500/35 text-emerald-500 px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </motion.div>
        )}
      </div>

      {/* Hero Section */}
      <div className={`p-6 sm:p-8 rounded-[32px] border relative overflow-hidden flex flex-col md:flex-row items-center gap-6 ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5 shadow-2xl"
      }`}>
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none ${
          tier === "VIP" ? "bg-amber-500/10" : tier === "Pro" ? "bg-blue-500/10" : "bg-slate-500/5"
        }`} />

        <div className="relative group select-none">
          <img
            src={avatar}
            alt={nickname}
            referrerPolicy="no-referrer"
            className={`w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-full object-cover border-4 shadow-xl transition-transform duration-300 group-hover:scale-105 ${
              tier === "VIP" 
                ? "border-amber-500/40 shadow-amber-500/10" 
                : tier === "Pro" 
                  ? "border-blue-500/40 shadow-blue-500/10" 
                  : "border-slate-400/20"
            }`}
          />
          <div className={`absolute -bottom-1 -right-1 p-2 rounded-full border shadow ${
            tier === "VIP"
              ? "bg-amber-500 border-amber-600 text-slate-950"
              : tier === "Pro"
                ? "bg-blue-500 border-blue-600 text-white"
                : "bg-slate-500 border-slate-600 text-white"
          }`}>
            <Award className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
            <h1 className={`text-2xl sm:text-3xl font-black font-sans leading-none truncate ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {nickname}
            </h1>
            
            {/* Account Status Badge */}
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none border ${
              tier === "VIP" 
                ? "bg-amber-500/15 border-amber-500/35 text-amber-500 shadow-amber-500/20 shadow" 
                : tier === "Pro" 
                  ? "bg-blue-500/15 border-blue-500/35 text-blue-400 shadow-blue-500/20 shadow" 
                  : "bg-slate-500/15 border-slate-500/35 text-slate-400"
            }`}>
              {tier === "VIP" ? t.statusVip : tier === "Pro" ? t.statusPro : t.statusFree}
            </span>
          </div>

          <p className={`text-xs sm:text-sm max-w-xl ${isLight ? "text-slate-600 font-medium" : "text-slate-400"}`}>
            {t.subtitle}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span className={isLight ? "text-slate-700 font-bold" : "text-slate-300"}>{email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className={isLight ? "text-slate-700 font-bold" : "text-slate-300"}>
                {t.regDate}: {regDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PERSONAL INFO FORM & AVATAR EDIT */}
        <div className={`lg:col-span-2 p-6 rounded-[28px] border flex flex-col gap-5 ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
        }`}>
          <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
            isLight ? "text-slate-800" : "text-slate-200"
          }`}>
            <User className="w-4 h-4 text-emerald-500" />
            {t.personalInfo}
          </h2>

          <form onSubmit={handleSaveChanges} className="flex flex-col gap-4 font-sans text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`text-[10px] font-mono font-black block mb-1 uppercase ${
                  isLight ? "text-slate-700" : "text-slate-400"
                }`}>{t.username}</label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-black ${
                    isLight 
                      ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white" 
                      : "bg-slate-950/60 border border-white/10 text-slate-200 focus:border-emerald-500/50 focus:bg-slate-950"
                  }`}
                />
              </div>

              <div>
                <label className={`text-[10px] font-mono font-black block mb-1 uppercase ${
                  isLight ? "text-slate-700" : "text-slate-400"
                }`}>{t.email}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-black ${
                    isLight 
                      ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white" 
                      : "bg-slate-950/60 border border-white/10 text-slate-200 focus:border-emerald-500/50 focus:bg-slate-950"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`text-[10px] font-mono font-black block mb-1 uppercase ${
                isLight ? "text-slate-700" : "text-slate-400"
              }`}>{t.avatarSelect}</label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = avatar === preset && !customAvatarUrl.trim();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAvatar(preset);
                        setCustomAvatarUrl("");
                      }}
                      className={`relative w-12 h-12 rounded-full cursor-pointer overflow-hidden border-2 transition-transform duration-200 hover:scale-110 active:scale-95 ${
                        isSelected 
                          ? "border-emerald-500 scale-105" 
                          : isLight ? "border-slate-200" : "border-white/10"
                      }`}
                    >
                      <img src={preset} alt="preset avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className={`text-[9px] font-mono font-bold block mb-1 uppercase ${
                  isLight ? "text-slate-500" : "text-slate-400/80"
                }`}>{t.orCustomUrl}</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold ${
                    isLight 
                      ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white" 
                      : "bg-slate-950/60 border border-white/10 text-slate-200 focus:border-emerald-500/50 focus:bg-slate-950"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`mt-2 py-3 px-5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer border transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                isLight 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-md shadow-emerald-600/10" 
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {t.saveChanges}
            </button>
          </form>
        </div>

        {/* DIANOSTICS METRICS CARD */}
        <div className={`p-6 rounded-[28px] border flex flex-col justify-between gap-5 ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
        }`}>
          <div>
            <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 mb-4 ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}>
              <Server className="w-4 h-4 text-sky-500" />
              {t.statsTitle}
            </h2>

            <div className="flex flex-col gap-3.5">
              <div className={`p-3 rounded-2xl border ${isLight ? "bg-slate-50 border-slate-200/60" : "bg-slate-900/40 border-white/5"}`}>
                <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider uppercase">{t.metricMemory}</span>
                <span className={`text-[13px] font-mono font-black mt-1 block ${isLight ? "text-slate-800" : "text-sky-400"}`}>{t.metricMemoryVal}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? "bg-slate-50 border-slate-200/60" : "bg-slate-900/40 border-white/5"}`}>
                <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider uppercase">{t.metricTicks}</span>
                <span className={`text-[13px] font-mono font-black mt-1 block ${isLight ? "text-slate-800" : "text-emerald-400"}`}>{t.metricTicksVal}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${isLight ? "bg-slate-50 border-slate-200/60" : "bg-slate-900/40 border-white/5"}`}>
                <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-wider uppercase">{t.metricLatency}</span>
                <span className={`text-[13px] font-mono font-black mt-1 block ${isLight ? "text-slate-800" : "text-amber-400"}`}>{t.metricLatencyVal}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 text-[10px] font-mono font-bold text-slate-400 block">
            <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
            <span>HMR: DISABLED | WS: ACTIVE ONLINE</span>
          </div>
        </div>
      </div>

      {/* PLAN SELECTOR SECTION */}
      <div className={`p-6 sm:p-8 rounded-[32px] border flex flex-col gap-6 ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
      }`}>
        <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
          isLight ? "text-slate-800" : "text-slate-200"
        }`}>
          <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
          {t.choosePlan}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* FREE PLAN */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-5 transition-transform duration-200 hover:scale-[1.01] ${
            tier === "Free" 
              ? "border-slate-500 bg-slate-500/5 shadow-lg shadow-slate-500/5" 
              : isLight ? "bg-white border-slate-200/80" : "bg-white/[0.01] border-white/5"
          }`}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-slate-400">FREE</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-450 uppercase">0 USDT</span>
              </div>
              <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>Free Edition</h3>
              <p className={`text-[11px] leading-snug ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {t.planFreeDesc}
              </p>
            </div>
            
            <button
              onClick={() => handleTierChange("Free")}
              className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition ${
                tier === "Free"
                  ? isLight ? "bg-slate-200 text-slate-700 font-extrabold border-slate-350" : "bg-slate-500/25 text-slate-300 border border-slate-500/35"
                  : "bg-slate-500/5 hover:bg-slate-500/10 border border-slate-500/20 text-slate-400"
              }`}
            >
              {tier === "Free" ? t.currentPlan : "Activate Free"}
            </button>
          </div>

          {/* PRO PLAN */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-5 transition-transform duration-200 hover:scale-[1.01] relative ${
            tier === "Pro" 
              ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/5" 
              : isLight ? "bg-white border-slate-200/80" : "bg-white/[0.01] border-white/5"
          }`}>
            {tier === "Pro" && (
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-blue-500 text-[8px] font-black uppercase text-white shadow-md tracking-wider">
                POPULAR
              </div>
            )}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-blue-400">PRO</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-450 uppercase">49 USDT</span>
              </div>
              <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>Pro Specialist</h3>
              <p className={`text-[11px] leading-snug ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {t.planProDesc}
              </p>
            </div>
            
            <button
              onClick={() => handleTierChange("Pro")}
              className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition ${
                tier === "Pro"
                  ? "bg-blue-500 text-white font-black"
                  : "bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 text-blue-400"
              }`}
            >
              {tier === "Pro" ? t.currentPlan : "Activate Pro"}
            </button>
          </div>

          {/* VIP PLAN - GOLD */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-5 transition-transform duration-200 hover:scale-[1.01] ${
            tier === "VIP" 
              ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/5" 
              : isLight ? "bg-white border-slate-200/80" : "bg-white/[0.01] border-white/5"
          }`}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-amber-500">VIP</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase">199 USDT</span>
              </div>
              <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>VIP Terminal</h3>
              <p className={`text-[11px] leading-snug ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {t.planVipDesc}
              </p>
            </div>
            
            <button
              onClick={() => handleTierChange("VIP")}
              className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition ${
                tier === "VIP"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25"
                  : "bg-amber-505/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-500"
              }`}
            >
              {tier === "VIP" ? t.currentPlan : "Activate VIP"}
            </button>
          </div>

        </div>
      </div>

      {/* RECENT SESSSIONS ACTIVITIES */}
      <div className={`p-6 rounded-[28px] border flex flex-col gap-4 ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
      }`}>
        <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
          isLight ? "text-slate-800" : "text-slate-200"
        }`}>
          <Clock className="w-4 h-4 text-indigo-400 font-bold" />
          {t.recentSessions}
        </h2>

        <div className="flex flex-col gap-2 pointer-events-none select-none">
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            isLight ? "bg-slate-50 border-slate-200/60 text-slate-800" : "bg-slate-900/30 border-white/5 text-slate-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold leading-none">{t.sessionAuth} ({nickname})</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">2026-05-29 21:17:11</span>
          </div>

          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            isLight ? "bg-slate-50 border-slate-200/60 text-slate-800" : "bg-slate-900/30 border-white/5 text-slate-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold leading-none">{t.sessionTick}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">2026-05-29 21:05:10</span>
          </div>

          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            isLight ? "bg-slate-50 border-slate-200/60 text-slate-800" : "bg-slate-900/30 border-white/5 text-slate-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-bold leading-none">{t.sessionWmark}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">2026-05-29 18:11:27</span>
          </div>
        </div>
      </div>

    </div>
  );
}
