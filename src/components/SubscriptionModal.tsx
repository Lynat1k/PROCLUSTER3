/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, Check, ShieldCheck, Zap, Award, Key, CreditCard, Clock, Sparkles, 
  RefreshCw, CheckCircle2, Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage } from "../lib/storage";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  language: "RU" | "EN" | "KZ";
  profileUser: any;
  onUpdateUser: (updatedUser: any) => void;
}

const LOCALIZATION = {
  RU: {
    title: "Тарифные планы ProCluster",
    subtitle: "Выберите план и откройте профессиональный аналитический потенциал",
    currentPlan: "Текущий тариф",
    activatedPlan: "План успешно изменен на",
    activationSuccess: "Тариф успешно активирован на 30 дней!",
    paymentMethod: "Оплата подписки",
    selectNetwork: "Выберите сеть для оплаты",
    payInstructions: "Для активации тарифа {plan} отправьте ровно {amount} USDT на указанный адрес.",
    blockchainVerify: "Проверка транзакции в блокчейне...",
    scanningBlocks: "Сканирование блоков на предмет перевода {amount} USDT...",
    paymentVerified: "Платёж подтвержден!",
    successDesc: "Система успешно верифицировала оплату в блокчейне. Лимиты вашего профиля повышены.",
    btnIpaid: "Я оплатил (Симулировать перевод)",
    btnFinish: "Завершить",
    btnActivate: "Подключить",
    copied: "Скопировано",
    propsCharts: "График в окне",
    propsMaxCandles: "Макс. свечей",
    propsCompression: "Шагов сжатия",
    propsIndicators: "Индикаторов",
    propsCustomSettings: "Параметры индикаторов",
    propsSaveDrawing: "Сохранение рисунков",
    propsTelegram: "Телеграм уведомления",
    propsAnomalies: "Аномалии кластеров",
    yes: "Да",
    no: "Нет",
    unlimited: "Безлимитно"
  },
  EN: {
    title: "ProCluster Subscription Tiers",
    subtitle: "Choose the perfect plan and unlock elite analytical workflows",
    currentPlan: "Current Plan",
    activatedPlan: "Subscription tier modified to",
    activationSuccess: "Tier successfully activated for 30 days!",
    paymentMethod: "Subscription Upgrade",
    selectNetwork: "Select Blockchain Protocol",
    payInstructions: "To activate the {plan} tier, dispatch exactly {amount} USDT to the deposit address.",
    blockchainVerify: "Verifying ledger state...",
    scanningBlocks: "Scanning block indices for a transfer of {amount} USDT...",
    paymentVerified: "Payment Ledger Confirmed!",
    successDesc: "Nodes successfully validated the receipt hashes. Enjoy your new elite capabilities.",
    btnIpaid: "I paid (Simulate Network Receipt)",
    btnFinish: "Finish",
    btnActivate: "Get Access",
    copied: "Copied!",
    propsCharts: "Charts count",
    propsMaxCandles: "Max candles",
    propsCompression: "Compression levels",
    propsIndicators: "Allowed indicators",
    propsCustomSettings: "Custom settings",
    propsSaveDrawing: "Saved drawings",
    propsTelegram: "Telegram Triggers",
    propsAnomalies: "Cluster Anomalies",
    yes: "Yes",
    no: "No",
    unlimited: "Unlimited"
  },
  KZ: {
    title: "ProCluster тарифтік жоспарлары",
    subtitle: "Кәсіби аналитикалық мүмкіндіктерді ашу үшін тарифті таңдаңыз",
    currentPlan: "Белсенді тариф",
    activatedPlan: "Тариф сәтті ауыстырылды:",
    activationSuccess: "Тариф 30 күнге сәтті қосылды!",
    paymentMethod: "Жазылым төлемі",
    selectNetwork: "Төлем үшін блокчейн желісін таңдаңыз",
    payInstructions: "{plan} тарифін қосу үшін көрсетілген мекенжайға дәл {amount} USDT жіберіңіз.",
    blockchainVerify: "Блокчейн желісінде транзакцияны тексеру...",
    scanningBlocks: "{amount} USDT аударымын блок хештерінен іздеу...",
    paymentVerified: "Төлем сәтті расталды!",
    successDesc: "Блокчейн транзакцияны сәтті қабылдады. Жаңа лимиттер іске қосылды.",
    btnIpaid: "Мен төледім (Аударуды симуляциялау)",
    btnFinish: "Аяқтау",
    btnActivate: "Қосу",
    copied: "Көшірілді",
    propsCharts: "Терезедегі графиктер",
    propsMaxCandles: "Макс. свеча саны",
    propsCompression: "Қысу деңгейлері",
    propsIndicators: "Индикаторлар саны",
    propsCustomSettings: "Жеке баптаулар",
    propsSaveDrawing: "Сызбаларды сақтау",
    propsTelegram: "Телеграм хабарлама",
    propsAnomalies: "Кластер аномалиялары",
    yes: "Иә",
    no: "Жоқ",
    unlimited: "Шексіз"
  }
};

