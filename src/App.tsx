/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { CryptoPair, ClusterCandle, ClusterCell, OrderBookRow, OrderBook as OrderBookType, LiveTrade, Indicator, ProfileUser } from "./types";
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
import UserProfile from "./components/UserProfile";
import { TrendingUp, TrendingDown, Layers, ChevronRight, AlertTriangle, ChevronDown, Check, Sparkles, CandlestickChart, Footprints, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const AutoIcon = ({ className }: { className?: string }) => (
  <span className={`font-sans text-xs font-black select-none ${className || ""}`}>A</span>
);

const JapaneseIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="3" x2="8" y2="21" strokeWidth="2" />
    <rect x="5" y="7" width="6" height="10" rx="1" fill="currentColor" fillOpacity="0.3" strokeWidth="2" />
    <line x1="16" y1="3" x2="16" y2="21" strokeWidth="2" />
    <rect x="13" y="5" width="6" height="12" rx="1" fill="currentColor" fillOpacity="0.3" strokeWidth="2" />
  </svg>
);

const FootprintIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="16" y2="6" strokeWidth="2.8" />
    <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2.8" />
    <line x1="4" y1="18" x2="12" y2="18" strokeWidth="2.8" />
  </svg>
);

const ClustersIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" strokeWidth="2" />
    <line x1="5" y1="9" x2="19" y2="9" strokeWidth="1.5" />
    <line x1="5" y1="15" x2="19" y2="15" strokeWidth="1.5" />
    <line x1="12" y1="3" x2="12" y2="21" strokeWidth="1.2" strokeDasharray="2,2" />
  </svg>
);

export const getBaseTickSize = (symbol: string): number => {
  const norm = symbol.toUpperCase().replace("/", "");
  if (norm.includes("BTC")) return 0.1;
  if (norm.includes("ETH")) return 0.01;
  if (norm.includes("SOL")) return 0.01;
  if (norm.includes("BNB")) return 0.01;
  if (norm.includes("XRP")) return 0.0001;
  return 0.01; // default fallback
};

