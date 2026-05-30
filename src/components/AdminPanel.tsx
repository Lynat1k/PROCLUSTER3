import React, { useState, useEffect, useRef } from "react";
import { CryptoPair } from "../types";
import { 
  X, 
  Play, 
  Pause, 
  AlertTriangle, 
  ArrowUp, 
  ArrowDown, 
  Activity, 
  Trash2, 
  ShieldAlert, 
  Cpu, 
  Check, 
  Zap, 
  DollarSign, 
  RefreshCw, 
  BarChart2, 
  ArrowLeft, 
  Server, 
  HardDrive, 
  Users, 
  Globe, 
  Download, 
  Plus, 
  Calendar, 
  Terminal,
  Settings,
  Edit2,
  Database,
  TrendingUp,
  Radio,
  Wifi
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "dark" | "light";
  activePair: CryptoPair;
  pairs: CryptoPair[];
  connectionStatus: "connected" | "syncing" | "stale";
  isTickingAll: boolean;
  onToggleTicking: () => void;
  onSetConnectionStatus: (status: "connected" | "syncing" | "stale") => void;
  onUpdatePairPrice: (symbol: string, newPrice: number) => void;
  onInjectWhaleTrade: (side: "buy" | "sell", amount: number) => void;
  onClearHistory: () => void;
  onApplyAnomaly: (type: "pump" | "dump" | "spike" | "whale-wall") => void;
  marketType: "SPOT" | "FUTURES";
  onSetMarketType: (type: "SPOT" | "FUTURES") => void;
  onAddPair?: (newPair: CryptoPair) => void;
}

interface ClientConnection {
  id: string;
  ip: string;
  geo: string;
  origin: string;
  sub: string;
  status: string;
  ping: number;
}