const PLAN_LIMITS_METADATA = {
  Free: {
    charts: "1",
    candles: "700",
    compression: "1",
    indicators: "3",
    custom: false,
    drawings: false,
    telegram: false,
    anomalies: false,
    price: 0,
    idealRU: "Базовый аналитический пакет",
    idealEN: "Basic analytical workspace",
    idealKZ: "Бастапқы аналитикалық пакет"
  },
  Pro: {
    charts: "2",
    candles: "1400",
    compression: "2",
    indicators: "5",
    custom: true,
    drawings: true,
    telegram: false,
    anomalies: true,
    price: 19,
    idealRU: "Полный профиль объемов",
    idealEN: "Professional volume profiles",
    idealKZ: "Толық көлем профилі"
  },
  VIP: {
    charts: "2",
    candles: "Безлимитно",
    compression: "6",
    indicators: "15",
    custom: true,
    drawings: true,
    telegram: true,
    anomalies: true,
    price: 49,
    idealRU: "Элитный терминал без компромиссов",
    idealEN: "Elite institutional setup",
    idealKZ: "Элиталық шектеусіз терминал"
  }
};

export default function SubscriptionModal({
  isOpen,
  onClose,
  theme,
  language,
  profileUser,
  onUpdateUser
}: SubscriptionModalProps) {
  const isLight = theme === "light";
  const t = LOCALIZATION[language] || LOCALIZATION.EN;

  const [pricePro] = useState<number>(() => Number(storage.get("procluster_price_pro")) || 19);
  const [priceVip] = useState<number>(() => Number(storage.get("procluster_price_vip")) || 49);

  // checkout state
  const [activePaymentPlan, setActivePaymentPlan] = useState<"Pro" | "VIP" | null>(null);
  const [paymentStep, setPaymentStep] = useState<"network" | "deposit" | "verifying" | "success">("network");
  const [paymentNetwork, setPaymentNetwork] = useState<"trc20" | "erc20" | "bep20">("trc20");
  const [copiedText, setCopiedText] = useState("");
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [notification, setNotification] = useState("");

  const userTier = profileUser?.tier || "Free";

  const depositAddresses = {
    trc20: "TY2gCsm79k8H6xNcs9VbAr4Pmqw99pTdQp",
    erc20: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    bep20: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  };

  const executeDirectUpgrade = (targetTier: "Free" | "Pro" | "VIP", paymentDetails?: { pay: string; exp: string }) => {
    const today = paymentDetails?.pay || new Date().toISOString().split("T")[0];
    const expiry = paymentDetails?.exp || (targetTier === "Free" ? "Never" : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

    const updatedUser = {
      ...(profileUser || {
        name: "Пользователь",
        email: "guest@procluster.io",
        joinedDate: today,
        avatarUrl: ""
      }),
      tier: targetTier,
      role: targetTier === "VIP" ? "VIP" : targetTier === "Pro" ? "Pro" : "Free",
      subscriptionLevel: targetTier,
      paymentDate: targetTier === "Free" ? "N/A" : today,
      expireDate: expiry
    };

    onUpdateUser(updatedUser);
    storage.setJson("procluster_user", updatedUser);
    storage.set("procluster_role", targetTier);
    window.dispatchEvent(new CustomEvent("procluster_user_updated"));

    setNotification(`${t.activatedPlan}: ${targetTier}`);
    setTimeout(() => {
      setNotification("");
      onClose();
    }, 2800);
  };

  const handleCopyText = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedText(addr);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const startCheckout = (plan: "Pro" | "VIP") => {
    setActivePaymentPlan(plan);
    setPaymentStep("network");
    setPaymentNetwork("trc20");
  };

  const runVerifySimulation = () => {
    setPaymentStep("verifying");
    setTimeout(() => {
      setPaymentStep("success");
    }, 2605);
  };

  const commitPaymentUpgrade = () => {
    if (!activePaymentPlan) return;
    const nowStr = new Date().toISOString().split("T")[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const expStr = nextMonth.toISOString().split("T")[0];

    executeDirectUpgrade(activePaymentPlan, { pay: nowStr, exp: expStr });
    setActivePaymentPlan(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Semi-transparent backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#020408]/85 backdrop-blur-md"
        />

        {/* Modal Wrapper Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[24px] border relative z-10 flex flex-col shadow-2xl transition-all duration-300 ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-800"
              : "bg-[#060813] border-white/10 text-white"
          }`}
        >
          {/* Header area */}
          <div className={`p-5 flex items-center justify-between border-b shrink-0 ${
            isLight ? "bg-white border-slate-200" : "bg-[#090b1c]/90 border-white/5"
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
              <div>
                <h2 className="font-sans text-sm font-black uppercase tracking-wider">{t.title}</h2>
                <p className="text-[10px] text-slate-400 font-medium font-sans leading-none mt-0.5">{t.subtitle}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600" : "bg-white/5 hover:bg-white/10 border-white/5 text-slate-400"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrolling Content area */}
          <div className={`p-6 overflow-y-auto flex-1 ${isLight ? "scrollbar-thin-light" : "scrollbar-thin-dark"}`}>
            
            {/* Global temporary checkout feedback overlay */}
            {notification && (
              <div className="mb-4 text-xs font-black uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 p-3 rounded-xl flex items-center justify-center gap-2 shadow-md animate-bounce">
                <Check className="w-4 h-4" />
                <span>{notification}</span>
              </div>
            )}

            {activePaymentPlan ? (
              /* --- PAYMENT COGNITIVE COMPREHENSIVES FLOW --- */
              <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-white/[0.02] border-white/5"} max-w-lg mx-auto space-y-5`}>
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-black uppercase font-sans flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-550" />
                    {t.paymentMethod} &rarr; <span className="text-emerald-500">{activePaymentPlan}</span>
                  </span>
                  <button
                    onClick={() => setActivePaymentPlan(null)}
                    className="text-[10px] uppercase font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    {language === "RU" ? "Назад к тарифам" : "Back to plans"}
                  </button>
                </div>

                {paymentStep === "network" && (
                  <div className="space-y-4">
                    <p className="text-xs font-black tracking-wide text-slate-400 font-sans">{t.selectNetwork}:</p>
                    <div className="flex flex-col gap-3">
                      {[
                        { id: "trc20", name: "TRON (TRC-20)", fee: "1 USDT", logo: "TRX", color: "text-emerald-500 bg-emerald-500/10 ring-emerald-500/20" },
                        { id: "erc20", name: "Ethereum (ERC-20)", fee: "3 USDT", logo: "ETH", color: "text-blue-500 bg-blue-500/10 ring-blue-500/20" },
                        { id: "bep20", name: "BNB Chain (BEP-20)", fee: "0.2 USDT", logo: "BSC", color: "text-amber-500 bg-amber-500/10 ring-amber-500/20" }
                      ].map((net) => (
                        <button
                          key={net.id}
                          onClick={() => setPaymentNetwork(net.id as any)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                            paymentNetwork === net.id
                              ? "border-emerald-500 bg-emerald-500/[0.03] shadow-md"
                              : isLight ? "hover:bg-slate-50 border-slate-200" : "hover:bg-white/5 border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ${net.color}`}>{net.logo}</span>
                            <div>
                              <p className="text-xs font-black">{net.name}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">Комиссия ~{net.fee}, зачисление 1 мин</p>
                            </div>
                          </div>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            paymentNetwork === net.id ? "border-emerald-500" : "border-slate-500"
                          }`}>
                            {paymentNetwork === net.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setPaymentStep("deposit")}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer text-center"
                    >
                      {language === "RU" ? "Далее" : "Proceed"}
                    </button>
                  </div>
                )}

                {paymentStep === "deposit" && (
                  <div className="space-y-4 text-center">
                    <p className="text-xs leading-relaxed text-slate-300 font-sans text-left">
                      {t.payInstructions
                        .replace("{plan}", activePaymentPlan)
                        .replace("{amount}", activePaymentPlan === "VIP" ? priceVip.toString() : pricePro.toString())}
                    </p>

                    <div className={`p-4 rounded-xl border flex flex-col items-center gap-3 ${isLight ? "bg-slate-100 border-slate-200" : "bg-[#06080e]/60 border-white/5"}`}>
                      {/* Interactive address copying */}
                      <div className="w-full text-left space-y-1">
                        <span className="text-[10px] font-mono tracking-wider text-slate-420 font-bold uppercase block">Адрес депозита ({paymentNetwork.toUpperCase()}):</span>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            readOnly
                            value={depositAddresses[paymentNetwork]}
                            className={`flex-1 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border outline-none ${
                              isLight ? "bg-white border-slate-350 text-slate-850" : "bg-black/40 border-white/5 text-slate-350"
                            }`}
                          />
                          <button
                            onClick={() => handleCopyText(depositAddresses[paymentNetwork])}
                            className={`p-2 rounded-lg border transition cursor-pointer shrink-0 ${
                              isLight ? "bg-slate-50 hover:bg-slate-100 border-slate-300" : "bg-white/5 hover:bg-white/10 border-white/5"
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                          </button>
                        </div>
                        {copiedSuccess && (
                          <span className="text-[9px] font-bold text-emerald-500 font-sans block text-right pr-1 animate-pulse">{t.copied}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={runVerifySimulation}
                        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                      >
                        {t.btnIpaid}
                      </button>
                      <button
                        onClick={() => setPaymentStep("network")}
                        className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        {language === "RU" ? "Вернуться к выбору сети" : "Change network"}
                      </button>
                    </div>
                  </div>
                )}

                {paymentStep === "verifying" && (
                  <div className="py-8 text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xs font-black uppercase tracking-widest text-[#58A6FF]">{t.blockchainVerify}</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {t.scanningBlocks.replace("{amount}", activePaymentPlan === "VIP" ? priceVip.toString() : pricePro.toString())}
                    </p>
                  </div>
                )}

                {paymentStep === "success" && (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black uppercase text-emerald-500 tracking-wide font-sans">{t.paymentVerified}</h4>
                      <p className="text-[11px] font-medium leading-relaxed max-w-sm mx-auto text-slate-350">{t.successDesc}</p>
                    </div>
                    
                    <button
                      onClick={commitPaymentUpgrade}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.01] text-slate-950 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                    >
                      {t.btnFinish}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* --- COMPACT THREE-TIER PLANS CHIPSET --- */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                {/* 1. PLAN FREE */}
                <div className={`p-5 rounded-2xl flex flex-col justify-between gap-5 border transition-all ${
                  userTier === "Free"
                    ? isLight
                      ? "bg-white border-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.04)]"
                      : "bg-emerald-500/[0.015] border-emerald-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.3)]"
                    : isLight ? "bg-white/50 border-slate-200" : "bg-white/[0.01] border-white/5"
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-mono tracking-wider text-slate-400">Free</span>
                      {userTier === "Free" && <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">{t.currentPlan}</span>}
                    </div>

                    <div>
                      <span className="text-2xl font-black">$0</span>
                      <span className="text-[10px] text-slate-500"> / month</span>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{PLAN_LIMITS_METADATA.Free[`ideal${language}`]}</p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.04] text-[10px] font-mono leading-none">
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCharts}</span>
                        <span className="font-extrabold">{PLAN_LIMITS_METADATA.Free.charts}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsMaxCandles}</span>
                        <span className="font-extrabold">{PLAN_LIMITS_METADATA.Free.candles}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCompression}</span>
                        <span className="font-extrabold">{PLAN_LIMITS_METADATA.Free.compression}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsIndicators}</span>
                        <span className="font-extrabold">{PLAN_LIMITS_METADATA.Free.indicators}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCustomSettings}</span>
                        <span className="font-extrabold text-rose-500">{t.no}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsSaveDrawing}</span>
                        <span className="font-extrabold text-rose-500">{t.no}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">{t.propsAnomalies}</span>
                        <span className="font-extrabold text-rose-500">{t.no}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {userTier === "Free" ? (
                      <div className="w-full text-center py-2 rounded-xl text-[10px] font-extrabold bg-slate-500/10 text-slate-500">
                        {t.currentPlan}
                      </div>
                    ) : (
                      <button
                        onClick={() => executeDirectUpgrade("Free")}
                        className="w-full py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 border border-white/5 cursor-pointer text-center"
                      >
                        {language === "RU" ? "Перейти" : "Downgrade"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. PLAN PRO */}
                <div className={`p-5 rounded-2xl flex flex-col justify-between gap-5 border transition-all ${
                  userTier === "Pro"
                    ? isLight
                      ? "bg-white border-blue-400 shadow-[0_10px_30px_rgba(59,130,246,0.06)]"
                      : "bg-[#2FD3B2]/[0.015] border-[#2FD3B2]/40 shadow-[0_0_35px_rgba(45,212,178,0.22)]"
                    : isLight ? "bg-white/50 border-slate-200" : "bg-white/[0.01] border-white/5"
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-mono tracking-wider text-emerald-400">Pro</span>
                      {userTier === "Pro" && <span className="text-[9px] font-bold bg-[#2FD3B2]/10 text-[#2FD3B2] border border-[#2FD3B2]/20 px-2 py-0.5 rounded-full">{t.currentPlan}</span>}
                    </div>

                    <div>
                      <span className="text-2xl font-black">${pricePro}</span>
                      <span className="text-[10px] text-slate-500"> / month</span>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{PLAN_LIMITS_METADATA.Pro[`ideal${language}`]}</p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.04] text-[10px] font-mono leading-none">
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCharts}</span>
                        <span className="font-extrabold text-blue-400">{PLAN_LIMITS_METADATA.Pro.charts}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsMaxCandles}</span>
                        <span className="font-extrabold text-blue-400">{PLAN_LIMITS_METADATA.Pro.candles}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCompression}</span>
                        <span className="font-extrabold text-blue-400">{PLAN_LIMITS_METADATA.Pro.compression}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsIndicators}</span>
                        <span className="font-extrabold text-blue-400">{PLAN_LIMITS_METADATA.Pro.indicators}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCustomSettings}</span>
                        <span className="font-extrabold text-emerald-500">{t.yes}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsSaveDrawing}</span>
                        <span className="font-extrabold text-emerald-500">{t.yes}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">{t.propsAnomalies}</span>
                        <span className="font-extrabold text-emerald-500">{t.yes}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {userTier === "Pro" ? (
                      <div className="w-full text-center py-2 rounded-xl text-[10px] font-extrabold bg-[#2FD3B2]/10 text-[#2FD3B2]">
                        {t.currentPlan}
                      </div>
                    ) : (
                      <button
                        onClick={() => startCheckout("Pro")}
                        className="w-full py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all bg-[#1CD5A6] hover:bg-[#21ebd1] text-slate-950 font-black tracking-wider cursor-pointer text-center block shadow-[0_2px_15px_rgba(28,213,166,0.2)]"
                      >
                        {t.btnActivate}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. PLAN VIP */}
                <div className={`p-5 rounded-2xl flex flex-col justify-between gap-5 border transition-all ${
                  userTier === "VIP"
                    ? isLight
                      ? "bg-white border-amber-400 shadow-[0_10px_30px_rgba(245,158,11,0.06)]"
                      : "bg-amber-500/[0.015] border-amber-500/30 shadow-[0_0_35px_rgba(245,158,11,0.22)]"
                    : isLight ? "bg-white/50 border-slate-200" : "bg-white/[0.01] border-white/5"
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase font-mono tracking-wider text-amber-500">VIP</span>
                      {userTier === "VIP" && <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">{t.currentPlan}</span>}
                    </div>

                    <div>
                      <span className="text-2xl font-black">${priceVip}</span>
                      <span className="text-[10px] text-slate-500"> / month</span>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{PLAN_LIMITS_METADATA.VIP[`ideal${language}`]}</p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.04] text-[10px] font-mono leading-none">
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCharts}</span>
                        <span className="font-extrabold text-amber-500">{PLAN_LIMITS_METADATA.VIP.charts}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsMaxCandles}</span>
                        <span className="font-extrabold text-amber-500">{t.unlimited}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCompression}</span>
                        <span className="font-extrabold text-amber-500">{PLAN_LIMITS_METADATA.VIP.compression}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsIndicators}</span>
                        <span className="font-extrabold text-amber-500">{PLAN_LIMITS_METADATA.VIP.indicators}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsCustomSettings}</span>
                        <span className="font-extrabold text-emerald-500">{t.yes}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/[0.02]">
                        <span className="text-slate-400">{t.propsSaveDrawing}</span>
                        <span className="font-extrabold text-emerald-500">{t.yes}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">{t.propsTelegram}</span>
                        <span className="font-extrabold text-emerald-500">{t.yes}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {userTier === "VIP" ? (
                      <div className="w-full text-center py-2 rounded-xl text-[10px] font-extrabold bg-amber-500/10 text-amber-500">
                        {t.currentPlan}
                      </div>
                    ) : (
                      <button
                        onClick={() => startCheckout("VIP")}
                        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer text-center block shadow-[0_2px_15px_rgba(245,158,11,0.25)]"
                      >
                        {t.btnActivate}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