export async function fetchBinanceTicksAndAggregate(
  symbol: string,
  isFutures: boolean,
  priceStep: number,
  compressionTicks: number = 50
): Promise<ClusterCandle[]> {
  try {
    const binanceSymbol = symbol.toUpperCase().replace("/", "");
    const res = await fetch(`/api/binance-vision-ticks?symbol=${binanceSymbol}&priceStep=${priceStep}&compression=${compressionTicks}&isFutures=${isFutures}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.candles) && data.candles.length > 0) {
        console.log(`[PROCLUSTER Vision Client] Successfully loaded ${data.candles.length} real 24h aggregated tick candles from server.`);
        return data.candles;
      }
    }
  } catch (err) {
    console.warn("[PROCLUSTER Vision Client] Server API fetch failed, falling back to direct public REST API:", err);
  }

  const binanceSymbol = symbol.toUpperCase().replace("/", "");
  const baseUrl = isFutures ? "https://fapi.binance.com" : "https://api.binance.com";
  
  // Fetch initial batch
  const limit = 1000;
  const initialUrl = isFutures
    ? `${baseUrl}/fapi/v1/aggTrades?symbol=${binanceSymbol}&limit=${limit}`
    : `${baseUrl}/api/v3/aggTrades?symbol=${binanceSymbol}&limit=${limit}`;

  const res = await fetch(initialUrl);
  if (!res.ok) {
    throw new Error(`Binance API response status: ${res.status}`);
  }
  const latestTrades = await res.json();
  if (!Array.isArray(latestTrades) || latestTrades.length === 0) {
    return [];
  }

  let allTrades = [...latestTrades];
  const firstId = latestTrades[0].a;

  // Fetch older trade blocks to get a continuous chain of trades / ticks
  const pages = 3;
  const fetchPromises: Promise<any[]>[] = [];

  for (let i = 1; i <= pages; i++) {
    const targetFromId = Math.max(1, firstId - i * 1000);
    const pageUrl = isFutures
      ? `${baseUrl}/fapi/v1/aggTrades?symbol=${binanceSymbol}&limit=1000&fromId=${targetFromId}`
      : `${baseUrl}/api/v3/aggTrades?symbol=${binanceSymbol}&limit=1000&fromId=${targetFromId}`;

    fetchPromises.push(
      fetch(pageUrl)
        .then(async (r) => {
          if (!r.ok) return [];
          const data = await r.json();
          return Array.isArray(data) ? data : [];
        })
        .catch(() => [])
    );
  }

  const results = await Promise.all(fetchPromises);
  results.forEach(batch => {
    allTrades = [...allTrades, ...batch];
  });

  // Sort chronologically by trade agg ID
  allTrades.sort((a, b) => a.a - b.a);

  // Split into chunks of exactly 50 ticks and aggregate volumes
  const candles: ClusterCandle[] = [];
  
  for (let i = 0; i < allTrades.length; i += compressionTicks) {
    const chunk = allTrades.slice(i, i + compressionTicks);
    if (chunk.length < 5) continue; // Skip trailing fragments

    const prices = chunk.map(t => parseFloat(t.p));
    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const timestamp = chunk[chunk.length - 1].T;

    const totalVolume = chunk.reduce((sum, t) => sum + parseFloat(t.q), 0);
    const cellMap: { [price: number]: { bid: number; ask: number; volume: number } } = {};

    chunk.forEach(t => {
      const pVal = parseFloat(t.p);
      const stepPrice = Math.floor(pVal / priceStep) * priceStep;
      const roundedPrice = parseFloat(stepPrice.toFixed(4));

      if (!cellMap[roundedPrice]) {
        cellMap[roundedPrice] = { bid: 0, ask: 0, volume: 0 };
      }

      const qty = parseFloat(t.q);
      // t.m represents buy/sell side logic (isBuyerMaker)
      if (t.m) {
        cellMap[roundedPrice].bid += qty;
      } else {
        cellMap[roundedPrice].ask += qty;
      }
      cellMap[roundedPrice].volume += qty;
    });

    const cells: ClusterCell[] = [];
    let maxCellVol = 0;
    let pocPrice = (open + close) / 2;

    Object.keys(cellMap).forEach(pStr => {
      const pNum = parseFloat(pStr);
      const data = cellMap[pNum];

      cells.push({
        price: pNum,
        bid: parseFloat(data.bid.toFixed(4)),
        ask: parseFloat(data.ask.toFixed(4)),
        volume: parseFloat(data.volume.toFixed(4)),
        isPoc: false,
        isBuyImbalance: false,
        isSellImbalance: false
      });
    });

    cells.forEach(c => {
      if (c.volume > maxCellVol) {
        maxCellVol = c.volume;
        pocPrice = c.price;
      }
    });

    cells.forEach(c => {
      if (c.price === pocPrice) {
        c.isPoc = true;
      }
      c.isBuyImbalance = c.ask > c.bid * 1.8 && c.volume > (totalVolume / cells.length) * 0.4;
      c.isSellImbalance = c.bid > c.ask * 1.8 && c.volume > (totalVolume / cells.length) * 0.4;
    });

    cells.sort((a, b) => b.price - a.price);

    const sortedByVol = [...cells].sort((a, b) => b.volume - a.volume);
    const targetVol = totalVolume * 0.7;
    let runningSum = 0;
    const vaPrices: number[] = [];
    for (const itemC of sortedByVol) {
      runningSum += itemC.volume;
      vaPrices.push(itemC.price);
      if (runningSum >= targetVol) break;
    }

    const val = vaPrices.length > 0 ? Math.min(...vaPrices) : low;
    const vah = vaPrices.length > 0 ? Math.max(...vaPrices) : high;

    const totalBid = cells.reduce((sum, c) => sum + c.bid, 0);
    const totalAsk = cells.reduce((sum, c) => sum + c.ask, 0);

    candles.push({
      timestamp,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: parseFloat(totalVolume.toFixed(4)),
      delta: parseFloat((totalAsk - totalBid).toFixed(4)),
      pocPrice: parseFloat(pocPrice.toFixed(4)),
      cells,
      vah: parseFloat(vah.toFixed(4)),
      val: parseFloat(val.toFixed(4)),
      tickCount: chunk.length
    });
  }

  return candles;
}

export async function fetchBinanceKlines(symbol: string, interval: string, isFutures: boolean, priceStep: number): Promise<ClusterCandle[]> {
  const binanceSymbol = symbol.toUpperCase().replace("/", "");
  
  // Try server proxy first to bypass browser CORS in iframe previews
  try {
    const proxyUrl = `/api/binance-klines?symbol=${binanceSymbol}&interval=${interval}&isFutures=${isFutures}&priceStep=${priceStep}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      const resultObj = await proxyRes.json();
      if (resultObj.status === "ok" && Array.isArray(resultObj.candles) && resultObj.candles.length > 0) {
        console.log(`[PROCLUSTER REST] Successfully fetched ${resultObj.candles.length} klines via server-side proxy.`);
        return resultObj.candles;
      }
    }
  } catch (proxyErr) {
    console.warn("[PROCLUSTER Client] Server proxy kline fetch failed, attempting direct public API fallback:", proxyErr);
  }

  const endpoint = isFutures
    ? `https://fapi.binance.com/fapi/v1/klines?symbol=${binanceSymbol}&interval=${interval}&limit=1000`
    : `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=1000`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`STATUS ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid format from Binance");
    }

    const candles: ClusterCandle[] = data.map((item: any) => {
      const timestamp = Number(item[0]);
      const open = parseFloat(item[1]);
      const high = parseFloat(item[2]);
      const low = parseFloat(item[3]);
      const close = parseFloat(item[4]);
      const volume = parseFloat(item[5]);
      // Taker buy base asset volume is element 9 in the kline array
      const takerBuyVol = parseFloat(item[9]);
      const takerSellVol = Math.max(0, volume - takerBuyVol);

      // Create cells based on high/low and priceStep
      const cells: ClusterCell[] = [];
      const startPrice = Math.floor(low / priceStep) * priceStep;
      const endPrice = Math.ceil(high / priceStep) * priceStep;

      // Centered Gaussian approximation to distribute volumes across price levels
      const centerPrice = (open + close) / 2;
      const maxPriceDistance = Math.max(endPrice - startPrice, priceStep);

      const tempCells: { price: number; bid: number; ask: number; volume: number }[] = [];
      let maxCellVol = 0;
      let pocIndex = -1;

      // Safe guard against cell count exploding on bad precision parameters
      let cellCount = 0;
      for (let price = startPrice; price <= endPrice; price += priceStep) {
        cellCount++;
        if (cellCount > 250) break;
      }

      let currentPriceLevel = startPrice;
      const parsedLevels: number[] = [];
      for (let i = 0; i < cellCount; i++) {
        parsedLevels.push(parseFloat(currentPriceLevel.toFixed(4)));
        currentPriceLevel += priceStep;
      }

      const weights = parsedLevels.map(p => {
        const dist = Math.abs(p - centerPrice);
        return Math.max(0.01, Math.exp(-Math.pow(dist / (maxPriceDistance * 0.45), 2)));
      });
      const sumWeights = weights.reduce((s, w) => s + w, 0) || 1;

      parsedLevels.forEach((priceLevel, idx) => {
        const weight = weights[idx] / sumWeights;
        const levelVol = volume * weight;
        const takerRatio = volume > 0 ? takerBuyVol / volume : 0.5;
        const ask = levelVol * takerRatio;
        const bid = levelVol * (1 - takerRatio);

        tempCells.push({
          price: priceLevel,
          bid,
          ask,
          volume: levelVol
        });
      });

      // Locate Point of Control (POC) index
      tempCells.forEach((c, idx) => {
        if (c.volume > maxCellVol) {
          maxCellVol = c.volume;
          pocIndex = idx;
        }
      });

      const finalCells: ClusterCell[] = tempCells.map((c, idx) => {
        const isPoc = idx === pocIndex;
        // Standard high ratio diagonal/direct cell imbalances
        const isBuyImbalance = c.ask > c.bid * 1.8 && c.volume > (volume / tempCells.length) * 0.4;
        const isSellImbalance = c.bid > c.ask * 1.8 && c.volume > (volume / tempCells.length) * 0.4;

        return {
          price: c.price,
          bid: parseFloat(c.bid.toFixed(4)),
          ask: parseFloat(c.ask.toFixed(4)),
          volume: parseFloat(c.volume.toFixed(4)),
          isPoc,
          isBuyImbalance,
          isSellImbalance
        };
      });

      const sortedCells = finalCells.sort((a, b) => b.price - a.price);
      const pocCell = sortedCells.find(c => c.isPoc);

      // Estimate Value Area (vah, val) and return candle
      const sortedByVol = [...sortedCells].sort((a, b) => b.volume - a.volume);
      const targetVolSurround = volume * 0.7;
      let runningSum = 0;
      const vahValPrices: number[] = [];
      for (const itemC of sortedByVol) {
        runningSum += itemC.volume;
        vahValPrices.push(itemC.price);
        if (runningSum >= targetVolSurround) break;
      }

      return {
        timestamp,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4)),
        volume: parseFloat(volume.toFixed(4)),
        delta: parseFloat((takerBuyVol - takerSellVol).toFixed(4)),
        pocPrice: pocCell ? pocCell.price : parseFloat(((open + close) / 2).toFixed(4)),
        cells: sortedCells,
        vah: vahValPrices.length > 0 ? parseFloat(Math.max(...vahValPrices).toFixed(4)) : parseFloat(high.toFixed(4)),
        val: vahValPrices.length > 0 ? parseFloat(Math.min(...vahValPrices).toFixed(4)) : parseFloat(low.toFixed(4))
      };
    });

    return candles;
  } catch (err) {
    console.error("[Binance REST] Fetching historical klines failed! Falling back to simulation.", err);
    throw err;
  }
}

export async function fetchBinanceDepth(symbol: string, isFutures: boolean, priceStep: number): Promise<{ bids: OrderBookRow[]; asks: OrderBookRow[] } | null> {
  const binanceSymbol = symbol.toUpperCase().replace("/", "");
  const endpoint = isFutures
    ? `https://fapi.binance.com/fapi/v1/depth?symbol=${binanceSymbol}&limit=1000`
    : `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=1000`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`depth status ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
      throw new Error("Invalid raw depth");
    }

    // Since Binance depth has narrow micro-price ticks, bucket them into 25-tick priceStep
    const aggBids: Record<number, number> = {};
    const aggAsks: Record<number, number> = {};

    data.bids.forEach((item: any) => {
      const p = parseFloat(item[0]);
      const q = parseFloat(item[1]);
      const bucketPrice = parseFloat((Math.floor(p / priceStep) * priceStep).toFixed(4));
      aggBids[bucketPrice] = (aggBids[bucketPrice] || 0) + q;
    });

    data.asks.forEach((item: any) => {
      const p = parseFloat(item[0]);
      const q = parseFloat(item[1]);
      const bucketPrice = parseFloat((Math.ceil(p / priceStep) * priceStep).toFixed(4));
      aggAsks[bucketPrice] = (aggAsks[bucketPrice] || 0) + q;
    });

    const bidsArr: OrderBookRow[] = [];
    let cumulativeBid = 0;
    Object.keys(aggBids)
      .map(Number)
      .sort((a, b) => b - a)
      .slice(0, 80)
      .forEach((price) => {
        const amount = aggBids[price];
        cumulativeBid += amount;
        bidsArr.push({
          price,
          amount,
          total: cumulativeBid,
          percentage: 0
        });
      });

    const asksArr: OrderBookRow[] = [];
    let cumulativeAsk = 0;
    Object.keys(aggAsks)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, 80)
      .forEach((price) => {
        const amount = aggAsks[price];
        cumulativeAsk += amount;
        asksArr.push({
          price,
          amount,
          total: cumulativeAsk,
          percentage: 0
        });
      });

    const maxTotal = Math.max(
      bidsArr.length > 0 ? bidsArr[bidsArr.length - 1].total : 1,
      asksArr.length > 0 ? asksArr[asksArr.length - 1].total : 1
    );

    bidsArr.forEach(b => b.percentage = (b.total / maxTotal) * 100);
    asksArr.forEach(a => a.percentage = (a.total / maxTotal) * 100);

    return { bids: bidsArr, asks: asksArr };
  } catch (err) {
    console.error("[Binance Depth] Failed to fetch. Falling back.", err);
    return null;
  }
}

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
  const [pairs, setPairs] = useState<CryptoPair[]>(() => {
    const saved = localStorage.getItem("procluster_pairs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p: any) => AVAILABLE_PAIRS.some(ap => ap.symbol === p.symbol));
          const sanitized = filtered.map(p => {
            const original = AVAILABLE_PAIRS.find(ap => ap.symbol === p.symbol);
            if (original) {
              const isReasonablePrice = p.price > original.price * 0.1 && p.price < original.price * 10 && !isNaN(p.price);
              const isReasonableStep = p.priceStep > 0 && !isNaN(p.priceStep) && typeof p.priceStep === "number";
              if (!isReasonablePrice) {
                p.price = original.price;
              }
              if (!isReasonableStep) {
                p.priceStep = original.priceStep;
              }
            }
            return p;
          });
          if (sanitized.length > 0) return sanitized;
        }
      } catch (e) {}
    }
    return AVAILABLE_PAIRS;
  });

  const [activePair, setActivePair] = useState<CryptoPair>(() => {
    const savedSymbol = localStorage.getItem("procluster_active_symbol");
    const initialPairs = (() => {
      const saved = localStorage.getItem("procluster_pairs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((p: any) => AVAILABLE_PAIRS.some(ap => ap.symbol === p.symbol));
            const sanitized = filtered.map(p => {
              const original = AVAILABLE_PAIRS.find(ap => ap.symbol === p.symbol);
              if (original) {
                const isReasonablePrice = p.price > original.price * 0.1 && p.price < original.price * 10 && !isNaN(p.price);
                const isReasonableStep = p.priceStep > 0 && !isNaN(p.priceStep) && typeof p.priceStep === "number";
                if (!isReasonablePrice) {
                  p.price = original.price;
                }
                if (!isReasonableStep) {
                  p.priceStep = original.priceStep;
                }
              }
              return p;
            });
            if (sanitized.length > 0) return sanitized;
          }
        } catch (e) {}
      }
      return AVAILABLE_PAIRS;
    })();
    if (savedSymbol) {
      const found = initialPairs.find((p: CryptoPair) => p.symbol === savedSymbol);
      if (found) return found;
    }
    return initialPairs[0] || AVAILABLE_PAIRS[0];
  });
  
  // Dashboard Configurations
  const [interval, setInterval] = useState<string>(() => {
    return localStorage.getItem("procluster_interval") || "15m";
  });
  const [isTickingAll, setIsTickingAll] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "syncing" | "stale">("connected");
  const [marketType, setMarketType] = useState<"SPOT" | "FUTURES">(() => {
    return (localStorage.getItem("procluster_market_type") as "SPOT" | "FUTURES") || "SPOT";
  });
  const [candleType, setCandleType] = useState<"auto" | "japanese" | "footprint" | "clusters">(() => {
    return (localStorage.getItem("procluster_candle_type") as any) || "auto";
  });
  const [candleDataType, setCandleDataType] = useState<"bid_ask" | "delta" | "volume">(() => {
    return (localStorage.getItem("procluster_candle_data_type") as any) || "bid_ask";
  });

  const [compressionMultiplier, setCompressionMultiplier] = useState<number>(() => {
    const saved = localStorage.getItem("procluster_compression_multiplier");
    return saved ? parseInt(saved, 10) || 1 : 1;
  });

  useEffect(() => {
    localStorage.setItem("procluster_compression_multiplier", compressionMultiplier.toString());
  }, [compressionMultiplier]);

  // Load default compression for current pair + interval
  useEffect(() => {
    try {
      const savedMap = localStorage.getItem("procluster_default_compressions");
      if (savedMap) {
        const parsed = JSON.parse(savedMap);
        const tickerData = parsed[activePair.symbol];
        if (tickerData && typeof tickerData[interval] === "number") {
          setCompressionMultiplier(tickerData[interval]);
        }
      }
    } catch (e) {
      console.warn("Failed to load default compression override", e);
    }
  }, [activePair.symbol, interval]);

  // Persists states when they change
  useEffect(() => {
    localStorage.setItem("procluster_pairs", JSON.stringify(pairs));
  }, [pairs]);

  useEffect(() => {
    localStorage.setItem("procluster_active_symbol", activePair.symbol);
  }, [activePair.symbol]);

  useEffect(() => {
    localStorage.setItem("procluster_interval", interval);
  }, [interval]);

  useEffect(() => {
    localStorage.setItem("procluster_market_type", marketType);
    if (marketType === "SPOT") {
      setCompressionMultiplier(1);
      if (interval === "1m" || interval === "5m") {
        setInterval("15m");
      }
    }
  }, [marketType]);

  useEffect(() => {
    localStorage.setItem("procluster_candle_type", candleType);
  }, [candleType]);

  useEffect(() => {
    localStorage.setItem("procluster_candle_data_type", candleDataType);
  }, [candleDataType]);

  // Active User Role state (Guest, Free, Pro, VIP, or Admin) for Telegram notification gating
  const [userRole, setUserRole] = useState<"Guest" | "Free" | "Pro" | "VIP" | "Admin">(() => {
    const savedRole = localStorage.getItem("procluster_role");
    if (savedRole === "Guest" || savedRole === "Free" || savedRole === "Pro" || savedRole === "VIP" || savedRole === "Admin") return savedRole as any;
    
    // Fallback to procluster_user tier if it exists!
    const savedUser = localStorage.getItem("procluster_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const tier = (parsed.tier || "Free").toLowerCase();
        if (tier === "admin" || parsed.role === "Admin" || parsed.subscriptionLevel === "Admin") return "Admin";
        if (tier === "vip" || parsed.subscriptionLevel === "VIP") return "VIP";
        if (tier === "pro" || parsed.subscriptionLevel === "Pro") return "Pro";
        if (tier === "free" || parsed.subscriptionLevel === "Free") return "Free";
        return "Guest";
      } catch (e) {}
    }
    return "Admin"; // Standard default has high permissions
  });

  // Keep saved role synchronous with local storage
  const handleUserRoleChange = (role: "Guest" | "Free" | "Pro" | "VIP" | "Admin") => {
    setUserRole(role);
    localStorage.setItem("procluster_role", role);

    // Keep profileUser and localStorage "procluster_user" synchronized
    setProfileUser((prev) => {
      const tierMap: Record<string, string> = {
        Guest: "Guest",
        Free: "Free",
        Pro: "Pro",
        VIP: "VIP",
        Admin: "Admin"
      };
      const newTier = tierMap[role] || "Free";
      const updated = prev
        ? {
            ...prev,
            tier: newTier,
            role: role,
            subscriptionLevel: role
          }
        : {
            name: role === "Guest" ? "Guest" : role,
            email: role === "Guest" ? "guest@procluster.io" : `${role.toLowerCase()}@procluster.io`,
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            regDate: "2026-05-29",
            tier: newTier,
            role: role,
            subscriptionLevel: role
          };
      localStorage.setItem("procluster_user", JSON.stringify(updated));
      return updated;
    });

    // Notify other components of profile user updates
    window.dispatchEvent(new Event("procluster_user_updated"));
  };

  // Telegram Notifications alerts state
  const [telegramAlerts, setTelegramAlerts] = useState<any[]>([]);
  
  // Track triggered price level clusters to avoid notification spamming in session
  const csSentAlertsRef = useRef<Set<string>>(new Set());

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
        useMinMax: false,
        // Common Settings
        csMergeLevels: 1,
        csImbalancePercent: 60,
        // Medium Filter
        csMedMinVolume: 100,
        csMedMaxVolume: 500,
        csMedMinSize: 4,
        csMedMaxSize: 12,
        csMedShape: "circle",
        csMedColorBid: "#ef4444",
        csMedColorAsk: "#10b981",
        csMedOpacity: 0.70,
        csMedTgAlert: false,
        // Large Filter
        csLargeMinVolume: 500,
        csLargeMinSize: 10,
        csLargeMaxSize: 20,
        csLargeShape: "rhombus",
        csLargeColorBid: "#f43f5e",
        csLargeColorAsk: "#34d399",
        csLargeOpacity: 0.90,
        csLargeTgAlert: false
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
  const [currentView, setCurrentView] = useState<"terminal" | "admin" | "profile">("terminal");
  const [showTickerMenu, setShowTickerMenu] = useState<boolean>(false);
  const tickerMenuRef = useRef<HTMLDivElement>(null);

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(() => {
    const saved = localStorage.getItem("procluster_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    const savedRole = localStorage.getItem("procluster_role") || "Admin";
    const tierMap: Record<string, string> = {
      Guest: "Guest",
      Free: "Free",
      Pro: "Pro",
      VIP: "VIP",
      Admin: "Admin"
    };
    return {
      name: savedRole === "Guest" ? "Guest" : savedRole,
      email: savedRole === "Guest" ? "guest@procluster.io" : `${savedRole.toLowerCase()}@procluster.io`,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      regDate: "2026-05-29",
      tier: tierMap[savedRole] || "Admin"
    };
  });

  // Listen for the local storage changes or custom updates to sync profileUser inside App as well
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem("procluster_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfileUser(parsed);
          
          // Align userRole state and storage perfectly with the parsed profile user tier!
          const tier = (parsed.tier || "Free").toLowerCase();
          let nextRole: "Guest" | "Free" | "Pro" | "VIP" | "Admin" = "Guest";
          if (tier === "admin" || parsed.role === "Admin" || parsed.subscriptionLevel === "Admin") {
            nextRole = "Admin";
          } else if (tier === "vip" || parsed.subscriptionLevel === "VIP") {
            nextRole = "VIP";
          } else if (tier === "pro" || parsed.subscriptionLevel === "Pro") {
            nextRole = "Pro";
          } else if (tier === "free" || parsed.subscriptionLevel === "Free") {
            nextRole = "Free";
          } else {
            nextRole = "Guest";
          }
          
          setUserRole(nextRole);
          localStorage.setItem("procluster_role", nextRole);
        } catch (e) {
          // ignore
        }
      } else {
        setProfileUser(null);
      }
    };
    window.addEventListener("procluster_user_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("procluster_user_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const getActiveGroupLimits = () => {
    let group: "guest" | "free" | "pro" | "vip" | "admin" = "guest";
    
    // First priorities: userRole from header
    if (userRole === "Admin") {
      group = "admin";
    } else if (userRole === "VIP") {
      group = "vip";
    } else if (userRole === "Pro") {
      group = "pro";
    } else if (userRole === "Free") {
      group = "free";
    } else if (userRole === "Guest") {
      group = "guest";
    } else if (profileUser) {
      const tier = (profileUser.tier || "Free").toLowerCase();
      if (tier === "admin" || (profileUser as any).role === "Admin" || (profileUser as any).subscriptionLevel === "Admin") {
        group = "admin";
      } else if (tier === "vip" || (profileUser as any).subscriptionLevel === "VIP") {
        group = "vip";
      } else if (tier === "pro" || tier === "rpo" || (profileUser as any).subscriptionLevel === "RPO") {
        group = "pro";
      } else if (tier === "free") {
        group = "free";
      } else {
        group = "guest";
      }
    }

    let settings: Record<"guest" | "free" | "pro" | "vip" | "admin", {
      maxHistory: number;
      compressionLevels: number;
      maxIndicators: number;
      customIndicatorSettings: boolean;
      telegramNotifications: boolean;
    }> = {
      guest: { maxHistory: 100, compressionLevels: 1, maxIndicators: 1, customIndicatorSettings: false, telegramNotifications: false },
      free: { maxHistory: 200, compressionLevels: 2, maxIndicators: 2, customIndicatorSettings: false, telegramNotifications: false },
      pro: { maxHistory: 1000, compressionLevels: 4, maxIndicators: 5, customIndicatorSettings: true, telegramNotifications: false },
      vip: { maxHistory: 5000, compressionLevels: 5, maxIndicators: 15, customIndicatorSettings: true, telegramNotifications: true },
      admin: { maxHistory: 10000, compressionLevels: 6, maxIndicators: 99, customIndicatorSettings: true, telegramNotifications: true }
    };
    const savedSettings = localStorage.getItem("procluster_tier_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
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
          settings = parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return settings[group] || settings.free;
  };

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

  // --- WebSocket & Real-Time Connection Refs & Buffers ---
  const incomingTradesBufferRef = useRef<{ id: string; timestamp: number; price: number; amount: number; side: "buy" | "sell" }[]>([]);
  const lastTickTimeRef = useRef<number>(Date.now());
  const activePairRef = useRef<CryptoPair>(activePair);
  const intervalRef = useRef<string>(interval);
  const orderBookTickStepRef = useRef<number>(0.01);
  
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
    let active = true;
    setConnectionStatus("syncing");

    const isFutures = marketType === "FUTURES";
    const isBtc = activePair.symbol.toUpperCase().includes("BTC");
    const baseTickStep = isBtc 
      ? (isFutures ? 0.1 : 0.01) 
      : getBaseTickSize(activePair.symbol);
    
    // Graph/Cluster compression (Returned back to original)
    const baseCompression = isBtc
      ? (isFutures ? 25 : 500)
      : 25;
    
    const compression = baseCompression * compressionMultiplier;
      
    const tickStep = baseTickStep * compression;

    // Orderbook compression (Decoupled: Spot is 5000, Futures remains tickStep)
    const orderBookTickStep = isFutures
      ? tickStep
      : (baseTickStep * 5000);
      
    orderBookTickStepRef.current = orderBookTickStep;

    async function loadRealBinanceData() {
      try {
        const isFutures = marketType === "FUTURES";
        
        // 1. Fetch real historical candles or aggregate 50 ticks from Binance REST API
        let realCandles: ClusterCandle[] = [];
        if (interval === "50t") {
          realCandles = await fetchBinanceTicksAndAggregate(activePair.symbol, isFutures, tickStep, 50);
        } else {
          realCandles = await fetchBinanceKlines(activePair.symbol, interval, isFutures, tickStep);
        }
        if (!active) return;
        const limits = getActiveGroupLimits();
        setCandles(realCandles.slice(-limits.maxHistory));

        if (realCandles.length > 0) {
          const lastCandle = realCandles[realCandles.length - 1];
          // Re-align activePair's live price to match the close of the last kline and set correct tickStep
          setActivePair(prev => {
            if (prev.symbol === activePair.symbol) {
              return {
                ...prev,
                price: lastCandle.close,
                priceStep: tickStep
              };
            }
            return prev;
          });
          setPairs(prevPairs => prevPairs.map(p => {
            if (p.symbol === activePair.symbol) {
              return {
                ...p,
                price: lastCandle.close,
                priceStep: tickStep
              };
            }
            return p;
          }));
        }

        // 2. Fetch real initial Order Book depth from Binance Depth API (Using orderBookTickStep)
        const realBook = await fetchBinanceDepth(activePair.symbol, isFutures, orderBookTickStep);
        if (!active) return;
        if (realBook) {
          setOrderBook(realBook);
        } else {
          setOrderBook(generateOrderBook(activePair.price, orderBookTickStep));
        }

        setConnectionStatus("connected");
      } catch (err) {
        console.warn("[Binance REST] Load failed, falling back to simulated data with custom compression", err);
        if (!active) return;

        const limits = getActiveGroupLimits();
        const histCandles = generateHistoricalCandles({ ...activePair, priceStep: tickStep }, Math.min(120, limits.maxHistory), parseInterval(interval));
        if (interval === "50t") {
          histCandles.forEach(c => {
            c.tickCount = 50;
          });
        }
        setCandles(histCandles);

        const initialBook = generateOrderBook(activePair.price, orderBookTickStep);
        setOrderBook(initialBook);

        setConnectionStatus("connected");
      }
    }

    loadRealBinanceData();

    // Presets some historical starting trades
    const histTrades: LiveTrade[] = [];
    for (let i = 0; i < 15; i++) {
      histTrades.push(generateLiveTrade(activePair.price, tickStep));
    }
    setTrades(histTrades.sort((a, b) => b.timestamp - a.timestamp));

    return () => {
      active = false;
    };
  }, [activePair.symbol, interval, marketType, compressionMultiplier]);

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
    setOrderBook(generateOrderBook(lastTick.price, orderBookTickStepRef.current));

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

          const limits = getActiveGroupLimits();
          nextCandles = [...nextCandles, newCandle].slice(-limits.maxHistory);
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

          // --- REAL-TIME TELEGRAM ALERT CHECKER ---
          const csSettingsObj = indicators.find((i) => i.id === "clusterSearch")?.settings || {};
          const isClusterSearchActive = indicators.find((i) => i.id === "clusterSearch")?.isActive ?? false;

          if (isClusterSearchActive && lastCandle.cells && lastCandle.cells.length > 0) {
            const csMergeLevels = typeof csSettingsObj.csMergeLevels === "number" ? csSettingsObj.csMergeLevels : 1;
            const csImbalancePercent = typeof csSettingsObj.csImbalancePercent === "number" ? csSettingsObj.csImbalancePercent : 60;
            
            // Filters
            const csMedMinVolume = typeof csSettingsObj.csMedMinVolume === "number" ? csSettingsObj.csMedMinVolume : 100;
            const csMedMaxVolume = typeof csSettingsObj.csMedMaxVolume === "number" ? csSettingsObj.csMedMaxVolume : 500;
            const csMedTgAlert = csSettingsObj.csMedTgAlert ?? false;
            
            const csLargeMinVolume = typeof csSettingsObj.csLargeMinVolume === "number" ? csSettingsObj.csLargeMinVolume : 500;
            const csLargeTgAlert = csSettingsObj.csLargeTgAlert ?? false;

            const sortedList = [...lastCandle.cells].sort((a, b) => b.price - a.price);
            const K = Math.max(1, Math.min(csMergeLevels, sortedList.length));

            for (let i = 0; i <= sortedList.length - K; i++) {
              let sumVolume = 0;
              let sumBid = 0;
              let sumAsk = 0;
              
              for (let j = 0; j < K; j++) {
                const cell = sortedList[i + j];
                if (cell) {
                  sumVolume += cell.volume;
                  sumBid += cell.bid;
                  sumAsk += cell.ask;
                }
              }

              if (sumVolume <= 0) continue;

              const bidImbalance = (sumBid / sumVolume) * 100;
              const askImbalance = (sumAsk / sumVolume) * 100;

              const isBidDominant = bidImbalance >= csImbalancePercent;
              const isAskDominant = askImbalance >= csImbalancePercent;

              if (!isBidDominant && !isAskDominant) {
                continue;
              }

              const imbalanceSide = isBidDominant ? "bid" : "ask";
              const imbalancePercent = Math.round(isBidDominant ? bidImbalance : askImbalance);

              // Classify filter match
              let matchedFilterType: "medium" | "large" | null = null;
              let alertEnabled = false;

              if (sumVolume >= csLargeMinVolume) {
                matchedFilterType = "large";
                alertEnabled = csLargeTgAlert;
              } else if (sumVolume >= csMedMinVolume && sumVolume <= csMedMaxVolume) {
                matchedFilterType = "medium";
                alertEnabled = csMedTgAlert;
              }

              if (matchedFilterType && alertEnabled) {
                const startPrice = sortedList[i].price;
                const uniqueAlertId = `${lastCandle.timestamp}_${startPrice}_${matchedFilterType}`;

                if (!csSentAlertsRef.current.has(uniqueAlertId)) {
                  csSentAlertsRef.current.add(uniqueAlertId);

                  const formattedPrice = startPrice.toLocaleString();
                  const sideStr = imbalanceSide === "bid" 
                    ? (language === "RU" ? "преобладание бидов (продавцы)" : "Bid Dominance (Sellers)")
                    : (language === "RU" ? "преобладание асков (покупатели)" : "Ask Dominance (Buyers)");
                  
                  const filterLabel = matchedFilterType === "large" 
                    ? (language === "RU" ? "🚨 КРУПНЫЙ ФИЛЬТР СТАКАНА" : "🚨 LARGE CLUSTER FILTER")
                    : (language === "RU" ? "🐳 СРЕДНИЙ ФИЛЬТР СТАКАНА" : "🐳 MEDIUM CLUSTER FILTER");

                  const limits = getActiveGroupLimits();
                  let msg = "";
                  if (!limits.telegramNotifications) {
                    if (language === "RU") {
                      msg = `[Блокировка: тариф не поддерживает ТГ-оповещения] ${filterLabel}: Объем в ${Math.round(sumVolume)} контрактов замечен на BTC/USD уровне цены $${formattedPrice}!`;
                    } else {
                      msg = `[Blocked: tariff doesn't support TG notification triggers] ${filterLabel}: Volume of ${Math.round(sumVolume)} detected at BTC/USD level of $${formattedPrice}!`;
                    }
                  } else {
                    if (language === "RU") {
                      msg = `${filterLabel}: Объем в ${Math.round(sumVolume)} контрактов замечен на BTC/USD уровне цены $${formattedPrice}! Перевес по Bid/Ask: ${imbalancePercent}% (${sideStr}). Объединено уровней: ${csMergeLevels}.`;
                    } else {
                      msg = `${filterLabel}: Volume of ${Math.round(sumVolume)} detected at BTC/USD level of $${formattedPrice}! Bid/Ask Imbalance: ${imbalancePercent}% (${sideStr}). Levels merged: ${csMergeLevels}.`;
                    }
                  }

                  const newAlert = {
                    id: "tg-alert-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
                    timestamp: Date.now(),
                    message: msg,
                    type: matchedFilterType,
                    isBlocked: !limits.telegramNotifications,
                    pair: activePairRef.current.symbol,
                    price: startPrice,
                    volume: sumVolume,
                    imbalanceSide,
                    imbalancePercent,
                    dismissed: false
                  };

                  setTelegramAlerts(prev => [newAlert, ...prev].slice(0, 100));
                  console.log("[Telegram Router Core]: Dispatched notification alert. Active TG permission: " + limits.telegramNotifications);
                }
              }
            }
          }

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

  // 2. High frequency queue flushing timer for real-time ticks
  useEffect(() => {
    if (!isTickingAll) return;

    const flusherId = window.setInterval(() => {
      if (incomingTradesBufferRef.current.length === 0) return;

      const ticksToProcess = [...incomingTradesBufferRef.current];
      incomingTradesBufferRef.current = [];

      processTicks(ticksToProcess);
    }, 100);

    return () => window.clearInterval(flusherId);
  }, [isTickingAll]);

  // Translate intervals to minutes
  const parseInterval = (val: string): number => {
    if (val === "1m") return 1;
    if (val === "5m") return 5;
    if (val === "15m") return 15;
    if (val === "30m") return 30;
    if (val === "1h") return 60;
    if (val === "4h") return 240;
    return 15;
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
      theme === "light" ? "bg-[#e2e8f0] text-slate-900" : "bg-[#030712]/92 text-slate-100"
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
        userRole={userRole}
        onChangeUserRole={handleUserRoleChange}
        onOpenProfile={() => setCurrentView("profile")}
        onOpenHome={() => setCurrentView("terminal")}
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
      ) : currentView === "profile" ? (
        <UserProfile
          user={profileUser}
          onUpdateUser={setProfileUser}
          onClose={() => setCurrentView("terminal")}
          theme={theme}
          language={language}
        />
      ) : (
        <>
          {/* DASHBOARD STATISTICS HUD BANNER WITH GLASSMORPHISM */}
      <section className={`backdrop-blur-md border-b px-5 py-2 flex flex-wrap items-center justify-between gap-y-3 gap-x-5 relative z-30 transition-shadow duration-300 ${
        theme === "light"
          ? "bg-white/95 border-slate-300 shadow-md"
          : "bg-slate-950/40 border-slate-900/60 shadow-md"
      }`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* 1. Ticker Dropdown Select */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-500" : "text-slate-400/80"
            }`}>
              Active Ticker
            </span>
            <div className="relative font-sans" ref={tickerMenuRef}>
              <button
                onClick={() => setShowTickerMenu(!showTickerMenu)}
                className={`flex items-center justify-between gap-3 px-3 py-1 rounded-lg text-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all min-w-[130px] h-[30px] select-none border ${
                  theme === "light"
                    ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-900 font-black shadow-sm"
                    : "liquid-glass-button border-white/5 text-yellow-400 font-extrabold"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                  <span className={`font-mono tracking-tight font-extrabold text-xs sm:text-sm ${theme === "light" ? "text-slate-800" : "text-white"}`}>{activePair.symbol}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                  theme === "light" ? "text-slate-600" : "text-slate-400"
                } ${showTickerMenu ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showTickerMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className={`absolute left-0 mt-1.5 w-48 rounded-xl p-2 z-50 text-left select-none shadow-2xl backdrop-blur-md border transition-all duration-300 ${
                      theme === "light"
                        ? "bg-white border-slate-300 text-slate-900 shadow-2xl"
                        : "bg-[#090d16]/98 border border-white/10 text-slate-100"
                    }`}
                  >
                    <div className={`text-[9px] font-bold px-2 pb-1 border-b mb-1.5 uppercase tracking-widest ${
                      theme === "light" ? "text-slate-500 border-slate-100" : "text-slate-400 border-white/5"
                    }`}>
                      {language === "EN" ? "Available Pairs" : language === "KZ" ? "Қолжетімді жұптар" : "Доступные пары"}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {pairs.map((p) => (
                        <button
                          key={p.symbol}
                          onClick={() => {
                            setActivePair(p);
                            setShowTickerMenu(false);
                          }}
                          className={`flex items-center justify-between px-2 py-1 rounded-lg text-left cursor-pointer transition-all ${
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
                            <Check className="w-3" />
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
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-600 font-bold" : "text-slate-400/80"
            }`}>
              Market Type
            </span>
            <div className={`grid grid-cols-2 gap-0.5 p-[2px] rounded-lg h-[30px] items-center min-w-[130px] select-none transition-all duration-300 border ${
              theme === "light" ? "bg-slate-200 border-slate-300" : "bg-slate-950/60 border-white/5"
            }`}>
              {(["SPOT", "FUTURES"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMarketType(type)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all duration-200 cursor-pointer text-center leading-none ${
                    marketType === type
                      ? theme === "light"
                        ? "bg-white text-slate-900 font-extrabold border border-slate-300 shadow-sm"
                        : "bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 font-extrabold shadow-inner"
                      : theme === "light"
                        ? "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                        : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Interval */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-600 font-bold" : "text-slate-400/80"
            }`}>
              Interval
            </span>
            <div className="flex items-center gap-1">
              {(marketType === "SPOT" ? ["15m", "30m", "1h", "4h"] : ["1m", "5m", "15m", "30m", "1h", "4h", "50t"]).map((item) => (
                <button
                  key={item}
                  onClick={() => setInterval(item)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all duration-200 h-[30px] ${
                    interval === item
                      ? theme === "light"
                        ? "bg-amber-100 text-amber-900 border border-amber-400 font-black shadow-sm"
                        : "liquid-glass-active text-yellow-400 font-black"
                      : theme === "light"
                        ? "bg-slate-200 hover:bg-slate-300 hover:text-slate-900 text-slate-700 font-bold border border-slate-300 shadow-sm"
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
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-600 font-bold" : "text-slate-400/80"
            }`}>
              {language === "EN" ? "Candle Type" : language === "KZ" ? "Шамдар түрі" : "Тип свечей"}
            </span>
            <div className={`flex items-center p-[2px] rounded-lg h-[30px] select-none transition-all duration-300 border ${
              theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950/60 border-white/5"
            }`}>
              {[
                { id: "auto", label: language === "EN" ? "Auto" : "Авто", icon: AutoIcon },
                { id: "japanese", label: language === "EN" ? "Japanese Candlesticks" : language === "KZ" ? "Жапон шамдары" : "Японские свечи", icon: JapaneseIcon },
                { id: "footprint", label: language === "EN" ? "Footprint" : "Футпринт", icon: FootprintIcon },
                { id: "clusters", label: language === "EN" ? "Clusters" : language === "KZ" ? "Кластерлер" : "Кластера", icon: ClustersIcon }
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = candleType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCandleType(item.id as any)}
                    title={item.label}
                    className="relative flex-1 px-2 py-0.5 rounded-md text-xs font-bold cursor-pointer text-center leading-none h-[24px] flex items-center justify-center border-0 outline-none select-none"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeCandleType"
                        className={`absolute inset-0 rounded-md ${
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
                          ? "text-blue-800 font-black"
                          : "text-blue-400 font-extrabold"
                        : theme === "light"
                          ? "text-slate-600 hover:text-slate-900 font-bold"
                          : "text-slate-400 hover:text-slate-200"
                    }`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Candle Data Type Switcher */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-600 font-bold" : "text-slate-400/80"
            }`}>
              {language === "EN" ? "Candle Data" : language === "KZ" ? "Шамдағы деректер" : "Данные в свечах"}
            </span>
            <div className={`flex items-center p-[2px] rounded-lg h-[30px] select-none transition-all duration-300 border ${
              theme === "light" ? "bg-slate-200 border-slate-300" : "bg-slate-950/60 border-white/5"
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
                    className="relative flex-1 px-2 py-0.5 rounded-md text-xs font-bold cursor-pointer text-center leading-none h-[24px] flex items-center justify-center border-0 outline-none select-none"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeCandleDataType"
                        className={`absolute inset-0 rounded-md ${
                          theme === "light"
                            ? "bg-white border border-slate-300 shadow-sm"
                            : "bg-blue-500/10 border border-blue-500/25 shadow-inner"
                        }`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className={`relative z-10 font-mono text-[10px] sm:text-[11px] whitespace-nowrap transition-colors duration-200 ${
                      isSelected
                        ? theme === "light"
                          ? "text-blue-800 font-black"
                          : "text-blue-400 font-extrabold"
                        : theme === "light"
                          ? "text-slate-600 hover:text-slate-900 font-bold"
                          : "text-slate-400 hover:text-slate-200"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Compression Select */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-600 font-bold" : "text-slate-400/80"
            }`}>
              {language === "EN" ? "Compression" : language === "KZ" ? "Сығылу деңгейі" : "Сжатие графика"}
            </span>
            <select
              value={compressionMultiplier}
              onChange={(e) => setCompressionMultiplier(parseInt(e.target.value))}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono cursor-pointer h-[30px] border focus:outline-none transition-all duration-200 outline-none w-full ${
                theme === "light"
                  ? "bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-800 shadow-sm"
                  : "bg-slate-950/60 border-white/5 text-slate-300 hover:text-slate-100 liquid-glass-button"
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((multiplier) => {
                const limits = getActiveGroupLimits();
                const isLocked = multiplier > limits.compressionLevels;
                const isBtc = activePair.symbol.toUpperCase().includes("BTC");
                const baseComp = isBtc 
                  ? (marketType === "FUTURES" ? 25 : 500) 
                  : 25;
                const actualValue = baseComp * multiplier;
                return (
                  <option 
                    key={multiplier} 
                    value={multiplier} 
                    disabled={isLocked}
                    className={theme === "light" ? "bg-white text-slate-900 font-sans" : "bg-slate-950 text-slate-350 font-sans"}
                  >
                    {multiplier}x ({actualValue}){isLocked ? " 🔒 (Уровень закрыт)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Indicators Trigger Button */}
          <div>
            <span className={`text-[10px] uppercase font-mono tracking-widest font-bold block mb-0.5 ${
              theme === "light" ? "text-slate-600 font-bold" : "text-slate-400/80"
            }`}>
              Active Controls
            </span>
            <button
              onClick={() => setIsIndicatorsModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs cursor-pointer h-[30px] hover:scale-[1.01] active:scale-[0.99] transition-all border ${
                theme === "light"
                  ? "bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-sm"
                  : "liquid-glass-button text-slate-300 hover:text-slate-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>{language === "EN" ? "Indicators" : language === "KZ" ? "Индикаторлар" : "Индикаторы"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
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
                  onToggleIndicator={(id) => {
                    setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, isActive: !ind.isActive } : ind));
                  }}
                  onRemoveIndicator={(id) => {
                    setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, isActive: false } : ind));
                  }}
                  onShowIndicatorsSettings={() => setIsIndicatorsModalOpen(true)}
                />
              </div>

              {/* Right Sidebar Column: DOM Sidebar with Interactive Trading */}
              <aside className="w-full lg:w-[380px] flex flex-col shrink-0 min-h-0">
                <DOMSidebar orderBook={orderBook} activePair={activePair} theme={theme} />
              </aside>
            </div>


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

      {/* ✈️ REAL-TIME TELEGRAM ALERT BANNER BOX */}
      {indicators.find(i => i.id === "clusterSearch")?.isActive && (
        <div className="fixed bottom-6 right-6 z-[999] max-w-sm w-full flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {telegramAlerts.filter(a => !a.dismissed).slice(0, 3).map((alert) => {
              const isAllowed = userRole === "VIP" || userRole === "Admin";
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`pointer-events-auto rounded-[24px] p-4.5 shadow-2xl border transition-all ${
                    theme === "light"
                      ? "bg-white border-slate-205 text-slate-800 shadow-slate-200/50"
                      : "bg-[#090d16]/95 border-sky-500/20 text-slate-100 shadow-black/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[12px] animate-bounce">✈️</span>
                      <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${
                        theme === "light" ? "text-sky-700" : "text-sky-400"
                      }`}>
                        {language === "RU" ? "ТГ Увед-Бот" : "Telegram Alert Bot"}
                      </span>
                      {isAllowed ? (
                        <span className="text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/25">
                          {userRole}
                        </span>
                      ) : (
                        <span className="text-[8px] font-extrabold uppercase bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/25">
                          {language === "RU" ? "ЗАБЛОКИРОВАНО (GUEST)" : "LOCKED (GUEST)"}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setTelegramAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, dismissed: true } : a));
                      }}
                      className={`text-[11px] font-bold cursor-pointer hover:bg-slate-200/50 hover:text-red-500 p-1 rounded-lg ${
                        theme === "light" ? "text-slate-400" : "text-slate-500 hover:bg-white/5"
                      }`}
                    >
                      ✕
                    </button>
                  </div>

                  {!isAllowed ? (
                    <div className="relative">
                      {/* Blurred teaser message */}
                      <div className="filter blur-[4.5px] select-none opacity-40 text-[10.5px] font-mono leading-relaxed pointer-events-none">
                        🚨 LARGE CLUSTER FILTER: BTC/USD Volume of 1840K detected at price level $67,930! Imbalance: 75% Bid Dominance.
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                        <span className="text-[11.5px] font-bold text-amber-500 flex items-center gap-1 mb-0.5">
                          🔒 {language === "RU" ? "Только для VIP & Admin" : "Exclusive VIP & Admin Feature"}
                        </span>
                        <p className={`text-[9.5px] leading-snug max-w-[280px] font-medium ${theme === "light" ? "text-slate-500" : "text-slate-405"}`}>
                          {language === "RU" 
                            ? "Выберите роль VIP или Admin в меню профиля сверху справа, чтобы мгновенно включить поток уведомлений в Телеграм."
                            : "Select VIP or Admin as your role in the profile dropdown at the top-right to instantly unlock Telegram alerts streams."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10.5px] font-mono font-bold leading-relaxed whitespace-pre-wrap">
                        {alert.message}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[8px] font-mono font-bold text-slate-550">
                        <span>{language === "RU" ? "ОТПРАВЛЕНО В @PROCLUSTER_BOT" : "SENT TO @PROCLUSTER_BOT"}</span>
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