export default function AdminPanel({
  isOpen,
  onClose,
  theme,
  activePair,
  pairs,
  connectionStatus,
  isTickingAll,
  onToggleTicking,
  onSetConnectionStatus,
  onUpdatePairPrice,
  onInjectWhaleTrade,
  onClearHistory,
  onApplyAnomaly,
  marketType,
  onSetMarketType,
  onAddPair
}: AdminPanelProps) {
  const isLight = theme === "light";

  // Active view tabs
  const [activeTab, setActiveTab] = useState<"server" | "database" | "users">("server");

  // State sections
  const [activeTokenParam, setActiveTokenParam] = useState<string>(activePair.symbol);
  const [customPriceInput, setCustomPriceInput] = useState<string>("");
  const [whaleAmountInput, setWhaleAmountInput] = useState<string>("500");
  const [customTickerLogs, setCustomTickerLogs] = useState<string[]>([]);
  
  // Default Chart Compression levels map: { [ticker]: { [timeframe]: multiplier } }
  const [defaultCompressions, setDefaultCompressions] = useState<Record<string, Record<string, number>>>(() => {
    const saved = localStorage.getItem("procluster_default_compressions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse default compressions", e);
      }
    }
    return {};
  });

  const [activeCompTicker, setActiveCompTicker] = useState<string>(activePair.symbol);

  // State for user groups / tier settings
  const [selectedGroup, setSelectedGroup] = useState<"guest" | "free" | "pro" | "vip" | "admin" >("guest");
  
  const [tierSettings, setTierSettings] = useState<Record<"guest" | "free" | "pro" | "vip" | "admin", {
    maxHistory: number;
    compressionLevels: number;
    maxIndicators: number;
    customIndicatorSettings: boolean;
    telegramNotifications: boolean;
  }>>(() => {
    const saved = localStorage.getItem("procluster_tier_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (!parsed.guest) {
            parsed.guest = { maxHistory: 100, compressionLevels: 1, maxIndicators: 1, customIndicatorSettings: false, telegramNotifications: false };
          }
          for (const k of Object.keys(parsed)) {
            const s = parsed[k];
            if (s && typeof s.compressionLevels === "number") {
              s.compressionLevels = Math.min(6, Math.max(1, s.compressionLevels));
            }
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse tier settings", e);
      }
    }
    return {
      guest: { maxHistory: 100, compressionLevels: 1, maxIndicators: 1, customIndicatorSettings: false, telegramNotifications: false },
      free: { maxHistory: 200, compressionLevels: 2, maxIndicators: 2, customIndicatorSettings: false, telegramNotifications: false },
      pro: { maxHistory: 1000, compressionLevels: 4, maxIndicators: 5, customIndicatorSettings: true, telegramNotifications: false },
      vip: { maxHistory: 5000, compressionLevels: 5, maxIndicators: 15, customIndicatorSettings: true, telegramNotifications: true },
      admin: { maxHistory: 10000, compressionLevels: 6, maxIndicators: 99, customIndicatorSettings: true, telegramNotifications: true }
    };
  });

  const [policySuccessMsg, setPolicySuccessMsg] = useState("");

  const updateTierSetting = (group: "guest" | "free" | "pro" | "vip" | "admin", key: string, value: any) => {
    let sanitizedValue = value;
    if (key === "compressionLevels") {
      sanitizedValue = Math.min(6, Math.max(1, parseInt(value) || 1));
    }
    setTierSettings(prev => {
      const updated = {
        ...prev,
        [group]: {
          ...prev[group],
          [key]: sanitizedValue
        }
      };
      localStorage.setItem("procluster_tier_settings", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("procluster_tier_settings", JSON.stringify(tierSettings));
    window.dispatchEvent(new Event("procluster_tier_settings_updated"));
    setPolicySuccessMsg("Политики ограничений успешно сохранены!");
    setTimeout(() => setPolicySuccessMsg(""), 3000);
  };

  // Auto-save default compressions to localStorage
  const updateDefaultCompression = (ticker: string, intervalVal: string, value: number) => {
    setDefaultCompressions(prev => {
      const updated = {
        ...prev,
        [ticker]: {
          ...(prev[ticker] || {}),
          [intervalVal]: value
        }
      };
      localStorage.setItem("procluster_default_compressions", JSON.stringify(updated));
      return updated;
    });
  };
  
  // Real-time server resource simulator values
  const [cpuUsage, setCpuUsage] = useState<number>(31.4);
  const [ramUsageGB, setRamUsageGB] = useState<number>(6.42);
  const [diskUsageGB, setDiskUsageGB] = useState<number>(184.2);
  const [hostsCount, setHostsCount] = useState<number>(1482);
  const [onlineCount, setOnlineCount] = useState<number>(342);
  const [registeredUsersCount, setRegisteredUsersCount] = useState<number>(12985);

  interface AdminUser {
    id: string;
    nickname: string;
    registerDate: string;
    subscriptionLevel: "free" | "RPO" | "VIP";
    ip: string;
    country: string;
  }

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([
    { id: "usr_001", nickname: "@cryptomaster", registerDate: "2026-05-24", subscriptionLevel: "free", ip: "185.220.101.5", country: "Germany 🇩🇪" },
    { id: "usr_002", nickname: "@whale_hunter", registerDate: "2026-04-12", subscriptionLevel: "VIP", ip: "91.198.174.19", country: "Japan 🇯🇵" },
    { id: "usr_003", nickname: "@scalper_pro", registerDate: "2026-03-20", subscriptionLevel: "RPO", ip: "104.244.42.1", country: "USA 🇺🇸" },
    { id: "usr_004", nickname: "@moonwalker", registerDate: "2025-12-14", subscriptionLevel: "free", ip: "8.8.8.8", country: "United Kingdom 🇬🇧" },
    { id: "usr_005", nickname: "@kzt_trader", registerDate: "2026-02-18", subscriptionLevel: "RPO", ip: "178.90.220.44", country: "Kazakhstan 🇰🇿" },
  ]);

  // Editing and dynamic additions state for Users Tab
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editLevel, setEditLevel] = useState<"free" | "RPO" | "VIP">("free");

  const [newNickInput, setNewNickInput] = useState("");
  const [newLevelInput, setNewLevelInput] = useState<"free" | "RPO" | "VIP">("free");
  const [newIpInput, setNewIpInput] = useState("");
  const [newCountryInput, setNewCountryInput] = useState("");
  const [userSuccessMsg, setUserSuccessMsg] = useState("");

  // Live connections simulation
  const [clients, setClients] = useState<ClientConnection[]>([
    { id: "usr_208", ip: "185.220.101.5", geo: "Frankfurt, DE", origin: "Web client", sub: "SOL/USDT, BTC/USDT", status: "online", ping: 24 },
    { id: "usr_532", ip: "91.198.174.19", geo: "Tokyo, JP", origin: "Desktop App", sub: "BTC/USDT", status: "online", ping: 112 },
    { id: "usr_401", ip: "104.244.42.1", geo: "New York, USA", origin: "iOS Platform", sub: "ETH/USDT, SOL/USDT", status: "online", ping: 45 },
    { id: "usr_014", ip: "8.8.8.8", geo: "London, UK", origin: "Web client", sub: "ALL_ACTIVE", status: "online", ping: 18 },
    { id: "usr_995", ip: "194.154.20.4", geo: "Lagos, NG", origin: "Android Dev", sub: "SOL/USDT", status: "online", ping: 178 }
  ]);

  // New Ticker Form state
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newPriceStep, setNewPriceStep] = useState("1");
  const [compressionSpotVal, setCompressionSpotVal] = useState("2");
  const [compressionFuturesVal, setCompressionFuturesVal] = useState("5");
  const [tickerSuccessMsg, setTickerSuccessMsg] = useState("");

  // Historical download state
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStep, setDownloadStep] = useState<string>("");
  const [histTicker, setHistTicker] = useState<string>(activePair.symbol);
  const [histType, setHistType] = useState<"SPOT" | "FUTURES">("SPOT");
  const [histStartDate, setHistStartDate] = useState<string>("2026-05-01");
  const [histEndDate, setHistEndDate] = useState<string>("2026-05-25");

  // Load default price value
  useEffect(() => {
    setCustomPriceInput(activePair.price.toString());
  }, [activePair.symbol]);

  // Telemetry logs simulation
  useEffect(() => {
    if (!isOpen) return;

    // Seed logs
    setCustomTickerLogs([
      `[System] Панель администратора запущена в режиме full-page`,
      `[Engine] Симулятор запущен: ${activePair.symbol} | Шаг шкалы: ${activePair.priceStep}`,
      `[Telemetry] База данных In-Memory активна. Буфер кадров пуст.`,
      `[Environment] Node.JS v21.4.0 Container Core | Port: 3000 Ingress`,
      `[Database] Запуск проверки консистентности кластеров... OK`
    ]);

    const logUpdateInterval = setInterval(() => {
      const messages = [
        `[Heartbeat] Опрос сетевых хостов. Задержка ПДД: ${Math.floor(22 + Math.random() * 20)}мс`,
        `[Ingress] Получен пакет Binance AggrTrade: ${activePair.symbol} @ $${activePair.price.toLocaleString()}`,
        `[Memory] Сжатие данных свечей завершено. Освобождено ${(1.2 + Math.random() * 0.5).toFixed(2)}Кб`,
        `[GC] Сборщик мусора освободил неиспользуемые ячейки стакана.`,
        `[Client Socket] Синхронизация трансляции глубины стакана для ${onlineCount + Math.floor(Math.random() * 5 - 2)} трейдеров`
      ];
      setCustomTickerLogs(prev => {
        const next = [...prev, messages[Math.floor(Math.random() * messages.length)]];
        return next.slice(-45);
      });
    }, 4500);

    // Smooth resource fluctuate simulator & clients ping changes
    const resourceInterval = setInterval(() => {
      setCpuUsage(prev => {
        const delta = (Math.random() - 0.5) * 5;
        return Math.min(85, Math.max(8, parseFloat((prev + delta).toFixed(1))));
      });
      setRamUsageGB(prev => {
        const delta = (Math.random() - 0.5) * 0.08;
        return Math.min(12, Math.max(4.5, parseFloat((prev + delta).toFixed(2))));
      });
      setHostsCount(prev => prev + (Math.random() > 0.55 ? 1 : Math.random() < 0.45 ? -1 : 0));
      setOnlineCount(prev => {
        const ch = Math.floor((Math.random() - 0.5) * 4);
        return Math.min(500, Math.max(120, prev + ch));
      });

      // Fluctuate pings
      setClients(current => 
        current.map(c => ({
          ...c,
          ping: Math.max(5, Math.min(300, c.ping + Math.floor((Math.random() - 0.5) * 12)))
        }))
      );
    }, 2500);

    return () => {
      clearInterval(logUpdateInterval);
      clearInterval(resourceInterval);
    };
  }, [isOpen, activePair.symbol, onlineCount]);

  // scroll logs to end
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsEndRef.current && activeTab === "server") {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [customTickerLogs, activeTab]);

  if (!isOpen) return null;

  // Actions
  const handleApplyPriceChange = () => {
    const nextVal = parseFloat(customPriceInput);
    if (!isNaN(nextVal) && nextVal > 0) {
      onUpdatePairPrice(activeTokenParam, nextVal);
      setCustomTickerLogs(prev => [
        ...prev, 
        `[Core Override] Администратор принудительно установил курс для ${activeTokenParam}: $${nextVal.toLocaleString()}`
      ]);
    }
  };

  const handleClear = () => {
    onClearHistory();
    setCustomTickerLogs(prev => [
      ...prev,
      `[Engine Flash] Историческая память котировок и графиков полностью стерта.`
    ]);
  };

  // Binance vision downloader simulator
  const handleDownloadBinanceVision = () => {
    if (downloadProgress !== null) return;
    setDownloadProgress(0);
    setDownloadStep("1/5 Подключение к Binance Vision CDN (data.binance.vision)...");
    
    const messages = [
      { progress: 15, text: "2/5 Получение метаданных агрегированных сделок Spot/Futures..." },
      { progress: 42, text: `3/5 Загрузка архива ${histTicker.replace("/", "")}-aggTrades-${histStartDate}-to-${histEndDate}.zip...` },
      { progress: 78, text: "4/5 Распаковка CSV и парсинг потока миллисекундных сделок Binance..." },
      { progress: 95, text: "5/5 Слияние агрегатов во внутреннюю структуру ячеек footprint..." },
      { progress: 100, text: `Успешно импортировано за секунды! Загружено исторических тиков.` }
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        const currentMsg = messages[i];
        setDownloadProgress(currentMsg.progress);
        setDownloadStep(currentMsg.text);
        
        setCustomTickerLogs(prev => [
          ...prev,
          `[Binance Vision] ${currentMsg.text} (${currentMsg.progress}%)`
        ]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDownloadProgress(null);
          setDownloadStep("");
        }, 3000);
      }
    }, 1200);
  };

  // Add Dynamic Ticker Form
  const handleAddNewTicker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol || !newName) {
      alert("Заполните базовые поля!");
      return;
    }

    const priceNum = 100.0;
    const stepNum = parseFloat(newPriceStep);
    const compSpot = parseInt(compressionSpotVal) || 2;
    const compFut = parseInt(compressionFuturesVal) || 5;

    const addedPair: CryptoPair = {
      symbol: newSymbol.toUpperCase().trim(),
      name: newName.trim(),
      price: priceNum,
      change24h: 0.0,
      volume24h: 0,
      delta24h: 0.0,
      priceStep: isNaN(stepNum) || stepNum <= 0 ? 1 : stepNum,
      compressionSpot: compSpot,
      compressionFutures: compFut
    };

    if (onAddPair) {
      onAddPair(addedPair);
      setTickerSuccessMsg(`Тикер ${addedPair.symbol} успешно зарегистрирован! Сжатие Spot: ${compSpot}x, Futures: ${compFut}x`);
      setCustomTickerLogs(prev => [
        ...prev,
        `[Admin] Добавлен новый торговый инструмент: ${addedPair.symbol} | Сжатие Spot: ${compSpot}x, Futures: ${compFut}x`
      ]);
      
      // Reset form
      setNewSymbol("");
      setNewName("");
      setTimeout(() => setTickerSuccessMsg(""), 505);
    } else {
      alert("Система динамических тикеров не подключена!");
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative z-40 overflow-y-auto ${
      isLight ? "bg-slate-50 text-slate-900" : "bg-[#060813] text-slate-100"
    } p-6 gap-6 font-sans select-none`}>
      
      {/* HEADER SECTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-500/10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer hover:scale-102 active:scale-98 transition ${
              isLight 
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm" 
                : "bg-slate-900 border-white/5 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Вернуться на Терминал</span>
          </button>
          
          <div className="h-5 w-px bg-slate-500/20 hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-500 animate-spin-slow animate-spin" />
              Панель Администратора
            </h1>
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-mono font-black ${
              isLight ? "bg-red-50 text-red-700 border border-red-200" : "bg-red-500/10 text-red-400 border border-red-500/15"
            }`}>
              CORE MODE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono ${isLight ? "text-slate-600 font-bold" : "text-slate-400"}`}>Состояние Симулятора:</span>
          <div className="flex gap-1.5 p-0.5 rounded-lg border bg-slate-950/20 border-white/5">
            <button
              onClick={onToggleTicking}
              className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isTickingAll
                  ? isLight 
                    ? "bg-emerald-600 text-white shadow-sm font-extrabold" 
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  : isLight 
                    ? "bg-rose-600 text-white shadow-sm font-extrabold" 
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/20"
              }`}
            >
              <Zap className={`w-3 h-3 ${isTickingAll ? "animate-bounce" : ""}`} />
              {isTickingAll ? "Тики Идут" : "Генерация Пауза"}
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC TAB CONTROLS */}
      <div className="flex border-b border-slate-500/15 gap-2 pb-px shrink-0">
        <button
          onClick={() => setActiveTab("server")}
          className={`px-5 py-2.5 rounded-t-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-t-2 border-x transition-all duration-150 cursor-pointer ${
            activeTab === "server"
              ? isLight
                ? "bg-white border-t-blue-500 border-x-slate-200 text-slate-900 shadow-sm" 
                : "bg-slate-900 border-t-blue-500 border-x-white/5 text-white"
              : isLight
                ? "bg-transparent border-t-transparent border-x-transparent text-slate-600 hover:bg-slate-200/40 hover:text-slate-800"
                : "bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
          }`}
        >
          <Cpu className="w-4 h-4 text-blue-500" />
          <span>Сервер</span>
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`px-5 py-2.5 rounded-t-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-t-2 border-x transition-all duration-150 cursor-pointer ${
            activeTab === "database"
              ? isLight
                ? "bg-white border-t-emerald-500 border-x-slate-200 text-slate-900 shadow-sm" 
                : "bg-slate-900 border-t-emerald-500 border-x-white/5 text-white"
              : isLight
                ? "bg-transparent border-t-transparent border-x-transparent text-slate-600 hover:bg-slate-200/40 hover:text-slate-800"
                : "bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
          }`}
        >
          <Database className="w-4 h-4 text-emerald-500" />
          <span>База Данных</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-5 py-2.5 rounded-t-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-t-2 border-x transition-all duration-150 cursor-pointer ${
            activeTab === "users"
              ? isLight
                ? "bg-white border-t-amber-500 border-x-slate-200 text-slate-900 shadow-sm" 
                : "bg-slate-900 border-t-amber-500 border-x-white/5 text-white"
              : isLight
                ? "bg-transparent border-t-transparent border-x-transparent text-slate-600 hover:bg-slate-200/40 hover:text-slate-800"
                : "bg-transparent border-t-transparent border-x-transparent text-slate-400 hover:bg-white/[0.02] hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 text-amber-500" />
          <span>Пользователи</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col gap-6 min-h-0"
        >
          
          {/* TAB 1: SERVER CONTROLS & MONITORING */}
          {activeTab === "server" && (
            <div className="flex-1 flex flex-col gap-6 min-h-0">
              
              {/* SERVER METRICS ROW */}
              <div className={`p-5 rounded-2xl border ${
                isLight ? "bg-white border-slate-200" : "bg-slate-950/40 border-white/5"
              }`}>
                <h3 className="text-xs font-bold font-mono text-slate-400 mb-4 flex items-center gap-2 justify-start uppercase">
                  <Cpu className="w-4 h-4 text-slate-400 animate-pulse" /> Спецификация & нагрузка на веб-сервер
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* CPU LOAD BAR */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Нагрузка Процессора (CPU)
                      </span>
                      <span className="font-mono font-bold text-orange-400">{cpuUsage}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-orange-500 transition-all duration-350"
                        style={{ width: `${cpuUsage}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-mono">Simulated VM Load Core | Multi-Thread</span>
                  </div>

                  {/* RAM USE */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Занятая ОЗУ (RAM)
                      </span>
                      <span className="font-mono font-bold text-emerald-400">{ramUsageGB} GB / 16.0 GB</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-350"
                        style={{ width: `${(ramUsageGB / 16) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-mono">Ingress Buffer & Candlestick matrix size</span>
                  </div>

                  {/* DISK SPACE */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Память Диска (SSD Capacity)
                      </span>
                      <span className="font-mono font-bold text-purple-400">{diskUsageGB} GB / 512.0 GB</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${(diskUsageGB / 512) * 105}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-mono">Footprint cells compressed storage database</span>
                  </div>
                </div>
              </div>

              {/* SERVER TERMINAL DIAGNOSTICS LOGS CONSOLE */}
              <div className={`flex-1 flex flex-col min-h-[300px] rounded-2xl p-5 border gap-3 ${
                isLight ? "bg-white border-slate-200" : "bg-slate-950/40 border-white/5"
              }`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold tracking-wider font-mono text-slate-500 flex items-center gap-2 uppercase">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    Логи Диагностики & Симуляции Терминала
                  </span>
                  <span className="font-mono text-[10px] bg-red-500/15 border border-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full animate-pulse">
                    LIVE TELEMETRY
                  </span>
                </div>

                <div className={`flex-1 min-h-[220px] rounded-xl p-4 font-mono text-[10.5px] overflow-y-auto leading-relaxed border select-text shadow-inner ${
                  isLight 
                    ? "bg-slate-900 text-slate-200 border-slate-300" 
                    : "bg-[#02050e] text-[#00ff66] border-white/5"
                }`}>
                  <div className="flex flex-col gap-1.5">
                    {customTickerLogs.map((log, index) => (
                      <div key={index} className="flex gap-2.5 hover:bg-white/5 py-0.5 px-1.5 rounded transition-colors duration-100">
                        <span className="text-slate-500 shrink-0 select-none">[{index + 1}]</span>
                        <span className="whitespace-pre-wrap">{log}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>ОБРАБОТКА ПОТОКА: 125,482 TICKS/SEC</span>
                  <span>ОЗУ БУФЕРА: INGRESS COMPACT</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DATABASE COINS, PRICE SETTING, SCRAPING HISTORICAL DATA */}
          {activeTab === "database" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              
              {/* LEFT COLUMN: REGISTRY (span 7) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* BOX 1: ADD COIN & SET GRIDS */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                    isLight ? "text-emerald-700" : "text-emerald-500"
                  }`}>
                    <Plus className="w-4 h-4" />
                    Добавление и Сжатие Новых Монет
                  </h3>
                  <p className={`text-xs leading-relaxed ${
                    isLight ? "text-slate-600 font-medium" : "text-slate-400"
                  }`}>
                    Внесите в систему новые рыночные активы. Также укажите степень сжатия цен стакана для Spot (в базовых пунктах) и Futures (в усредненных интервалах объемов).
                  </p>

                  {tickerSuccessMsg && (
                    <div className={`p-3 rounded-xl text-xs font-bold border ${
                      isLight 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-850" 
                        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    }`}>
                      {tickerSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleAddNewTicker} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    <div>
                      <label className={`text-[10px] font-mono font-bold block mb-1 uppercase ${
                        isLight ? "text-slate-700" : "text-slate-400"
                      }`}>Символ Токена (Например: SOL/USDT)</label>
                      <input
                        type="text"
                        required
                        placeholder="SOL/USDT"
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value)}
                        className={`w-full text-xs font-mono font-bold rounded-lg px-3 py-2 border shadow-inner transition-colors ${
                          isLight 
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                            : "bg-slate-900 border-white/5 text-white focus:border-emerald-500"
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-[10px] font-mono font-bold block mb-1 uppercase ${
                        isLight ? "text-slate-700" : "text-slate-400"
                      }`}>Название Проекта (Solana)</label>
                      <input
                        type="text"
                        required
                        placeholder="Solana"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className={`w-full text-xs font-bold rounded-lg px-3 py-2 border shadow-inner transition-colors ${
                          isLight 
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                            : "bg-slate-900 border-white/5 text-white focus:border-emerald-500"
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-[10px] font-mono font-bold block mb-1 uppercase ${
                        isLight ? "text-slate-700" : "text-slate-400"
                      }`}>Базовый Шаг Стакана (Price Step)</label>
                      <select
                        value={newPriceStep}
                        onChange={(e) => setNewPriceStep(e.target.value)}
                        className={`w-full text-xs font-mono font-bold rounded-lg px-3 py-2 border shadow-inner transition-colors ${
                          isLight 
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                            : "bg-slate-900 border-white/10 text-white focus:border-emerald-500"
                        }`}
                      >
                        <option value="10">10 (Например Bitcoin)</option>
                        <option value="1">1 (Например Ethereum)</option>
                        <option value="0.5">0.5 (Средний шаг)</option>
                        <option value="0.1">0.1 (Например Solana)</option>
                        <option value="0.01">0.01 (Мелкие токены)</option>
                        <option value="0.001">0.001 (Ripple)</option>
                      </select>
                    </div>

                    <div className={`p-3 rounded-lg border flex flex-col gap-1 md:col-span-2 ${
                      isLight ? "bg-blue-50/70 border-blue-200" : "bg-blue-500/5 border-blue-500/10"
                    }`}>
                      <span className={`text-[10px] font-mono font-bold uppercase block tracking-wider mb-2 ${
                        isLight ? "text-blue-700" : "text-blue-400"
                      }`}>Настройки Степени Сжатия</span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`text-[9.5px] font-[600] block mb-1 ${
                            isLight ? "text-slate-700" : "text-slate-400"
                          }`}>Сжатие Spot Данных (Коэффициент)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max="20"
                              value={compressionSpotVal}
                              onChange={(e) => setCompressionSpotVal(e.target.value)}
                              className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
                                isLight ? "bg-slate-300 accent-blue-600" : "bg-slate-800 accent-blue-500"
                              }`}
                            />
                            <span className="text-xs font-mono font-bold">{compressionSpotVal}x</span>
                          </div>
                        </div>

                        <div>
                          <label className={`text-[9.5px] font-[600] block mb-1 ${
                            isLight ? "text-slate-700" : "text-slate-400"
                          }`}>Сжатие Futures Данных (Коэффициент)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={compressionFuturesVal}
                              onChange={(e) => setCompressionFuturesVal(e.target.value)}
                              className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
                                isLight ? "bg-slate-300 accent-blue-600" : "bg-slate-800 accent-blue-500"
                              }`}
                            />
                            <span className="text-xs font-mono font-bold">{compressionFuturesVal}x</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`md:col-span-2 px-4 py-2.5 rounded-xl font-black transition tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer ${
                        isLight 
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow" 
                          : "bg-emerald-500 text-slate-950 hover:bg-emerald-600"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Зарегистрировать Тикер в Реестре Терминала
                    </button>
                  </form>
                </div>

                {/* DEFAULT CHART COMPRESSIONS BY TICKER AND TIMEFRAME */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                      isLight ? "text-blue-700" : "text-blue-500"
                    }`}>
                      <BarChart2 className="w-4 h-4" />
                      Сжатие графика по умолчанию (по тикерам и таймфреймам)
                    </h3>
                  </div>
                  <p className={`text-xs leading-relaxed ${
                    isLight ? "text-slate-600 font-medium" : "text-slate-400"
                  }`}>
                    Настройте множитель сжатия по умолчанию для любой комбинации торговой пары и таймфрейма. Эти значения автоматически применятся при переключении графиков на терминале.
                  </p>

                  <div className="flex flex-col gap-4 font-sans text-xs">
                    <div>
                      <label className={`text-[10px] font-mono font-bold block mb-1 uppercase ${
                        isLight ? "text-slate-700" : "text-slate-400"
                      }`}>Выберите Торговую Пару для настройки</label>
                      <select
                        value={activeCompTicker}
                        onChange={(e) => setActiveCompTicker(e.target.value)}
                        className={`w-full text-xs font-mono font-bold rounded-lg px-3 py-2 border shadow-inner transition-colors ${
                          isLight 
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" 
                            : "bg-slate-900 border-white/10 text-white focus:border-blue-500/50"
                        }`}
                      >
                        {pairs.map(p => (
                          <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`rounded-xl border p-4 ${
                      isLight ? "bg-slate-50/50 border-slate-200" : "bg-white/[0.02] border-white/5"
                    }`}>
                      <span className={`text-[10px] font-mono font-black uppercase block tracking-wider mb-3 ${
                        isLight ? "text-slate-750" : "text-slate-300"
                      }`}>
                        Таймфреймы для {activeCompTicker}
                      </span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {["1m", "5m", "15m", "30m", "1h", "4h", "50t"].map((intervalVal) => {
                          const currentVal = defaultCompressions[activeCompTicker]?.[intervalVal] || 1;
                          
                          return (
                            <div key={intervalVal} className={`flex items-center justify-between p-2 rounded-lg border ${
                              isLight ? "bg-white border-slate-200/60" : "bg-slate-900/60 border-white/5"
                            }`}>
                              <span className="font-mono font-black text-xs text-sky-450 uppercase">{intervalVal}</span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={currentVal}
                                  onChange={(e) => updateDefaultCompression(activeCompTicker, intervalVal, parseInt(e.target.value))}
                                  className={`text-xs font-mono font-bold rounded px-2 py-1 border transition-colors focus:outline-none ${
                                    isLight 
                                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500" 
                                      : "bg-slate-950 border-white/10 text-white focus:border-blue-505"
                                  }`}
                                >
                                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].map((m) => (
                                    <option key={m} value={m}>{m}x</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: HISTORICAL DATA SCRAPET (span 5) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* BINANCE VISION CDN DOWNLOADER */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-yellow-500">
                    <Download className="w-4 h-4 text-goldenrod" />
                    Загрузка исторических данных (Binance Vision)
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Импортируйте сырой массив агрегированных сделок (zip format) напрямую из архивов <code className="text-blue-400">data.binance.vision</code>.
                  </p>

                  <div className="flex flex-col gap-3.5 text-xs font-sans">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-500 block mb-1">ТИКЕР</label>
                        <select
                          value={histTicker}
                          onChange={(e) => setHistTicker(e.target.value)}
                          className={`w-full text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 border ${
                            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10 text-white"
                          }`}
                        >
                          {pairs.map(p => (
                            <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-500 block mb-1">СЕГМЕНТ</label>
                        <select
                          value={histType}
                          onChange={(e) => setHistType(e.target.value as any)}
                          className={`w-full text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 border ${
                            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10 text-white"
                          }`}
                        >
                          <option value="SPOT">SPOT (Сделки)</option>
                          <option value="FUTURES">FUTURES (USD-M)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-500 block mb-1">С (Начало диапазона)</label>
                        <input
                          type="date"
                          value={histStartDate}
                          onChange={(e) => setHistStartDate(e.target.value)}
                          className={`w-full text-xs font-mono rounded-lg px-2.5 py-1.5 border ${
                            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10 text-white"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-500 block mb-1">По (Конец диапазона)</label>
                        <input
                          type="date"
                          value={histEndDate}
                          onChange={(e) => setHistEndDate(e.target.value)}
                          className={`w-full text-xs font-mono rounded-lg px-2.5 py-1.5 border ${
                            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10 text-white"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Progress reporting UI */}
                    {downloadProgress !== null && (
                      <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 flex flex-col gap-2">
                        <div className="flex justify-between text-[10px] font-mono font-bold">
                          <span className="text-blue-400">Импорт Прогресс:</span>
                          <span className="text-blue-400">{downloadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono italic text-slate-450 block truncate">{downloadStep}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadBinanceVision}
                      disabled={downloadProgress !== null}
                      className={`py-2 px-3.5 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        downloadProgress !== null 
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5" 
                          : "bg-amber-500/15 border border-amber-500/25 text-amber-500 hover:bg-amber-500/25"
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать zip-агрегаты и сжать в Footprint
                    </button>
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/* TAB 3: USERS & ACTIVE CLIENT WEBSOCKET STREAMS */}
          {activeTab === "users" && (
            <div className="flex-1 flex flex-col gap-6 min-h-0">
              
              {/* METRICS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Host Counter */}
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                  isLight ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                    <Globe className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-extrabold text-slate-450 block uppercase">Хостов на сайте</span>
                    <div className="text-lg font-black tracking-tight">{hostsCount.toLocaleString()} <span className="text-[9px] text-emerald-500 font-mono font-bold">LIVE</span></div>
                    <span className="text-[9.5px] text-slate-450">Идентификация узлов по CDN</span>
                  </div>
                </div>

                {/* 2. Licensed / Registered Users */}
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                  isLight ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-500">
                    <Users className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-extrabold text-slate-450 block uppercase">Зарегистрировано</span>
                    <div className="text-lg font-black tracking-tight">{registeredUsersCount.toLocaleString()}</div>
                    <span className="text-[9.5px] text-slate-450">+15 новых за сегодня</span>
                  </div>
                </div>

                {/* 3. Real-time Users Online */}
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                  isLight ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-extrabold text-slate-450 block uppercase">Пользователей ОНЛАЙН</span>
                    <div className="text-lg font-black tracking-tight flex items-center gap-2">
                      {onlineCount} 
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    </div>
                    <span className="text-[9.5px] text-slate-450 font-sans">Прямое WebSocket соединение</span>
                  </div>
                </div>

                {/* 4. WebSocket Link Stat */}
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                  isLight ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-extrabold text-slate-450 block uppercase">Стрим Котировок</span>
                    <div className="text-sm font-bold capitalize select-none mt-1">
                      <select
                        value={connectionStatus}
                        onChange={(e) => onSetConnectionStatus(e.target.value as any)}
                        className={`text-xs font-mono font-bold rounded-lg px-2 py-1 focus:outline-none border cursor-pointer ${
                          isLight 
                            ? "bg-slate-100 border-slate-250 text-slate-800" 
                            : "bg-slate-900 border-white/10 text-slate-100"
                        }`}
                      >
                        <option value="connected">● Connected (Стабилен)</option>
                        <option value="syncing">⟳ Syncing (Переподключение)</option>
                        <option value="stale">✗ Offline (Имитация сбоя)</option>
                      </select>
                    </div>
                    <span className="text-[9.5px] text-slate-450 font-mono">Биржа: Binance Futures/Spot</span>
                  </div>
                </div>
              </div>

              {/* CONFIGURATION OF SUBSCRIPTION TIERS / POLICY POLICIES */}
              <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/40 border-white/5"
              }`}>
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-505 animate-spin-slow animate-spin" />
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
                        Настройки Лимитов & Политик Групп (Guest, Free, Pro, VIP, Admin)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Управление правами доступа, лимитами истории, рендером и оповещениями для учетных записей
                      </p>
                    </div>
                  </div>
                  
                  {policySuccessMsg && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-mono font-black uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{policySuccessMsg}</span>
                    </motion.div>
                  )}
                </div>

                {/* TABS FOR EVERY TIER */}
                <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-950/20 border border-white/5">
                  {(["guest", "free", "pro", "vip", "admin"] as const).map((g) => {
                    const isActive = selectedGroup === g;

                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedGroup(g)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition border ${
                          isActive 
                            ? g === "guest" ? "bg-purple-550/15 border-purple-500 text-purple-300" :
                              g === "free" ? "bg-slate-500/15 border-slate-400 text-slate-300" :
                              g === "pro" ? "bg-blue-500/15 border-blue-500 text-blue-300" :
                              g === "vip" ? "bg-amber-500/15 border-amber-500 text-amber-400" :
                              "bg-rose-500/15 border-rose-500 text-rose-300"
                            : isLight ? "bg-white border-transparent text-slate-500 hover:bg-slate-50 shadow-sm" : "bg-transparent border-transparent text-slate-400 hover:bg-white/[0.02]"
                        }`}
                      >
                        {g === "guest" && "GUEST ГОСТЬ"}
                        {g === "free" && "FREE тариф"}
                        {g === "pro" && "PRO тариф"}
                        {g === "vip" && "VIP тариф"}
                        {g === "admin" && "ADMIN права"}
                      </button>
                    );
                  })}
                </div>

                {/* FORM CONTROLS FOR THE CHOSEN TIER */}
                <form onSubmit={handleSavePolicies} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans mt-2">
                  
                  {/* METRIC 1: MAX CHART HISTORY */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <div>
                      <span className={`text-[10px] font-mono font-black uppercase block tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                        1. Максимальная история графика
                      </span>
                      <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                        Лимит отображаемых исторических свечей/тиков в сессии трейдера.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="50"
                          max="50000"
                          value={tierSettings[selectedGroup].maxHistory}
                          onChange={(e) => updateTierSetting(selectedGroup, "maxHistory", parseInt(e.target.value) || 200)}
                          className={`w-full max-w-[120px] rounded-lg px-3 py-1.5 font-mono font-black text-xs border ${
                            isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                          }`}
                        />
                        <span className="text-[11px] font-mono font-bold text-sky-400">свечей</span>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {[100, 500, 1000, 5000, 10000].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => updateTierSetting(selectedGroup, "maxHistory", val)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition ${
                              tierSettings[selectedGroup].maxHistory === val
                                ? "bg-blue-500/15 border-blue-500 text-blue-400"
                                : isLight ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm" : "bg-slate-900 hover:bg-slate-800 border-white/5 text-slate-400"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* METRIC 2: COMPRESSION LEVELS */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <div>
                      <span className={`text-[10px] font-mono font-black uppercase block tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                        2. Уровней сжатия графика
                      </span>
                      <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                        Допустимое количество шагов кластеризации стакана/свечей.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="6"
                          value={tierSettings[selectedGroup].compressionLevels}
                          onChange={(e) => updateTierSetting(selectedGroup, "compressionLevels", parseInt(e.target.value) || 1)}
                          className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
                            isLight ? "bg-slate-300 accent-blue-600" : "bg-slate-800 accent-blue-500"
                          }`}
                        />
                        <span className="text-xs font-mono font-black text-amber-500 shrink-0 select-none min-w-[32px] text-center">
                          {tierSettings[selectedGroup].compressionLevels}x
                        </span>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {[1, 2, 3, 4, 5, 6].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => updateTierSetting(selectedGroup, "compressionLevels", val)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition ${
                              tierSettings[selectedGroup].compressionLevels === val
                                ? "bg-blue-500/15 border-blue-500 text-blue-400"
                                : isLight ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm" : "bg-slate-900 hover:bg-slate-800 border-white/5 text-slate-400"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* METRIC 3: MAX INDICATORS */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <div>
                      <span className={`text-[10px] font-mono font-black uppercase block tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                        3. Индикаторов на графике
                      </span>
                      <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                        Максимальный лимит оверлейных индикаторов в терминале.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={tierSettings[selectedGroup].maxIndicators}
                          onChange={(e) => updateTierSetting(selectedGroup, "maxIndicators", parseInt(e.target.value) || 2)}
                          className={`w-full max-w-[90px] rounded-lg px-3 py-1.5 font-mono font-black text-xs border ${
                            isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                          }`}
                        />
                        <span className="text-[11px] font-mono font-bold text-teal-400">активных</span>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {[2, 3, 5, 10, 20].map(val => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => updateTierSetting(selectedGroup, "maxIndicators", val)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition ${
                              tierSettings[selectedGroup].maxIndicators === val
                                ? "bg-blue-500/15 border-blue-500 text-blue-400"
                                : isLight ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm" : "bg-slate-900 hover:bg-slate-800 border-white/5 text-slate-400"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CHECKBOX 1: USE CUSTOM INDICATOR SETTINGS */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <div>
                      <span className={`text-[10px] font-mono font-black uppercase block tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                        4. Кастомные настройки индикаторов
                      </span>
                      <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                        Использование своих уникальных настроек и конфигурационных пресетов для индикаторов.
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer mt-2 select-none">
                      <input
                        type="checkbox"
                        checked={tierSettings[selectedGroup].customIndicatorSettings}
                        onChange={(e) => updateTierSetting(selectedGroup, "customIndicatorSettings", e.target.checked)}
                        className={`w-4 h-4 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer ${
                          isLight ? "bg-white border-slate-300 text-blue-600" : "bg-slate-900 border-white/10 text-blue-500"
                        }`}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        {tierSettings[selectedGroup].customIndicatorSettings ? "РАЗРЕШЕНО (ACTIVE)" : "ЗАБЛОКИРОВАНО"}
                      </span>
                    </label>
                  </div>

                  {/* CHECKBOX 2: TG NOTIFICATIONS */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"
                  }`}>
                    <div>
                      <span className={`text-[10px] font-mono font-black uppercase block tracking-wider ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                        5. Телеграм-уведомления (Cluster Search)
                      </span>
                      <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                        Уведомления в Telegram о фильтрациях в реальном времени в инструменте Cluster Search.
                      </p>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer mt-2 select-none">
                      <input
                        type="checkbox"
                        checked={tierSettings[selectedGroup].telegramNotifications}
                        onChange={(e) => updateTierSetting(selectedGroup, "telegramNotifications", e.target.checked)}
                        className={`w-4 h-4 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer ${
                          isLight ? "bg-white border-slate-300 text-blue-600" : "bg-slate-900 border-white/10 text-blue-500"
                        }`}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        {tierSettings[selectedGroup].telegramNotifications ? "ВКЛЮЧЕНО (TELEGRAM)" : "ОТКЛЮЧЕНО"}
                      </span>
                    </label>
                  </div>

                  {/* SAVE BUTTON FOR ALL POLICIES */}
                  <div className="flex items-end justify-start">
                    <button
                      type="submit"
                      className={`w-full py-3 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer border transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                        isLight 
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-600/10" 
                          : "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Сохранить все лимиты
                    </button>
                  </div>

                </form>
              </div>

              {/* REGISTERED USERS MANAGEMENT PANEL */}
              <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/40 border-white/5"
              }`}>
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <h3 className="text-sm font-bold font-mono text-slate-455 flex items-center gap-2 uppercase">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Список и Управление Пользователями
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      DATABASE REPLICATED
                    </span>
                  </div>
                </div>

                {/* ADD NEW USER FORM */}
                <div className={`p-4 rounded-xl border flex flex-col gap-3 font-sans ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-white/10"
                }`}>
                  <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400">Добавить нового пользователя</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Никнейм (e.g. @pro_trader)"
                        value={newNickInput}
                        onChange={(e) => setNewNickInput(e.target.value)}
                        className={`text-xs w-full rounded-lg px-2.5 py-1.5 focus:outline-none border ${
                          isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/5 text-slate-100"
                        }`}
                      />
                    </div>
                    <div>
                      <select
                        value={newLevelInput}
                        onChange={(e) => setNewLevelInput(e.target.value as any)}
                        className={`text-xs w-full rounded-lg px-2.5 py-1.5 focus:outline-none border ${
                          isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/5 text-slate-100"
                        }`}
                      >
                        <option value="free">free (Бесплатный)</option>
                        <option value="RPO">RPO (Профессионал)</option>
                        <option value="VIP">VIP (Привилегированный)</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="IP-адрес"
                        value={newIpInput}
                        onChange={(e) => setNewIpInput(e.target.value)}
                        className={`text-xs w-full rounded-lg px-2.5 py-1.5 focus:outline-none border ${
                          isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/5 text-slate-100"
                        }`}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Страна & Флаг (e.g. Kazakhstan 🇰🇿)"
                        value={newCountryInput}
                        onChange={(e) => setNewCountryInput(e.target.value)}
                        className={`text-xs w-full rounded-lg px-2.5 py-1.5 focus:outline-none border ${
                          isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/5 text-slate-100"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <button
                      onClick={() => {
                        if (!newNickInput) return;
                        const defaultIp = newIpInput || `${Math.floor(Math.random() * 200 + 40)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
                        const defaultCountry = newCountryInput || "Kazakhstan 🇰🇿";
                        const registerDate = new Date().toISOString().split("T")[0];
                        const newUser: AdminUser = {
                          id: `usr_${Math.floor(Math.random() * 900 + 100)}`,
                          nickname: newNickInput.startsWith("@") ? newNickInput : "@" + newNickInput,
                          registerDate,
                          subscriptionLevel: newLevelInput,
                          ip: defaultIp,
                          country: defaultCountry
                        };
                        setAdminUsers(prev => [newUser, ...prev]);
                        setRegisteredUsersCount(prev => prev + 1);
                        setNewNickInput("");
                        setNewIpInput("");
                        setNewCountryInput("");
                        setUserSuccessMsg("Пользователь успешно зарегистрирован!");
                        setTimeout(() => setUserSuccessMsg(""), 3000);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить пользователя
                    </button>
                    {userSuccessMsg && (
                      <span className="text-emerald-500 text-[11px] font-bold animate-pulse">{userSuccessMsg}</span>
                    )}
                  </div>
                </div>

                {/* INLINE EDITING CONTAINER */}
                {editingUserId && (
                  <div className={`p-4 rounded-xl border flex flex-col gap-3 font-sans ${
                    isLight ? "bg-amber-100/40 border-amber-300" : "bg-yellow-500/5 border-yellow-500/15"
                  }`}>
                    <h4 className="text-xs font-bold tracking-wider uppercase text-yellow-500">Редактировать учетную запись #{editingUserId}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block uppercase mb-1">Никнейм</label>
                        <input
                          type="text"
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          className={`text-xs w-full rounded px-2.5 py-1.5 focus:outline-none border ${
                            isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/5 text-slate-100"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block uppercase mb-1">Уровень Подписки</label>
                        <select
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value as any)}
                          className={`text-xs w-full rounded px-2.5 py-1.5 focus:outline-none border ${
                            isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/5 text-slate-100"
                          }`}
                        >
                          <option value="free">free</option>
                          <option value="RPO">RPO</option>
                          <option value="VIP">VIP</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        onClick={() => {
                          setEditingUserId(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer font-sans transition-all ${
                          isLight ? "bg-slate-200 hover:bg-slate-300 text-slate-700" : "bg-slate-900 hover:bg-slate-800 text-slate-350"
                        }`}
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => {
                          setAdminUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, nickname: editNickname, subscriptionLevel: editLevel } : u));
                          setEditingUserId(null);
                          setUserSuccessMsg("Успешно изменено!");
                          setTimeout(() => setUserSuccessMsg(""), 3000);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-extrabold text-xs font-sans cursor-pointer active:scale-95 transition-all"
                      >
                        Сохранить изменения
                      </button>
                    </div>
                  </div>
                )}

                {/* USER MANAGEMENT TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-mono text-slate-450 ${
                        isLight ? "border-slate-200" : "border-white/5"
                      }`}>
                        <th className="py-2.5 px-3">Идентификатор</th>
                        <th className="py-2.5 px-3">Никнейм</th>
                        <th className="py-2.5 px-3">Уровень</th>
                        <th className="py-2.5 px-3">IP-адрес</th>
                        <th className="py-2.5 px-3">Страна</th>
                        <th className="py-2.5 px-3">Дата регистрации</th>
                        <th className="py-2.5 px-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/5 font-mono">
                      {adminUsers.map(user => (
                        <tr key={user.id} className={`hover:bg-slate-500/5 transition-colors ${
                          isLight ? "text-slate-800" : "text-slate-200"
                        }`}>
                          <td className="py-3 px-3 font-semibold text-slate-550">{user.id}</td>
                          <td className="py-3 px-3 font-bold text-amber-500">{user.nickname}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${
                              user.subscriptionLevel === "free"
                                ? isLight ? "bg-slate-100 border-slate-300 text-slate-600" : "bg-slate-900 border-white/5 text-slate-400"
                                : user.subscriptionLevel === "RPO"
                                ? isLight ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-orange-500/10 border-orange-500/25 text-orange-400"
                                : isLight ? "bg-yellow-50 border-yellow-300 text-yellow-850" : "bg-yellow-500/10 border-yellow-500/25 text-yellow-450 font-bold"
                            }`}>
                              {user.subscriptionLevel}
                            </span>
                          </td>
                          <td className="py-3 px-3">{user.ip}</td>
                          <td className="py-3 px-3 font-sans">{user.country}</td>
                          <td className="py-3 px-3 text-slate-400">{user.registerDate}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingUserId(user.id);
                                  setEditNickname(user.nickname);
                                  setEditLevel(user.subscriptionLevel);
                                }}
                                className="p-1 rounded bg-blue-500/15 text-blue-400 hover:text-blue-300 cursor-pointer active:scale-95 transition-all"
                                title="Редактировать профиль"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Вы действительно хотите удалить пользователя ${user.nickname}?`)) {
                                    setAdminUsers(prev => prev.filter(u => u.id !== user.id));
                                    setRegisteredUsersCount(prev => Math.max(0, prev - 1));
                                    setUserSuccessMsg(`Пользователь ${user.nickname} удален`);
                                    setTimeout(() => setUserSuccessMsg(""), 3000);
                                  }
                                }}
                                className="p-1 rounded bg-rose-500/15 text-rose-500 hover:text-rose-400 cursor-pointer active:scale-95 transition-all"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CONNECTION TABLE */}
              <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950/40 border-white/5"
              }`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold font-mono text-slate-400 flex items-center gap-2 uppercase">
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                    Активные сессии Live WebSocket Трейдеров
                  </h3>
                  <span className="font-mono text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                    SESSIONS NOMINAL
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-mono text-slate-450 ${
                        isLight ? "border-slate-200" : "border-white/5"
                      }`}>
                        <th className="py-2.5 px-3">Идентификатор</th>
                        <th className="py-2.5 px-3">IP-адрес</th>
                        <th className="py-2.5 px-3">Геолокация</th>
                        <th className="py-2.5 px-3">Конечный Узел</th>
                        <th className="py-2.5 px-3">Подписка Ticker (WebSocket)</th>
                        <th className="py-2.5 px-3 text-right">Задержка (Latency)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/5 font-mono">
                      {clients.map(cli => (
                        <tr key={cli.id} className={`hover:bg-slate-500/5 transition-colors ${
                          isLight ? "text-slate-800" : "text-slate-200"
                        }`}>
                          <td className="py-3 px-3 font-semibold text-amber-500">{cli.id}</td>
                          <td className="py-3 px-3">{cli.ip}</td>
                          <td className="py-3 px-3 flex items-center gap-1.5 font-sans">
                            <Wifi className="w-3.5 h-3.5 text-blue-500" />
                            <span>{cli.geo}</span>
                          </td>
                          <td className="py-3 px-3 font-sans text-slate-400">{cli.origin}</td>
                          <td className="py-3 px-3"><span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">{cli.sub}</span></td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-bold ${
                              cli.ping < 40 ? "text-emerald-500" : cli.ping < 120 ? "text-yellow-500" : "text-red-500"
                            }`}>
                              {cli.ping} ms
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-slate-500 italic mt-2">
                  * Таблица сетей автоматически транслирует активный WebSocket фреймрейт. Нажмите симуляцию задержки вверху для имитации сбоя связи.
                </div>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
