/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ProfileUser } from "../types";
import { 
  User, Mail, Calendar, ShieldCheck, Zap, ArrowLeft, Check, Camera, 
  RefreshCw, BarChart2, Server, Award, Layout, Clock, Sparkles, ChevronRight,
  CreditCard, Coins, DollarSign, Copy, ExternalLink, Hourglass, CheckCircle2,
  Shield, AlertCircle, X, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
    password: "Новый пароль / Изменить пароль",
    statusFree: "БЕСПЛАТНЫЙ",
    statusPro: "PRO ДОСТУП",
    statusVip: "VIP ТЕРМИНАЛ",
    choosePlan: "Доступные планы подписок ProCluster",
    planFreeDesc: "Базовый аналитический пакет для начинающих трейдеров и тестов.",
    planProDesc: "Специализированный набор инструментов с динамическим сжатием футпринта.",
    planVipDesc: "Максимальные привилегии, полный приоритет рендеринга и уведомлений.",
    currentPlan: "Ваш текущий тариф",
    activatedPlan: "План успешно изменен на",
    unlimited: "Безлимитно",
    subInfoCard: "Свойства вашей подписки",
    paymentDate: "Дата оплаты тарифа",
    expirationDate: "Дата истечения тарифа",
    subRemaining: "Осталось дней",
    subActive: "Активна",
    notPaid: "Не применимо",
    activateBtn: "Активировать",
    payTitle: "Оплата тарифа через USDT",
    paySelectNet: "Шаг 1: Выберите сеть",
    payInstructions: "Шаг 2: Произведите оплату",
    payText1: "Для активации тарифа {plan} отправьте ровно {amount} USDT на указанный TRON/Ethereum адрес.",
    payScanQr: "Сканируйте QR-код или скопируйте адрес вручную:",
    payConfirmBtn: "Я оплатил (Симулировать зачисление)",
    payVerifying: "Проверка транзакции в блокчейне...",
    payHashCheck: "Сканирование блоков на предмет перевода {amount} USDT...",
    paySuccessTitle: "Платеж получен!",
    paySuccessDesc: "Блокчейн успешно подтвердил транзакцию. Ваш тариф {plan} и новые лимиты активированы на 30 дней.",
    payFinish: "Завершить",
    copied: "Скопировано",
    propsMaxCandles: "Максимум свечей графика",
    propsCompression: "Уровней сжатия графика",
    propsIndicators: "Индикаторов на графике",
    propsCustomSettings: "Кастомные настройки индикаторов",
    propsTelegram: "Телеграм уведомления",
    yes: "Да",
    no: "Нет"
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
    password: "Change Password",
    statusFree: "FREE LICENSE",
    statusPro: "PRO SPECIALIST",
    statusVip: "VIP TERMINAL",
    choosePlan: "Available ProCluster Subscription Plans",
    planFreeDesc: "Basic structural pack for beginner traders and terminal simulation runs.",
    planProDesc: "Specialized dataset with customized order flow footprints and compression levels.",
    planVipDesc: "Elite server processing priority, comprehensive indicator packs and instant alerts.",
    currentPlan: "Current Tier",
    activatedPlan: "Tier changed to",
    unlimited: "Unlimited",
    subInfoCard: "Subscription Details",
    paymentDate: "Payment Date",
    expirationDate: "Expiration Date",
    subRemaining: "Days Remaining",
    subActive: "Active",
    notPaid: "Not Applicable",
    activateBtn: "Activate",
    payTitle: "Pay Subscription with USDT",
    paySelectNet: "Step 1: Choose Protocol Network",
    payInstructions: "Step 2: Transfer Assets",
    payText1: "To activate {plan} tier, dispatch exactly {amount} USDT to the designated TRON/Ethereum deposit address.",
    payScanQr: "Scan QR code or click to copy address manually:",
    payConfirmBtn: "I paid (Simulate Block Ingress)",
    payVerifying: "Verifying blockchain state...",
    payHashCheck: "Scanning network hashes for a transfer of {amount} USDT...",
    paySuccessTitle: "Payment Verified!",
    paySuccessDesc: "Blockchain nodes confirmed the transaction. Your {plan} subscription and expanded limitations are active for 30 days.",
    payFinish: "Finish",
    copied: "Copied!",
    propsMaxCandles: "Max chart candles count",
    propsCompression: "Chart compression levels",
    propsIndicators: "Active indicators allowed",
    propsCustomSettings: "Custom indicator settings",
    propsTelegram: "Telegram notifications",
    yes: "Yes",
    no: "No"
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
    password: "Құпия сөзді өзгерту",
    statusFree: "ТЕГІН НҰСҚА",
    statusPro: "PRO ДӘРЕЖЕ",
    statusVip: "VIP ТЕРМИНАЛ",
    choosePlan: "ProCluster қолжетімді жазылым жоспарлары",
    planFreeDesc: "Жаңадан бастаушы трейдерлер мен терминалдық тестілеуге арналған негізгі пакет.",
    planProDesc: "Футпринтті динамикалық қысу мүмкіндігі бар арнайы құралдар жиынтығы.",
    planVipDesc: "Жоғары серверлік артықшылықтар, толық көрсеткіштер мен жедел хабарламалар.",
    currentPlan: "Белсенді тариф",
    activatedPlan: "Тариф өзгертілді:",
    unlimited: "Шексіз",
    subInfoCard: "Жазылым қасиеттері",
    paymentDate: "Тариф төленген күні",
    expirationDate: "Тариф аяқталу күні",
    subRemaining: "Қалған күндер саны",
    subActive: "Белсенді",
    notPaid: "Қолданылмайды",
    activateBtn: "Активациялау",
    payTitle: "Төлемді USDT арқылы жасау",
    paySelectNet: "1-Қадам: Желіні таңдаңыз",
    payInstructions: "2-Қадам: Төлемді аударыңыз",
    payText1: "{plan} тарифін қосу үшін көрсетілген TRON/Ethereum мекенжайына дәл {amount} USDT жіберіңіз.",
    payScanQr: "QR-кодты сканерлеңіз немесе мекенжайды көшіріңіз:",
    payConfirmBtn: "Мен төледім (Аударуды симуляциялау)",
    payVerifying: "Блокчейн желісінде транзакцияны тексеру...",
    payHashCheck: "{amount} USDT аударымын блок хештерінен іздеу...",
    paySuccessTitle: "Төлем қабылданды!",
    paySuccessDesc: "Блокчейн транзакцияны сәтті растады. Сіздің {plan} тарифіңіз және жаңа лимиттер 30 күнге белсендірілді.",
    payFinish: "Аяқтау",
    copied: "Көшірілді",
    propsMaxCandles: "Графиктің макс свеча саны",
    propsCompression: "Графикті қысу деңгейлері",
    propsIndicators: "Графиктегі көрсеткіштер саны",
    propsCustomSettings: "Индикаторлардың жеке баптаулары",
    propsTelegram: "Телеграм хабарландырулары",
    yes: "Иә",
    no: "Жоқ"
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
  const [password, setPassword] = useState("");
  const [notification, setNotification] = useState("");

  // Payment states and dates
  const [paymentDate, setPaymentDate] = useState(() => {
    return localStorage.getItem("procluster_payment_date") || "2026-05-29";
  });
  const [expireDate, setExpireDate] = useState(() => {
    return localStorage.getItem("procluster_expire_date") || "2026-06-29";
  });

  const [activePaymentPlan, setActivePaymentPlan] = useState<"Pro" | "VIP" | null>(null);
  const [paymentStep, setPaymentStep] = useState<"choose" | "deposit" | "verifying" | "success">("choose");
  const [paymentNetwork, setPaymentNetwork] = useState<"trc20" | "erc20" | "bep20">("trc20");
  const [paymentTxCopied, setPaymentTxCopied] = useState(false);
  const [copiedText, setCopiedText] = useState("");

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

  // Handle Free vs Pro/VIP dates calculation reactive state
  useEffect(() => {
    if (tier === "Free") {
      setPaymentDate("—");
      setExpireDate(language === "RU" ? "Безлимитно" : language === "KZ" ? "Шексіз" : "Unlimited");
    } else {
      const storedPay = localStorage.getItem("procluster_payment_date");
      const storedExp = localStorage.getItem("procluster_expire_date");
      setPaymentDate(storedPay || "2026-05-29");
      setExpireDate(storedExp || "2026-06-29");
    }
  }, [tier, language]);

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

    if (password.trim()) {
      localStorage.setItem("procluster_user_password", password.trim());
      setPassword("");
    }
    
    setNotification(t.savedSuccess);
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  const executeDirectUpgrade = (targetTier: "Free" | "Pro" | "VIP", directDates?: { pay: string; exp: string }) => {
    setTier(targetTier);
    
    // Set payment dates internally and into LocalStorage
    let payD = "—";
    let expD = language === "RU" ? "Безлимитно" : language === "KZ" ? "Шексіз" : "Unlimited";
    
    if (targetTier !== "Free") {
      if (directDates) {
        payD = directDates.pay;
        expD = directDates.exp;
      } else {
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);
        payD = today.toISOString().split('T')[0];
        expD = nextMonth.toISOString().split('T')[0];
      }
      localStorage.setItem("procluster_payment_date", payD);
      localStorage.setItem("procluster_expire_date", expD);
    } else {
      localStorage.removeItem("procluster_payment_date");
      localStorage.removeItem("procluster_expire_date");
    }

    setPaymentDate(payD);
    setExpireDate(expD);

    const updated: ProfileUser = {
      name: nickname,
      email: email,
      avatar: customAvatarUrl.trim() ? customAvatarUrl.trim() : avatar,
      regDate: regDate,
      tier: targetTier
    };

    onUpdateUser(updated);
    localStorage.setItem("procluster_user", JSON.stringify(updated));

    // Align the simulated override role state in local storage
    localStorage.setItem("procluster_role", targetTier);
    window.dispatchEvent(new CustomEvent("procluster_user_updated"));

    setNotification(`${t.activatedPlan}: ${targetTier}`);
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  const handleCopyText = (addrText: string) => {
    navigator.clipboard.writeText(addrText);
    setPaymentTxCopied(true);
    setCopiedText(addrText);
    setTimeout(() => {
      setPaymentTxCopied(false);
    }, 2000);
  };

  // Start checkout simulation for Pro or VIP
  const startPaymentCheckout = (plan: "Pro" | "VIP") => {
    setActivePaymentPlan(plan);
    setPaymentStep("choose");
    setPaymentNetwork("trc20");
  };

  // Run the animated blockchain verifying loader
  const triggerVerifySimulation = () => {
    setPaymentStep("verifying");
    setTimeout(() => {
      setPaymentStep("success");
    }, 2800);
  };

  // Complete simulated payment and activate the tariff with dynamic dates
  const commitPaymentSuccessUpgrade = () => {
    if (!activePaymentPlan) return;
    
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    const payD = today.toISOString().split('T')[0];
    const expD = nextMonth.toISOString().split('T')[0];

    executeDirectUpgrade(activePaymentPlan, { pay: payD, exp: expD });
    setActivePaymentPlan(null);
  };

  // Remaining days helper calculations
  const calculateDaysLeftStr = () => {
    if (tier === "Free") return language === "RU" ? "Безлимитно" : language === "KZ" ? "Шексіз" : "Unlimited";
    try {
      const exp = new Date(expireDate);
      const now = new Date();
      const diffTime = exp.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays}д` : "Истёк";
    } catch {
      return "0д";
    }
  };

  const depositAddresses = {
    trc20: "TY2gCsm79k8H6xNcs9VbAr4Pmqw99pTdQp",
    erc20: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    bep20: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
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
      <div className={`py-5 px-6 sm:px-8 rounded-[24px] border relative overflow-hidden flex flex-col md:flex-row items-center gap-6 ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5 shadow-2xl"
      }`}>
        <div className={`absolute top-0 right-0 w-85 h-64 rounded-full blur-[80px] pointer-events-none ${
          tier === "VIP" ? "bg-amber-500/10" : tier === "Pro" ? "bg-blue-500/10" : "bg-slate-500/5"
        }`} />

        <div className="relative group select-none">
          <img
            src={avatar}
            alt={nickname}
            referrerPolicy="no-referrer"
            className={`w-[84px] h-[84px] md:w-[100px] md:h-[100px] rounded-full object-cover border-4 shadow-xl transition-transform duration-300 group-hover:scale-105 ${
              tier === "VIP" 
                ? "border-amber-500/40 shadow-amber-500/10" 
                : tier === "Pro" 
                  ? "border-blue-500/40 shadow-blue-500/10" 
                  : "border-slate-400/20"
            }`}
          />
          <div className={`absolute -bottom-1 -right-1 p-2 rounded-full border shadow ${
            tier === "VIP"
              ? "bg-amber-500 border-amber-600 text-slate-900"
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
                ? "bg-amber-500/15 border-amber-500/35 text-amber-500 shadow-amber-500/20 shadow animate-pulse" 
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

      {/* Two-Column Detail Grid: Form + Subscription Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Column 1 & 2: PERSONAL INFO FORM */}
        <div className={`lg:col-span-2 p-6 rounded-[28px] border flex flex-col gap-5 ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
        }`}>
          <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
            isLight ? "text-slate-800" : "text-slate-200"
          }`}>
            <User className="w-4 h-4 text-emerald-500" />
            {t.personalInfo}
          </h2>

          <form onSubmit={handleSaveChanges} className="flex flex-col gap-4 font-sans text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <label className={`text-[10px] font-mono font-black block mb-1 uppercase ${
                  isLight ? "text-slate-700" : "text-slate-400"
                }`}>{t.password}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-black ${
                    isLight 
                      ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-500" 
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

        {/* Column 3: SUBSCRIPTION INFO & DATES CARD */}
        <div className={`p-6 rounded-[28px] border flex flex-col justify-between gap-5 relative overflow-hidden ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
        }`}>
          <div className="flex flex-col gap-5">
            <h2 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}>
              <CreditCard className="w-4 h-4 text-amber-500" />
              {t.subInfoCard}
            </h2>

            <div className="flex flex-col gap-3 font-mono text-xs">
              
              {/* Tariff Badge */}
              <div className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
              }`}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.tierStatus}</span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide leading-none ${
                  tier === "VIP" 
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                    : tier === "Pro" 
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                }`}>
                  {tier}
                </span>
              </div>

              {/* Payment Date */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.paymentDate}</span>
                <span className={`text-[11px] font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {paymentDate}
                </span>
              </div>

              {/* Expiry Date */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.expirationDate}</span>
                <span className={`text-[11px] font-bold ${
                  tier === "Free" 
                    ? "text-emerald-500" 
                    : isLight ? "text-slate-800" : "text-slate-200"
                }`}>
                  {expireDate}
                </span>
              </div>

              {/* Days left */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.subRemaining}</span>
                <span className={`text-[11px] font-black ${
                  tier === "Free" ? "text-emerald-500" : "text-amber-500"
                }`}>
                  {calculateDaysLeftStr()}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between py-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
                <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t.subActive}</span>
                </span>
              </div>

            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-500 leading-normal text-center bg-slate-500/5 p-2.5 rounded-xl border border-white/[0.02]">
            {language === "RU" 
              ? "Все лимиты графиков автоматически адаптированы под свойства вашего текущего тарифного плана."
              : language === "KZ"
                ? "Барлық тарифтік лимиттер сіздің ағымдағы жоспарыңыз үшін автоматты түрде қосылды."
                : "All live constraints are globally applied with respect to your current active tier."}
          </div>
        </div>

      </div>

      {/* EXPANDED PLANS COMPARISON CARDS */}
      <div className={`p-6 sm:p-8 rounded-[32px] border flex flex-col gap-6 ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/30 border-white/5"
      }`}>
        <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
          isLight ? "text-slate-800" : "text-slate-200"
        }`}>
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          {t.choosePlan}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* FREE PLAN */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 transition-transform duration-200 hover:scale-[1.01] ${
            tier === "Free" 
              ? "border-slate-500 bg-slate-500/5 shadow-lg shadow-slate-500/5" 
              : isLight ? "bg-white border-slate-200/80" : "bg-white/[0.01] border-white/5"
          }`}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-slate-400">FREE</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-450 uppercase">0 USDT</span>
              </div>
              <div>
                <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>Free Edition</h3>
                <p className={`text-[11px] leading-snug mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {t.planFreeDesc}
                </p>
              </div>

              {/* Specifications lists for FREE */}
              <div className="flex flex-col gap-2 font-mono text-xs pt-3 border-t border-white/[0.04]">
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsMaxCandles}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>700</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsCompression}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>1</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsIndicators}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>3</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsCustomSettings}</span>
                  <span className="font-black text-rose-500">{t.no}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsTelegram}</span>
                  <span className="font-black text-rose-500">{t.no}</span>
                </div>
              </div>
            </div>
            
            {/* NO ACTIVE BUTTON FOR FREE PLAN (Empty space or static tag) */}
            {tier === "Free" ? (
              <div className={`w-full py-2.5 rounded-xl text-[10.5px] font-black uppercase tracking-widest text-center border ${
                isLight ? "bg-slate-200 border-slate-300 text-slate-805" : "bg-white/5 border-white/5 text-slate-400"
              }`}>
                {t.currentPlan}
              </div>
            ) : (
              <button
                onClick={() => executeDirectUpgrade("Free")}
                className={`w-full py-2.5 rounded-xl text-[10.5px] font-black uppercase tracking-widest cursor-pointer transition border hover:bg-slate-500/5 ${
                  isLight ? "bg-white border-slate-250 text-slate-700 hover:bg-slate-100" : "bg-transparent border-white/10 text-slate-400"
                }`}
              >
                Downgrade Free
              </button>
            )}
          </div>

          {/* PRO PLAN */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 transition-transform duration-200 hover:scale-[1.01] relative ${
            tier === "Pro" 
              ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/5" 
              : isLight ? "bg-white border-slate-200/80" : "bg-white/[0.01] border-white/5"
          }`}>
            {tier === "Pro" && (
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-blue-500 text-[8px] font-black uppercase text-white shadow-md tracking-wider">
                POPULAR
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-blue-400">PRO</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-450 uppercase">10 USDT</span>
              </div>
              <div>
                <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>Pro Specialist</h3>
                <p className={`text-[11px] leading-snug mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {t.planProDesc}
                </p>
              </div>

              {/* Specifications lists for PRO */}
              <div className="flex flex-col gap-2 font-mono text-xs pt-3 border-t border-white/[0.04]">
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsMaxCandles}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>1400</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsCompression}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>2</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsIndicators}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>5</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsCustomSettings}</span>
                  <span className="font-black text-emerald-500">{t.yes}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsTelegram}</span>
                  <span className="font-black text-rose-500">{t.no}</span>
                </div>
              </div>
            </div>
            
            {/* ACTIVATE/UPGRADE PRO WITH PAYMENT REDIRECT SIMULATION */}
            {tier === "Pro" ? (
              <div className="w-full py-2.5 rounded-xl text-[10.5px] font-black uppercase tracking-widest text-center bg-blue-500 text-white shadow shadow-blue-500/25">
                {t.currentPlan}
              </div>
            ) : (
              <button
                onClick={() => startPaymentCheckout("Pro")}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest cursor-pointer transition active:scale-[0.98] shadow-md shadow-blue-500/20 text-center flex items-center justify-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{t.activateBtn} PRO</span>
              </button>
            )}
          </div>

          {/* VIP PLAN - GOLD */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 transition-transform duration-200 hover:scale-[1.01] ${
            tier === "VIP" 
              ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/5" 
              : isLight ? "bg-white border-slate-200/80" : "bg-white/[0.01] border-white/5"
          }`}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-amber-500">VIP</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase">20 USDT</span>
              </div>
              <div>
                <h3 className={`text-base font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>VIP Terminal</h3>
                <p className={`text-[11px] leading-snug mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {t.planVipDesc}
                </p>
              </div>

              {/* Specifications lists for VIP */}
              <div className="flex flex-col gap-2 font-mono text-xs pt-3 border-t border-white/[0.04]">
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsMaxCandles}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>10000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsCompression}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>6</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsIndicators}</span>
                  <span className={`font-black ${isLight ? "text-slate-855" : "text-slate-200"}`}>15</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.02]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsCustomSettings}</span>
                  <span className="font-black text-emerald-500">{t.yes}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{t.propsTelegram}</span>
                  <span className="font-black text-emerald-500">{t.yes}</span>
                </div>
              </div>
            </div>
            
            {/* ACTIVATE/UPGRADE VIP WITH PAYMENT REDIRECT SIMULATION */}
            {tier === "VIP" ? (
              <div className="w-full py-2.5 rounded-xl text-[10.5px] font-black uppercase tracking-widest text-center bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25">
                {t.currentPlan}
              </div>
            ) : (
              <button
                onClick={() => startPaymentCheckout("VIP")}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10.5px] font-black uppercase tracking-widest cursor-pointer transition active:scale-[0.98] shadow-md shadow-amber-500/35 text-center flex items-center justify-center gap-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{t.activateBtn} VIP</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ULTRA LUXURY INTERACTIVE BLOCKCHAIN PAYMENT DIALOG OVERLAY */}
      <AnimatePresence>
        {activePaymentPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePaymentPlan(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-all"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`w-full max-w-lg rounded-3xl border shadow-2xl relative z-50 flex flex-col overflow-hidden max-h-[90vh] ${
                isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
              }`}
            >
              {/* Checkout header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.01] border-white/5"
              }`}>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span className="font-black text-sm uppercase tracking-wide">{t.payTitle}</span>
                </div>
                <button
                  onClick={() => setActivePaymentPlan(null)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-600" : "bg-white/5 hover:bg-white/10 border-white/5 text-slate-400"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step Flow Switcher */}
              <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
                
                {paymentStep === "choose" && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-mono font-black uppercase tracking-widest text-slate-405">{t.paySelectNet}</h3>
                    
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setPaymentNetwork("trc20")}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                          paymentNetwork === "trc20"
                            ? "border-emerald-500 bg-emerald-500/[0.03] shadow"
                            : isLight ? "hover:bg-slate-50 border-slate-200" : "hover:bg-white/5 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/20">TRX</span>
                          <div>
                            <p className="text-xs font-black">TRON (TRC-20)</p>
                            <p className="text-[10px] text-slate-400 font-medium">Комиссия ~1 USDT, зачисление 1 мин</p>
                          </div>
                        </div>
                        <div className={`w-4 class h-4 rounded-full border flex items-center justify-center ${
                          paymentNetwork === "trc20" ? "border-emerald-500" : "border-slate-500"
                        }`}>
                          {paymentNetwork === "trc20" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentNetwork("erc20")}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                          paymentNetwork === "erc20"
                            ? "border-blue-500 bg-blue-500/[0.03] shadow"
                            : isLight ? "hover:bg-slate-50 border-slate-200" : "hover:bg-white/5 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-blue-550/10 text-blue-500 flex items-center justify-center font-bold text-xs ring-2 ring-blue-550/20">ETH</span>
                          <div>
                            <p className="text-xs font-black">Ethereum (ERC-20)</p>
                            <p className="text-[10px] text-slate-400 font-medium">Высокая стабильность, комиссия ~3 USDT</p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentNetwork === "erc20" ? "border-blue-500" : "border-slate-500"
                        }`}>
                          {paymentNetwork === "erc20" && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentNetwork("bep20")}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                          paymentNetwork === "bep20"
                            ? "border-amber-500 bg-amber-500/[0.03] shadow"
                            : isLight ? "hover:bg-slate-50 border-slate-200" : "hover:bg-white/5 border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs ring-2 ring-amber-500/20">BSC</span>
                          <div>
                            <p className="text-xs font-black">BNB Chain (BEP-20)</p>
                            <p className="text-[10px] text-slate-400 font-medium">Низкие комиссии, высокая скорость</p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentNetwork === "bep20" ? "border-amber-500" : "border-slate-500"
                        }`}>
                          {paymentNetwork === "bep20" && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        </div>
                      </button>
                    </div>

                    <button
                      onClick={() => setPaymentStep("deposit")}
                      className="w-full mt-4 py-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-50 dark:text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer text-center"
                    >
                      {language === "RU" ? "Далее" : "Continue"}
                    </button>
                  </div>
                )}

                {paymentStep === "deposit" && (
                  <div className="flex flex-col gap-4 text-center">
                    <h3 className="text-xs font-mono font-black uppercase tracking-widest text-slate-405 text-left">{t.payInstructions}</h3>
                    
                    <p className={`text-xs font-medium text-left leading-relaxed ${isLight ? "text-slate-655" : "text-slate-300"}`}>
                      {t.payText1
                        .replace("{plan}", activePaymentPlan === "VIP" ? "VIP" : "PRO")
                        .replace("{amount}", activePaymentPlan === "VIP" ? "20" : "10")}
                    </p>

                    {/* Deposit card block with Clipboard */}
                    <div className={`p-4 rounded-2xl border text-center relative flex flex-col gap-3.5 items-center justify-center shadow-inner ${
                      isLight ? "bg-slate-100/50 border-slate-200" : "bg-black/40 border-white/5"
                    }`}>
                      <div className="flex items-center justify-between w-full font-sans text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network:</span>
                        <span className="font-mono font-black text-amber-500 uppercase">{paymentNetwork}</span>
                      </div>

                      {/* Display a gorgeous visual SVG vector layout QR Code directly */}
                      <div className="p-3 bg-white rounded-2xl border border-slate-250 select-none flex items-center justify-center shadow">
                        <svg width="120" height="120" viewBox="0 0 120 120" className="text-slate-900">
                          {/* Simulated high-end QR matrix */}
                          <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                          <rect x="5" y="5" width="20" height="20" fill="white" />
                          <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                          
                          <rect x="90" y="0" width="30" height="30" fill="currentColor" />
                          <rect x="95" y="5" width="20" height="20" fill="white" />
                          <rect x="100" y="10" width="10" height="10" fill="currentColor" />

                          <rect x="0" y="90" width="30" height="30" fill="currentColor" />
                          <rect x="5" y="95" width="20" height="20" fill="white" />
                          <rect x="10" y="100" width="10" height="10" fill="currentColor" />

                          {/* Complex inner matrix details */}
                          <rect x="40" y="15" width="10" height="10" fill="currentColor" />
                          <rect x="65" y="25" width="15" height="10" fill="currentColor" />
                          <rect x="35" y="45" width="10" height="20" fill="currentColor" />
                          <rect x="55" y="55" width="25" height="15" fill="currentColor" />
                          <rect x="95" y="45" width="15" height="20" fill="currentColor" />
                          <rect x="15" y="65" width="15" height="10" fill="currentColor" />
                          <rect x="45" y="85" width="30" height="15" fill="currentColor" />
                          <rect x="90" y="85" width="20" height="25" fill="currentColor" />
                        </svg>
                      </div>

                      <div className="w-full">
                        <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1 text-left">{t.payScanQr}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={depositAddresses[paymentNetwork]}
                            className={`flex-1 rounded-xl px-3 py-2 text-[10.5px] font-mono leading-none border-0 text-center shadow-inner tracking-tight font-bold outline-none ${
                              isLight ? "bg-slate-200 text-slate-800" : "bg-slate-900 text-slate-300"
                            }`}
                          />
                          <button
                            onClick={() => handleCopyText(depositAddresses[paymentNetwork])}
                            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 text-xs font-black ${
                              isLight 
                                ? "bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800 shadow" 
                                : "bg-white/5 hover:bg-white/10 border-white/5 text-slate-300"
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {paymentTxCopied && copiedText === depositAddresses[paymentNetwork] && (
                          <motion.span
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-555 text-[8.5px] font-mono font-black text-emerald-500 float-right mt-1"
                          >
                            {t.copied}
                          </motion.span>
                        )}
                      </div>
                    </div>

                    {/* Waiting network and manual simulate complete triggers */}
                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-405 animate-pulse mt-1">
                      <Hourglass className="w-4 h-4 text-amber-500 animate-spin" />
                      <span>{language === "RU" ? "Ожидание оплаты в сети блокчейн..." : "Awaiting blockchain confirmation..."}</span>
                    </div>

                    <button
                      onClick={triggerVerifySimulation}
                      className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition duration-150 cursor-pointer text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-250 animate-bounce" />
                      <span>{t.payConfirmBtn}</span>
                    </button>
                  </div>
                )}

                {paymentStep === "verifying" && (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-5">
                    <div className="relative">
                      {/* Interactive blockchain circular network scan loader */}
                      <div className="w-16 h-16 rounded-full border-4 border-slate-400 border-t-emerald-500 animate-spin" />
                      <Activity className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-sm font-black font-sans">{t.payVerifying}</h4>
                      <p className="text-[10.5px] font-mono text-slate-405 animate-pulse">
                        {t.payHashCheck.replace("{amount}", activePaymentPlan === "VIP" ? "20" : "10")}
                      </p>
                    </div>

                    <div className="text-[8.5px] font-mono text-slate-500 mt-2 px-6 p-2 rounded-xl bg-slate-500/5 select-none text-left">
                      TXHASH_SCAN: 0x98f4cd... [MATCH ENCOUNTERED] <br />
                      CHAIN_INGRESS_HEIGHT: 184,812 [OK] <br />
                      CONFIRMATIONS: 12/12 [SUCCESS]
                    </div>
                  </div>
                )}

                {paymentStep === "success" && (
                  <div className="py-4 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center text-3xl">
                      <CheckCircle2 className="w-8 h-8 animate-bounce" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-base font-black font-sans text-emerald-500">{t.paySuccessTitle}</h4>
                      <p className={`text-xs font-medium leading-relaxed px-2 ${isLight ? "text-slate-655" : "text-slate-300"}`}>
                        {t.paySuccessDesc.replace("{plan}", activePaymentPlan === "VIP" ? "VIP" : "PRO")}
                      </p>
                    </div>

                    <button
                      onClick={commitPaymentSuccessUpgrade}
                      className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition duration-150 cursor-pointer text-center shadow-lg shadow-emerald-500/20"
                    >
                      {t.payFinish}
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
