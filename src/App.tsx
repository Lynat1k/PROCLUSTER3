/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { CryptoPair, ClusterCandle, OrderBook as OrderBookType, LiveTrade, Indicator } from "./types";
import {
  AVAILABLE_PAIRS,
  generateHistoricalCandles,
  generateOrderBook,
  generateLiveTrade
} from "./dataGenerator";
import Header from "./components/Header";
import ClusterChart from "./components/ClusterChart";
import DOMSidebar from "./components/DOMSidebar";
import IndicatorsModal from "./components/IndicatorsModal";
import AdminPanel from "./components/AdminPanel";
import { TrendingUp, TrendingDown, Layers, ChevronRight, AlertTriangle, ChevronDown, Check, Sparkles, CandlestickChart, Footprints, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Theme management state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("procluster_theme") as "dark" | "light") || "dark";
  });

  // Language management state
  const [language, setLanguage] = useState<"RU" | "EN" | "KZ">(() => {
    return (localStorage.getItem("procluster_lang") as "RU" | "EN" | "KZ") || "RU";
  });

  const handleLanguageChange = (lang: "RU" | "EN" | "KZ") => {
    setLanguage(lang);
    localStorage.setItem("procluster_lang", lang);
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("procluster_theme", next);
      return next;
    });
  };

  // Master Crypto Pairs (ticking prices)
  const [pairs, setPairs] = useState<CryptoPair[]>(AVAILABLE_PAIRS);
  const [activePair, setActivePair] = useState<CryptoPair>(AVAILABLE_PAIRS[0]);
  
  // Dashboard Configurations
  const [interval, setInterval] = useState<string>("15m");
  const [isTickingAll, setIsTickingAll] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "syncing" | "stale">("connected");
  const [marketType, setMarketType] = useState<"SPOT" | "FUTURES">("SPOT");
  const [candleType, setCandleType] = useState<"auto" | "japanese" | "footprint" | "clusters">("auto");
  const [candleDataType, setCandleDataType] = useState<"bid_ask" | "delta" | "volume">("bid_ask");

  // Indicators Configuration State
  const [indicators, setIndicators] = useState<Indicator[]>([
    {
      id: "volume",
      label: "Volume",
      category: "Все индикаторы",
      type: "Глобальный",
      isFavorite: false,
      isActive: true,
      settings: { opacity: 0.8 }
    },
    {
      id: "volumeOnChart",
      label: "Volume on Chart",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: true,
      isActive: true,
      settings: { opacity: 0.6 }
    },
    {
      id: "volumeProfile",
      label: "Volume Profile",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: true,
      isActive: true,
      settings: { opacity: 0.7 }
    },
    {
      id: "marketProfile",
      label: "Market Profile",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: false,
      isActive: false,
      settings: { opacity: 0.5 }
    },
    {
      id: "delta",
      label: "Delta",
      category: "Все индикаторы",
      type: "Подвальный",
      isFavorite: true,
      isActive: true,
      settings: { showLabels: true, sensitivity: 5 }
    },
    {
      id: "cvd",
      label: "CVD",
      category: "Все индикаторы",
      type: "Подвальный",
      isFavorite: true,
      isActive: true,
      settings: { smoothing: 10 }
    },
    {
      id: "liquidations",
      label: "Liquidations",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: true,
      isActive: false,
      settings: { opacity: 0.9 }
    },
    {
      id: "clusterSearch",
      label: "Cluster Search",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: true,
      isActive: true,
      settings: {
        mode: "Volume",
        direction: "Both",
        location: "Any",
        sensitivity: 4,
        useMinMax: false
      }
    },
    {
      id: "reversalClusters",
      label: "Reversal Clusters",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: false,
      isActive: false,
      settings: { sensitivity: 5 }
    },
    {
      id: "absorption",
      label: "Absorption",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: false,
      isActive: false,
      settings: { sensitivity: 6 }
    },
    {
      id: "stackedImbalance",
      label: "Stacked Imbalance",
      category: "Все индикаторы",
      type: "Оверлей",
      isFavorite: true,
      isActive: false,
      settings: { ratio: 3.0 }
    }
  ]);

  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<"terminal" | "admin">("terminal");
  const [showTickerMenu, setShowTickerMenu] = useState<boolean>(false);
  const tickerMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close the ticker custom menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tickerMenuRef.current && !tickerMenuRef.current.contains(event.target as Node)) {
        setShowTickerMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Chart, book, and trades dataset
  const [candles, setCandles] = useState<ClusterCandle[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookType>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<LiveTrade[]>([]);

  // AI-derived support & resistance target indicators drawn on HUD
  const [aiTargets, setAiTargets] = useState<{ support: number | null; resistance: number | null }>({
    support: null,
    resistance: null
  });

  // --- WebSocket & Real-Time Connection Refs & Buffers ---
  const incomingTradesBufferRef = useRef<{ id: string; timestamp: number; price: number; amount: number; side: "buy" | "sell" }[]>([]);
  const lastTickTimeRef = useRef<number>(Date.now());
  const activePairRef = useRef<CryptoPair>(activePair);
  const intervalRef = useRef<string>(interval);
  
  useEffect(() => {
    activePairRef.current = activePair;
  }, [activePair]);

  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  const getWhaleThreshold = (symbol: string): number => {
    if (symbol.startsWith("BTC")) return 0.5;
    if (symbol.startsWith("ETH")) return 5;
    if (symbol.startsWith("SOL")) return 100;
    if (symbol.startsWith("BNB")) return 30;
    return 20000; // General high volume threshold (e.g., XRP or low price pairs)
  };

  // Re-generate database sets when active token changes
  useEffect(() => {
    setConnectionStatus("syncing");
    
    // Generate historical candles
    const histCandles = generateHistoricalCandles(activePair, 30, parseInterval(interval));
    setCandles(histCandles);

    // Generate Order Book L2 depths
    const initialBook = generateOrderBook(activePair.price, activePair.priceStep);
    setOrderBook(initialBook);

    // Presets some historical starting trades
    const histTrades: LiveTrade[] = [];
    for (let i = 0; i < 15; i++) {
      histTrades.push(generateLiveTrade(activePair.price, activePair.priceStep));
    }
    setTrades(histTrades.sort((a, b) => b.timestamp - a.timestamp));

    // Clear targets
    setAiTargets({ support: null, resistance: null });
  }, [activePair.symbol, interval]);

  // Batch process incoming trades to keep the chart performant and buttery-smooth
  const processTicks = (newTicks: { id: string; timestamp: number; price: number; amount: number; side: "buy" | "sell" }[]) => {
    if (newTicks.length === 0) return;

    // 1. Update live Trades list (Keep max 50)
    setTrades((prev) => {
      const formattedTrades: LiveTrade[] = newTicks.map((t) => ({
        id: t.id,
        timestamp: t.timestamp,
        price: t.price,
        amount: t.amount,
        side: t.side,
        isWhale: t.amount >= getWhaleThreshold(activePairRef.current.symbol)
      }));
      return [...formattedTrades.reverse(), ...prev].slice(0, 50);
    });

    const lastTick = newTicks[newTicks.length - 1];

    // 2. Re-build active pairs list with the real prices
    setPairs((prevPairs) =>
      prevPairs.map((p) => {
        if (p.symbol === activePairRef.current.symbol) {
          // Accumulate batch volumes and net delta
          let batchVolume = 0;
          let batchDelta = 0;
          newTicks.forEach((t) => {
            batchVolume += t.amount * t.price;
            batchDelta += t.amount * (t.side === "buy" ? 1 : -1);
          });

          const nextPrice = lastTick.price;
          const volume24h = p.volume24h + batchVolume;
          const delta24h = p.delta24h + batchDelta;
          
          // Daily price percentage fluctuation logic
          const priceChangePercent = ((nextPrice - p.price) / p.price) * 100;
          const change24h = parseFloat((p.change24h + priceChangePercent).toFixed(2));

          const updatedPair = {
            ...p,
            price: parseFloat(nextPrice.toFixed(4)),
            volume24h,
            delta24h,
            change24h
          };
          
          setActivePair(updatedPair);
          return updatedPair;
        } else {
          // Subtle standard random fluctuation for inactive pairs so they feel simulated alive
          const noise = (Math.random() - 0.49) * 0.0003 * p.price;
          return {
            ...p,
            price: parseFloat(Math.max(0.001, p.price + noise).toFixed(4))
          };
        }
      })
    );

    // 3. Update Order Book Depth once per batch
    setOrderBook(generateOrderBook(lastTick.price, activePairRef.current.priceStep));

    // 4. Update candle clusters in real-time
    setCandles((prevCandles) => {
      if (prevCandles.length === 0) return prevCandles;
      let nextCandles = [...prevCandles];
      const candleDuration = parseInterval(intervalRef.current) * 60 * 1000;

      newTicks.forEach((tick) => {
        const lastCandleIdx = nextCandles.length - 1;
        const lastCandle = { ...nextCandles[lastCandleIdx] };
        
        // Align tick timestamp to start of timeframe candle
        const currentCandleStart = Math.floor(tick.timestamp / candleDuration) * candleDuration;

        if (currentCandleStart > lastCandle.timestamp) {
          // Roll over! Start a fresh real-time candle
          const openPrice = lastCandle.close;
          const highPrice = tick.price;
          const lowPrice = tick.price;
          const closePrice = tick.price;
          const candleVolume = tick.amount;
          const delta = tick.side === "buy" ? tick.amount : -tick.amount;

          const stepPrice = Math.floor(tick.price / activePairRef.current.priceStep) * activePairRef.current.priceStep;
          const cellPrice = parseFloat(stepPrice.toFixed(4));

          const initialCell = {
            price: cellPrice,
            bid: tick.side === "sell" ? tick.amount : 0,
            ask: tick.side === "buy" ? tick.amount : 0,
            volume: tick.amount,
            isPoc: true,
            isBuyImbalance: false,
            isSellImbalance: false
          };

          const newCandle: ClusterCandle = {
            timestamp: currentCandleStart,
            open: parseFloat(openPrice.toFixed(4)),
            high: parseFloat(highPrice.toFixed(4)),
            low: parseFloat(lowPrice.toFixed(4)),
            close: parseFloat(closePrice.toFixed(4)),
            volume: candleVolume,
            delta,
            pocPrice: cellPrice,
            cells: [initialCell],
            vah: parseFloat(cellPrice.toFixed(4)),
            val: parseFloat(cellPrice.toFixed(4))
          };

          nextCandles = [...nextCandles, newCandle].slice(-50);
        } else {
          // Update the current last candle
          lastCandle.close = tick.price;
          if (tick.price > lastCandle.high) lastCandle.high = tick.price;
          if (tick.price < lastCandle.low) lastCandle.low = tick.price;

          lastCandle.volume += tick.amount;
          lastCandle.delta += tick.side === "buy" ? tick.amount : -tick.amount;

          // Locate nearest price interval cell
          const stepPrice = Math.floor(tick.price / activePairRef.current.priceStep) * activePairRef.current.priceStep;
          const cellPrice = parseFloat(stepPrice.toFixed(4));

          const cells = lastCandle.cells.map((c) => ({ ...c }));
          const matchedCell = cells.find((c) => c.price === cellPrice);

          if (matchedCell) {
            if (tick.side === "buy") {
              matchedCell.ask += tick.amount;
            } else {
              matchedCell.bid += tick.amount;
            }
            matchedCell.volume = matchedCell.bid + matchedCell.ask;
          } else {
            const newCell = {
              price: cellPrice,
              bid: tick.side === "sell" ? tick.amount : 0,
              ask: tick.side === "buy" ? tick.amount : 0,
              volume: tick.amount,
              isPoc: false,
              isBuyImbalance: false,
              isSellImbalance: false
            };
            cells.push(newCell);
          }

          // Re-calculate Point of Control (POC) and imbalances
          let maxVol = 0;
          let pocIdx = -1;

          cells.forEach((cell, idx) => {
            cell.isPoc = false;
            // Classify diagonal imbalances based on volumes and ratios
            cell.isBuyImbalance = cell.ask > cell.bid * 1.8 && cell.volume > (activePairRef.current.priceStep * 1.5);
            cell.isSellImbalance = cell.bid > cell.ask * 1.8 && cell.volume > (activePairRef.current.priceStep * 1.5);

            if (cell.volume > maxVol) {
              maxVol = cell.volume;
              pocIdx = idx;
            }
          });

          if (pocIdx !== -1) {
            cells[pocIdx].isPoc = true;
            lastCandle.pocPrice = cells[pocIdx].price;
          }

          lastCandle.cells = cells.sort((a, b) => b.price - a.price);

          // Value Area (VAH/VAL) Estimation
          const sortedByVol = [...cells].sort((a, b) => b.volume - a.volume);
          const targetVol = lastCandle.volume * 0.7;
          let runningVol = 0;
          const vaPrices: number[] = [];

          for (const c of sortedByVol) {
            runningVol += c.volume;
            vaPrices.push(c.price);
            if (runningVol >= targetVol) break;
          }

          if (vaPrices.length > 0) {
            lastCandle.val = Math.min(...vaPrices);
            lastCandle.vah = Math.max(...vaPrices);
          }

          nextCandles[lastCandleIdx] = lastCandle;
        }
      });

      return nextCandles;
    });
  };

  // 1. Establish real-time Binance WebSocket stream connection
  useEffect(() => {
    if (!isTickingAll) {
      setConnectionStatus("stale");
      return;
    }

    setConnectionStatus("syncing");

    const binanceSymbol = activePair.symbol.toLowerCase().replace("/", "");
    // Connect to Futures or Spot stream based on active market selection
    const wsUrl = marketType === "FUTURES"
      ? `wss://fstream.binance.com/ws/${binanceSymbol}@aggTrade`
      : `wss://stream.binance.com:9443/ws/${binanceSymbol}@trade`;

    console.log(`[WebSocket] Connecting to Binance URL: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WebSocket] Opened for ${activePair.symbol} (${marketType})`);
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.p && data.q) {
          lastTickTimeRef.current = Date.now(); // Reset fallback timer
          const tick = {
            id: String(data.t || data.a || Math.random()),
            timestamp: data.T || Date.now(),
            price: parseFloat(data.p),
            amount: parseFloat(data.q),
            side: data.m ? "sell" : "buy"
          };
          incomingTradesBufferRef.current.push(tick);
        }
      } catch (err) {
        console.error("[WebSocket] Match message error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Connection error:", err);
      setConnectionStatus("stale");
    };

    ws.onclose = () => {
      console.log("[WebSocket] Closed Connection");
    };

    return () => {
      ws.close();
    };
  }, [isTickingAll, activePair.symbol, marketType]);

  // 2. High frequency queue flushing timer with robust local simulation fallback
  useEffect(() => {
    if (!isTickingAll) return;

    lastTickTimeRef.current = Date.now();

    const flusherId = window.setInterval(() => {
      // Sandbox fallback protector: if no real ticks are coming (e.g., sandbox offline or market slow), inject healthy simulated feeds
      if (Date.now() - lastTickTimeRef.current > 3000) {
        const mockTrade = generateLiveTrade(activePairRef.current.price, activePairRef.current.priceStep);
        mockTrade.timestamp = Date.now();
        incomingTradesBufferRef.current.push(mockTrade);
      }

      if (incomingTradesBufferRef.current.length === 0) return;

      const ticksToProcess = [...incomingTradesBufferRef.current];
      incomingTradesBufferRef.current = [];

      processTicks(ticksToProcess);
    }, 100);

    return () => window.clearInterval(flusherId);
  }, [isTickingAll, activePair.symbol, interval]);

  // Translate intervals to minutes
  const parseInterval = (val: string): number => {
    if (val === "1m") return 1;
    if (val === "5m") return 5;
    if (val === "15m") return 15;
    if (val === "1h") return 60;
    if (val === "4h") return 240;
    return 15;
  };

  const handleSelectTargets = (sup: number, res: number) => {
    setAiTargets({ support: sup, resistance: res });
  };

  // --- Admin Panel API Callbacks ---
  const handleUpdatePairPrice = (symbol: string, newPrice: number) => {
    setPairs((prev) =>
      prev.map((p) => {
        if (p.symbol === symbol) {
          const updated = { ...p, price: newPrice };
          if (activePairRef.current.symbol === symbol) {
            setActivePair(updated);
          }
          return updated;
        }
        return p;
      })
    );
    // Inject custom tick immediately to realign the Footprint engine scale
    const tick = {
      id: "admin-force-price-" + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      price: newPrice,
      amount: activePairRef.current.priceStep * (20 + Math.random() * 30),
      side: "buy" as const
    };
    incomingTradesBufferRef.current.push(tick);
  };

  const handleInjectWhaleTrade = (side: "buy" | "sell", amount: number) => {
    const tick = {
      id: "admin-whale-block-" + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      price: activePair.price,
      amount: amount,
      side: side
    };
    incomingTradesBufferRef.current.push(tick);
  };

  const handleClearHistory = () => {
    setCandles([]);
    setTrades([]);
  };

  const handleAddPair = (newPair: CryptoPair) => {
    setPairs(prev => [...prev, newPair]);
  };

  const handleApplyAnomaly = (type: "pump" | "dump" | "spike" | "whale-wall") => {
    if (type === "pump") {
      const current = activePair.price;
      const ticks = [];
      for (let i = 1; i <= 20; i++) {
        ticks.push({
          id: `pump-tick-${i}-${Math.random()}`,
          timestamp: Date.now() + i * 25,
          price: current * (1 + (i * 0.003)),
          amount: activePair.priceStep * (15 + Math.random() * 45),
          side: "buy" as const
        });
      }
      incomingTradesBufferRef.current.push(...ticks);
    } else if (type === "dump") {
      const current = activePair.price;
      const ticks = [];
      for (let i = 1; i <= 20; i++) {
        ticks.push({
          id: `dump-tick-${i}-${Math.random()}`,
          timestamp: Date.now() + i * 25,
          price: current * (1 - (i * 0.003)),
          amount: activePair.priceStep * (15 + Math.random() * 45),
          side: "sell" as const
        });
      }
      incomingTradesBufferRef.current.push(...ticks);
    } else if (type === "spike") {
      const current = activePair.price;
      const ticks = [
        {
          id: `spike-high-${Math.random()}`,
          timestamp: Date.now(),
          price: current * 1.045,
          amount: activePair.priceStep * 250,
          side: "sell" as const
        },
        {
          id: `spike-low-${Math.random()}`,
          timestamp: Date.now() + 40,
          price: current * 0.955,
          amount: activePair.priceStep * 280,
          side: "buy" as const
        }
      ];
      incomingTradesBufferRef.current.push(...ticks);
    } else if (type === "whale-wall") {
      setOrderBook(prev => ({
        bids: prev.bids.map((r, i) => i === 1 ? { ...r, amount: r.amount * 12, total: r.total * 12 } : r),
        asks: prev.asks.map((r, i) => i === 1 ? { ...r, amount: r.amount * 12, total: r.total * 12 } : r)
      }));
    }
  };

  return (
    <div className={`h-screen max-h-screen flex flex-col font-sans select-none antialiased relative overflow-hidden transition-all duration-300 ${
      theme === "light" ? "bg-[#f1f5f9] text-slate-900" : "bg-[#030712]/92 text-slate-100"
    }`}>
      {/* Dynamic Drifting Liquid Background Blobs (Lava-lamp style glass ambient glow) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[5%] left-[3%] w-[450px] h-[450px] rounded-full liquid-blob-cyan blur-[100px] transition-all duration-300 ${theme === "light" ? "opacity-15" : "opacity-40"}`} />
        <div className={`absolute top-[50%] right-[5%] w-[550px] h-[550px] rounded-full liquid-blob-magenta blur-[120px] transition-all duration-300 ${theme === "light" ? "opacity-10" : "opacity-35"}`} />
        <div className={`absolute top-[30%] left-[45%] -translate-x-1/2 w-[420px] h-[420px] rounded-full liquid-blob-emerald blur-[90px] transition-all duration-300 ${theme === "light" ? "opacity-10" : "opacity-20"}`} />
        <div className={`absolute bottom-[2%] left-[10%] w-[380px] h-[380px] rounded-full liquid-blob-gold blur-[100px] transition-all duration-300 ${theme === "light" ? "opacity-10" : "opacity-30"}`} />
      </div>

      {/* BRAND TERMINAL HEADER */}
      <Header
        isTickingAll={isTickingAll}
        onToggleTicking={() => setIsTickingAll(!isTickingAll)}
        connectionStatus={connectionStatus}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAdmin={() => setCurrentView(prev => prev === "admin" ? "terminal" : "admin")}
        language={language}
        onLanguageChange={handleLanguageChange}
      />

      {currentView === "admin" ? (
        <AdminPanel
          isOpen={true}
          onClose={() => setCurrentView("terminal")}
          theme={theme}
          activePair={activePair}
          pairs={pairs}
          connectionStatus={connectionStatus}
          isTickingAll={isTickingAll}
          onToggleTicking={() => setIsTickingAll(!isTickingAll)}
          onSetConnectionStatus={setConnectionStatus}
          onUpdatePairPrice={handleUpdatePairPrice}
          onInjectWhaleTrade={handleInjectWhaleTrade}
          onClearHistory={handleClearHistory}
          onApplyAnomaly={handleApplyAnomaly}
          marketType={marketType}
          onSetMarketType={setMarketType}
          onAddPair={handleAddPair}
        />
      ) : (
        <>
          {/* DASHBOARD STATISTICS HUD BANNER WITH GLASSMORPHISM */}
      <section className={`backdrop-blur-md border-b px-6 py-4 flex flex-wrap items-center justify-between gap-6 relative z-30 transition-shadow duration-300 ${
        theme === "light"
          ? "bg-white/80 border-slate-200/80 shadow-sm"
          : "bg-slate-950/40 border-slate-900/60 shadow-md"
      }`}>
        <div className="flex flex-wrap items-center gap-6 sm:gap-10">
          {/* 1. Ticker Dropdown Select */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-1 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              Active Ticker
            </span>
            <div className="relative font-sans" ref={tickerMenuRef}>
              <button
                onClick={() => setShowTickerMenu(!showTickerMenu)}
                className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl text-sm sm:text-base md:text-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all min-w-[150px] h-[36px] select-none border ${
                  theme === "light"
                    ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm"
                    : "liquid-glass-button border-white/5 text-yellow-400 font-extrabold"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                  <span className={`font-mono tracking-tight font-extrabold ${theme === "light" ? "text-slate-800" : "text-white"}`}>{activePair.symbol}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  theme === "light" ? "text-slate-600" : "text-slate-400"
                } ${showTickerMenu ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showTickerMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className={`absolute left-0 mt-2 w-52 rounded-2xl p-2.5 z-50 text-left select-none shadow-2xl backdrop-blur-md border transition-all duration-300 ${
                      theme === "light"
                        ? "bg-white border-slate-200 text-slate-800"
                        : "bg-[#090d16]/98 border border-white/10 text-slate-100"
                    }`}
                  >
                    <div className={`text-[10px] font-bold px-2.5 pb-1.5 border-b mb-2 uppercase tracking-widest ${
                      theme === "light" ? "text-slate-500 border-slate-100" : "text-slate-400 border-white/5"
                    }`}>
                      {language === "EN" ? "Available Pairs" : language === "KZ" ? "Қолжетімді жұптар" : "Доступные пары"}
                    </div>
                    <div className="flex flex-col gap-1">
                      {pairs.map((p) => (
                        <button
                          key={p.symbol}
                          onClick={() => {
                            setActivePair(p);
                            setShowTickerMenu(false);
                          }}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-left cursor-pointer transition-all ${
                            activePair.symbol === p.symbol
                              ? theme === "light"
                                ? "bg-amber-50 text-amber-700 font-extrabold border border-amber-200 shadow-sm"
                                : "bg-yellow-500/10 text-yellow-500 font-extrabold border border-yellow-500/25"
                              : theme === "light"
                                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span className="font-mono text-xs font-bold">{p.symbol}</span>
                          {activePair.symbol === p.symbol && (
                            <Check className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 font-bold" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Market Type (SPOT / FUTURES) Segment Control */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-1 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              Market Type
            </span>
            <div className={`grid grid-cols-2 gap-1 p-[3px] rounded-xl h-[36px] items-center min-w-[150px] select-none transition-all duration-300 border ${
              theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950/60 border-white/5"
            }`}>
              {(["SPOT", "FUTURES"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMarketType(type)}
                  className={`px-3.5 py-1 rounded-lg text-xs font-bold font-mono transition-all duration-200 cursor-pointer text-center leading-none ${
                    marketType === type
                      ? theme === "light"
                        ? "bg-white text-slate-900 font-extrabold border border-slate-300 shadow-sm"
                        : "bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 font-extrabold shadow-inner"
                      : theme === "light"
                        ? "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                        : "text-slate-450 hover:text-slate-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Interval */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-1 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              Interval
            </span>
            <div className="flex items-center gap-1.5">
              {["1m", "5m", "15m", "1h", "4h"].map((item) => (
                <button
                  key={item}
                  onClick={() => setInterval(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono cursor-pointer transition-all duration-200 h-[36px] ${
                    interval === item
                      ? theme === "light"
                        ? "bg-amber-100 text-amber-800 border border-amber-300 font-extrabold shadow-sm"
                        : "liquid-glass-active text-yellow-400 font-black"
                      : theme === "light"
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800"
                        : "liquid-glass-button text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Candle Type Switcher */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-1 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              {language === "EN" ? "Candle Type" : language === "KZ" ? "Шамдар түрі" : "Тип свечей"}
            </span>
            <div className={`flex items-center p-[3px] rounded-xl h-[36px] select-none transition-all duration-300 border ${
              theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950/60 border-white/5"
            }`}>
              {[
                { id: "auto", label: language === "EN" ? "Auto" : "Авто", icon: Sparkles },
                { id: "japanese", label: language === "EN" ? "Japanese Candlesticks" : language === "KZ" ? "Жапон шамдары" : "Японские свечи", icon: CandlestickChart },
                { id: "footprint", label: language === "EN" ? "Footprint" : "Футпринт", icon: Footprints },
                { id: "clusters", label: language === "EN" ? "Clusters" : language === "KZ" ? "Кластерлер" : "Кластера", icon: LayoutGrid }
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = candleType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCandleType(item.id as any)}
                    title={item.label}
                    className="relative flex-1 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer text-center leading-none h-[28px] flex items-center justify-center border-0 outline-none select-none"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeCandleType"
                        className={`absolute inset-0 rounded-lg ${
                          theme === "light"
                            ? "bg-white border border-slate-300 shadow-sm"
                            : "bg-blue-500/10 border border-blue-500/25 shadow-inner"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center justify-center transition-colors duration-200 ${
                      isSelected
                        ? theme === "light"
                          ? "text-blue-700 font-extrabold"
                          : "text-blue-400 font-extrabold"
                        : theme === "light"
                          ? "text-slate-550 hover:text-slate-900"
                          : "text-slate-400 hover:text-slate-200"
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Candle Data Type Switcher */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-1 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              {language === "EN" ? "Candle Data" : language === "KZ" ? "Шамдағы деректер" : "Данные в свечах"}
            </span>
            <div className={`flex items-center p-[3px] rounded-xl h-[36px] select-none transition-all duration-300 border ${
              theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950/60 border-white/5"
            }`}>
              {[
                { id: "bid_ask", label: "Bid Ask" },
                { id: "delta", label: "Delta" },
                { id: "volume", label: language === "EN" ? "Volume" : language === "KZ" ? "Көлем" : "Объем" }
              ].map((item) => {
                const isSelected = candleDataType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCandleDataType(item.id as any)}
                    className="relative flex-1 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer text-center leading-none h-[28px] flex items-center justify-center border-0 outline-none select-none"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeCandleDataType"
                        className={`absolute inset-0 rounded-lg ${
                          theme === "light"
                            ? "bg-white border border-slate-300 shadow-sm"
                            : "bg-blue-500/10 border border-blue-500/25 shadow-inner"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className={`relative z-10 font-mono text-[11px] whitespace-nowrap transition-colors duration-200 ${
                      isSelected
                        ? theme === "light"
                          ? "text-blue-700 font-black"
                          : "text-blue-400 font-extrabold"
                        : theme === "light"
                          ? "text-slate-550 hover:text-slate-900"
                          : "text-slate-400 hover:text-slate-200"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Indicators Trigger Button */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-1 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              Active Controls
            </span>
            <button
              onClick={() => setIsIndicatorsModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs cursor-pointer h-[36px] hover:scale-[1.01] active:scale-[0.99] transition-all border ${
                theme === "light"
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-sm"
                  : "liquid-glass-button text-slate-300 hover:text-slate-100"
              }`}
            >
              <Layers className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>{language === "EN" ? "Indicators" : language === "KZ" ? "Индикаторлар" : "Индикаторы"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>



          {/* AI derive targets banner overlays */}
          {aiTargets.support && aiTargets.resistance && (
            <div className={`hidden lg:flex items-center gap-4 px-4 py-2 border rounded-lg transition-all ${
              theme === "light"
                ? "bg-amber-50/50 border-amber-200/60"
                : "bg-yellow-500/5 border-yellow-500/20"
            }`}>
              <div>
                <span className="text-[8px] uppercase font-mono text-slate-500 font-black tracking-widest">
                  AI Support Range
                </span>
                <span className={`text-xs font-mono font-bold block ${theme === "light" ? "text-emerald-700" : "text-emerald-400"}`}>
                  ${aiTargets.support.toLocaleString()}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <span className="text-[8px] uppercase font-mono text-slate-500 font-black tracking-widest">
                  AI Resistance Range
                </span>
                <span className={`text-xs font-mono font-bold block ${theme === "light" ? "text-rose-700" : "text-rose-400"}`}>
                  ${aiTargets.resistance.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>


      </section>

      {/* MAIN WORKSTATION PANEL: CONTENT VIEWS */}
      {(() => {
        const activeIndicatorsObj = {
          clusterSearch: indicators.find(i => i.id === "clusterSearch")?.isActive ?? false,
          delta: indicators.find(i => i.id === "delta")?.isActive ?? false,
          volume: indicators.find(i => i.id === "volume" || i.id === "volumeProfile")?.isActive ?? false,
          cvd: indicators.find(i => i.id === "cvd")?.isActive ?? false,
          stackedImbalance: indicators.find(i => i.id === "stackedImbalance")?.isActive ?? false
        };

        const indicatorSettings = {
          clusterSearch: indicators.find(i => i.id === "clusterSearch")?.settings || {},
          volumeProfile: indicators.find(i => i.id === "volumeProfile")?.settings || {},
          delta: indicators.find(i => i.id === "delta")?.settings || {},
          cvd: indicators.find(i => i.id === "cvd")?.settings || {},
          stackedImbalance: indicators.find(i => i.id === "stackedImbalance")?.settings || {}
        };

        return (
          <main className="flex-1 flex flex-col min-h-0 bg-transparent select-none relative z-10 p-5 gap-5">
            <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 min-w-0 items-stretch font-sans">
              {/* Left/Middle Column: Footprint Chart Section */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0 justify-stretch">
                <ClusterChart
                  candles={candles}
                  activePair={activePair}
                  activeIndicators={activeIndicatorsObj}
                  indicatorSettings={indicatorSettings}
                  marketType={marketType}
                  onToggleMarketType={() => setMarketType(p => p === "SPOT" ? "FUTURES" : "SPOT")}
                  theme={theme}
                  candleType={candleType}
                  candleDataType={candleDataType}
                />
              </div>

              {/* Right Sidebar Column: DOM Sidebar with Interactive Trading */}
              <aside className="w-full lg:w-[380px] flex flex-col shrink-0 min-h-0">
                <DOMSidebar orderBook={orderBook} activePair={activePair} theme={theme} />
              </aside>
            </div>

            {/* User Warning Banner regarding Simulation environment */}
            <footer className={`border rounded-lg p-4 flex gap-3 text-xs items-center leading-relaxed shrink-0 transition-all duration-300 ${
              theme === "light"
                ? "bg-slate-50 border-slate-200 text-slate-600"
                : "bg-slate-900/20 border-slate-900 text-slate-550"
            }`}>
              <AlertTriangle className="w-6 h-6 text-yellow-500/40 shrink-0 stroke-[1.25]" />
              <p>
                <strong>Disclaimer & Setup Rule</strong>: PROCLUSTER is a professional simulation sandbox. Tickers are ticking on simulated real-time telemetry matching actual crypto values. To unlock deep generative AI order flow predictions, make sure your specific <strong>GEMINI_API_KEY</strong> environment variable is saved securely inside the Secrets config panel in the workspace.
              </p>
            </footer>
          </main>
        );
      })()}
        </>
      )}

      {/* Dynamic Indicators Customizer Modal */}
      <IndicatorsModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        symbol={activePair.symbol}
        indicators={indicators}
        onApply={(updatedIndicators) => setIndicators(updatedIndicators)}
        theme={theme}
      />
    </div>
  );
}
