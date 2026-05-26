/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { OrderBook as OrderBookType, CryptoPair } from "../types";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Zap, 
  ShieldAlert, 
  Plus, 
  Minus,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface DOMSidebarProps {
  orderBook: OrderBookType;
  activePair: CryptoPair;
  theme?: "dark" | "light";
}

interface LimitOrder {
  id: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  symbol: string;
}

interface TradeLog {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "buy" | "sell" | "cancel";
}

export default function DOMSidebar({ orderBook, activePair, theme = "dark" }: DOMSidebarProps) {
  const isLight = theme === "light";
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const isAutoCenteringRef = useRef<boolean>(false);

  // Center scroll vertically on mount or pair/book length changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const midPoint = (container.scrollHeight - container.clientHeight) / 2;
      container.scrollTop = midPoint;
      lastInteractionTimeRef.current = Date.now();
    }
  }, [activePair.symbol, orderBook.bids.length, orderBook.asks.length]);

  // Track interaction and auto-center after 3 seconds of inactivity
  useEffect(() => {
    const handleScroll = () => {
      if (isAutoCenteringRef.current) {
        // Scroll event from auto-centering, ignore it
        return;
      }
      lastInteractionTimeRef.current = Date.now();
    };

    const handleMouseMove = () => {
      lastInteractionTimeRef.current = Date.now();
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      container.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionTimeRef.current >= 3000) {
        if (scrollContainerRef.current) {
          const cont = scrollContainerRef.current;
          const midPoint = (cont.scrollHeight - cont.clientHeight) / 2;
          if (Math.abs(cont.scrollTop - midPoint) > 10) {
            isAutoCenteringRef.current = true;
            cont.scrollTo({ top: midPoint, behavior: "smooth" });
            // Reset the flag after smooth scroll is complete
            setTimeout(() => {
              isAutoCenteringRef.current = false;
            }, 600);
          }
        }
      }
    }, 1000);

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
        container.removeEventListener("mousemove", handleMouseMove);
      }
      clearInterval(interval);
    };
  }, [activePair.symbol]);

  // --- Persistent Simulator State ---
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem("procluster_balance_v2");
    return saved ? parseFloat(saved) : 100000;
  });

  const [position, setPosition] = useState<number>(() => {
    const saved = localStorage.getItem("procluster_position_v2");
    return saved ? parseFloat(saved) : 0;
  });

  const [entryPrice, setEntryPrice] = useState<number>(() => {
    const saved = localStorage.getItem("procluster_entry_price_v2");
    return saved ? parseFloat(saved) : 0;
  });

  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>(() => {
    const saved = localStorage.getItem("procluster_limit_orders_v2");
    return saved ? JSON.parse(saved) : [];
  });

  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  // Input state for user order parameters
  const [orderSizeInput, setOrderSizeInput] = useState<string>("0.5");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");

  // Persist simulator variables to localStorage when changes occur
  useEffect(() => {
    localStorage.setItem("procluster_balance_v2", balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("procluster_position_v2", position.toString());
  }, [position]);

  useEffect(() => {
    localStorage.setItem("procluster_entry_price_v2", entryPrice.toString());
  }, [entryPrice]);

  useEffect(() => {
    localStorage.setItem("procluster_limit_orders_v2", JSON.stringify(limitOrders));
  }, [limitOrders]);

  // Set default limit price input to active pair price if blank
  useEffect(() => {
    if (!limitPriceInput) {
      setLimitPriceInput(activePair.price.toFixed(2));
    }
  }, [activePair.symbol]);

  // Ref to track last ticking price to detect tick-crossing/touching limit orders
  const prevPriceRef = useRef<number>(activePair.price);

  // --- Crypto Fear and Greed Index State & Real-time Update Mechanism ---
  const [fearGreedValue, setFearGreedValue] = useState<number>(() => {
    return 65 + Math.floor(Math.random() * 8) - 4; // realistic initial value
  });

  const lastPriceRef = useRef<number>(activePair.price);

  useEffect(() => {
    const diff = activePair.price - lastPriceRef.current;
    if (diff !== 0) {
      setFearGreedValue(prev => {
        // Upward moves step greed higher, downward steps depress it
        const delta = (diff / lastPriceRef.current) * 120; 
        const walked = prev + delta + (Math.random() * 0.16 - 0.08); 
        return Math.min(94, Math.max(12, walked));
      });
      lastPriceRef.current = activePair.price;
    }
  }, [activePair.price]);

  // Helper sentiment selectors
  const getSentimentLabel = (val: number) => {
    if (val <= 25) return "Extreme Fear 😨";
    if (val <= 45) return "Fear 😧";
    if (val <= 54) return "Neutral 😐";
    if (val <= 75) return "Greed 🤑";
    return "Extreme Greed 🚀";
  };

  const getSentimentColor = (val: number) => {
    if (val <= 25) return "#f43f5e"; // rose-500
    if (val <= 45) return "#f97316"; // orange-500
    if (val <= 54) return "#eab308"; // yellow-500
    if (val <= 75) return "#10b981"; // emerald-500
    return "#22d3ee"; // cyan-400
  };

  const getSentimentTextColor = (val: number) => {
    if (val <= 25) return "text-rose-450";
    if (val <= 45) return "text-orange-455";
    if (val <= 54) return "text-yellow-450";
    if (val <= 75) return "text-emerald-450";
    return "text-cyan-400";
  };

  // --- Real-time Order Matching Engine ---
  useEffect(() => {
    const currentPrice = activePair.price;
    const prevPrice = prevPriceRef.current;

    if (currentPrice === prevPrice) return;
    if (limitOrders.length === 0) {
      prevPriceRef.current = currentPrice;
      return;
    }

    const remainingOrders: LimitOrder[] = [];
    let updatedBalance = balance;
    let updatedPosition = position;
    let updatedEntryPrice = entryPrice;
    let anyFilled = false;

    // Filter and trigger limit orders that got hit/crossed
    for (const order of limitOrders) {
      // Rule: only matches orders for the active symbol
      if (order.symbol !== activePair.symbol) {
        remainingOrders.push(order);
        continue;
      }

      let isTriggered = false;
      const minPrice = Math.min(prevPrice, currentPrice);
      const maxPrice = Math.max(prevPrice, currentPrice);

      if (order.side === "buy") {
        // Buy Limit triggers if price drops to or below the limit order price
        if (order.price >= currentPrice || (order.price >= minPrice && order.price <= maxPrice)) {
          isTriggered = true;
        }
      } else {
        // Sell Limit triggers if price rises to or above the limit order price
        if (order.price <= currentPrice || (order.price >= minPrice && order.price <= maxPrice)) {
          isTriggered = true;
        }
      }

      if (isTriggered) {
        anyFilled = true;
        const transactionValue = order.price * order.size;

        if (order.side === "buy") {
          // Check if user has enough balance to buy
          if (updatedBalance >= transactionValue) {
            updatedBalance -= transactionValue;
            
            // Adjust position & entry price
            const isLong = updatedPosition >= 0;
            if (isLong) {
              const prevSize = updatedPosition;
              const nextSize = prevSize + order.size;
              updatedEntryPrice = nextSize > 0 
                ? (prevSize * updatedEntryPrice + order.price * order.size) / nextSize 
                : 0;
              updatedPosition = nextSize;
            } else {
              // we are short: partial buy to cover
              const shortCovered = Math.min(-updatedPosition, order.size);
              const remainingAdd = order.size - shortCovered;
              
              // Realize short profit/loss
              const shortProfit = shortCovered * (updatedEntryPrice - order.price);
              updatedBalance += shortProfit; // apply pnl back to balance
              
              if (remainingAdd > 0) {
                // position flipped to Long
                updatedPosition = remainingAdd;
                updatedEntryPrice = order.price;
              } else {
                updatedPosition += shortCovered;
                if (updatedPosition === 0) updatedEntryPrice = 0;
              }
            }

            addLog(
              `🎯 FILLED: Limit Buy ${order.size} ${activePair.symbol} @ $${order.price.toLocaleString()}`, 
              "buy"
            );
          } else {
            addLog(
              `⚠️ REJECTED: Insufficient funds for pending Limit Buy @ $${order.price.toLocaleString()}`, 
              "cancel"
            );
          }
        } else {
          // Side === "sell"
          // Sell order can always be executed either as opening a short or selling holdings.
          const isShort = updatedPosition <= 0;
          if (isShort) {
            const prevSize = Math.abs(updatedPosition);
            const nextSize = prevSize + order.size;
            updatedEntryPrice = nextSize > 0 
              ? (prevSize * updatedEntryPrice + order.price * order.size) / nextSize 
              : 0;
            updatedPosition = -nextSize;
          } else {
            // closing long position
            const longCovered = Math.min(updatedPosition, order.size);
            const remainingShort = order.size - longCovered;

            // realize long pnl
            const longProfit = longCovered * (order.price - updatedEntryPrice);
            updatedBalance += longProfit; // Add pnl back to cash balance
            updatedBalance += longCovered * order.price; // credit collateral cash back too (representing total closed trade credit)
            
            if (remainingShort > 0) {
              updatedPosition = -remainingShort;
              updatedEntryPrice = order.price;
            } else {
              updatedPosition -= longCovered;
              if (updatedPosition === 0) updatedEntryPrice = 0;
            }
          }

          addLog(
            `🎯 FILLED: Limit Sell ${order.size} ${activePair.symbol} @ $${order.price.toLocaleString()}`, 
            "sell"
          );
        }
      } else {
        remainingOrders.push(order);
      }
    }

    if (anyFilled) {
      setBalance(parseFloat(updatedBalance.toFixed(2)));
      setPosition(parseFloat(updatedPosition.toFixed(4)));
      setEntryPrice(parseFloat(updatedEntryPrice.toFixed(4)));
      setLimitOrders(remainingOrders);
    }

    prevPriceRef.current = currentPrice;
  }, [activePair.price, limitOrders, balance, position, entryPrice]);

  // Helper helper to format log lines
  const addLog = (message: string, type: TradeLog["type"]) => {
    const newLog: TradeLog = {
      id: Math.random().toString(),
      timestamp: Date.now(),
      message,
      type
    };
    setTradeLogs(prev => [newLog, ...prev].slice(0, 30));
  };

  // Pre-seed some welcome messages in the trade logs on mount
  useEffect(() => {
    addLog("⚡ PROCLUSTER Simulated DOM Router Online. Ready for tape feed...", "info");
    addLog("💡 Tip: Click any row price on the DOM ladder to snap Limit price input!", "info");
  }, []);

  // Calculate live unrealized profits
  const unrealizedPnL = position !== 0 
    ? position * (activePair.price - entryPrice) 
    : 0;

  const tradeSize = parseFloat(orderSizeInput) || 0;
  const limitPrice = parseFloat(limitPriceInput) || 0;

  // --- Trade placing functions ---
  const handleMarketBuy = () => {
    if (tradeSize <= 0) return;
    const orderCost = activePair.price * tradeSize;
    if (balance < orderCost) {
      addLog(`⚠️ Order rejected: Insufficient cash balance ($${balance.toLocaleString()} / $${orderCost.toLocaleString()} required)`, "cancel");
      return;
    }

    const nextBalance = balance - orderCost;
    let nextPosition = position;
    let nextEntryPrice = entryPrice;

    const isLong = position >= 0;
    if (isLong) {
      const prevSize = position;
      const nextSize = prevSize + tradeSize;
      nextEntryPrice = nextSize > 0 
        ? (prevSize * entryPrice + activePair.price * tradeSize) / nextSize 
        : 0;
      nextPosition = nextSize;
    } else {
      // cover partial short
      const shortCovered = Math.min(-position, tradeSize);
      const remainingLong = tradeSize - shortCovered;

      // Realize profit/loss
      const profit = shortCovered * (entryPrice - activePair.price);
      setBalance(prev => parseFloat((prev + profit).toFixed(2)));

      if (remainingLong > 0) {
        nextPosition = remainingLong;
        nextEntryPrice = activePair.price;
      } else {
        nextPosition += shortCovered;
        if (nextPosition === 0) nextEntryPrice = 0;
      }
    }

    setBalance(parseFloat(nextBalance.toFixed(2)));
    setPosition(parseFloat(nextPosition.toFixed(4)));
    setEntryPrice(parseFloat(nextEntryPrice.toFixed(4)));

    addLog(`🛒 MARKET BUY Filled: ${tradeSize} ${activePair.symbol} @ $${activePair.price.toLocaleString()}`, "buy");
  };

  const handleMarketSell = () => {
    if (tradeSize <= 0) return;
    
    let nextBalance = balance;
    let nextPosition = position;
    let nextEntryPrice = entryPrice;

    // A Sell executes matching either: closing long, or building a short position
    const isShort = position <= 0;
    if (isShort) {
      const prevSize = Math.abs(position);
      const nextSize = prevSize + tradeSize;
      nextEntryPrice = nextSize > 0 
        ? (prevSize * entryPrice + activePair.price * tradeSize) / nextSize 
        : 0;
      nextPosition = -nextSize;
    } else {
      // slice long position
      const longCovered = Math.min(position, tradeSize);
      const remainingShort = tradeSize - longCovered;

      // Profit/Loss liquidation
      const profit = longCovered * (activePair.price - entryPrice);
      nextBalance += profit; // put long scalp profits inside cash ledger
      nextBalance += longCovered * activePair.price; // credit collateral back

      if (remainingShort > 0) {
        nextPosition = -remainingShort;
        nextEntryPrice = activePair.price;
      } else {
        nextPosition -= longCovered;
        if (nextPosition === 0) nextEntryPrice = 0;
      }
    }

    // Cash adjustments
    setBalance(parseFloat(nextBalance.toFixed(2)));
    setPosition(parseFloat(nextPosition.toFixed(4)));
    setEntryPrice(parseFloat(nextEntryPrice.toFixed(4)));

    addLog(`🛒 MARKET SELL Filled: ${tradeSize} ${activePair.symbol} @ $${activePair.price.toLocaleString()}`, "sell");
  };

  const handlePlaceLimit = (side: "buy" | "sell", customPrice?: number) => {
    const targetPrice = customPrice || limitPrice;
    if (targetPrice <= 0 || tradeSize <= 0) {
      addLog("⚠️ Invalid limit price or size parameter specified", "cancel");
      return;
    }

    const newOrder: LimitOrder = {
      id: Math.random().toString(),
      price: parseFloat(targetPrice.toFixed(4)),
      size: tradeSize,
      side,
      symbol: activePair.symbol
    };

    setLimitOrders(prev => [...prev, newOrder].sort((a, b) => b.price - a.price));
    addLog(`📝 Placed ${side.toUpperCase()} LIMIT Order: ${tradeSize} @ $${targetPrice.toLocaleString()}`, "info");
  };

  const cancelLimitOrder = (id: string) => {
    const found = limitOrders.find(o => o.id === id);
    if (!found) return;
    setLimitOrders(prev => prev.filter(order => order.id !== id));
    addLog(`❌ Cancelled Limit ${found.side.toUpperCase()} @ $${found.price.toLocaleString()}`, "cancel");
  };

  const handleCancelAll = () => {
    if (limitOrders.length === 0) return;
    setLimitOrders([]);
    addLog("🗑️ Cancelled ALL working limit orders", "cancel");
  };

  const handleClosePosition = () => {
    if (position === 0) return;
    
    let nextBalance = balance;
    if (position > 0) {
      // Long liquidation
      const profit = position * (activePair.price - entryPrice);
      nextBalance += profit + position * activePair.price;
      addLog(`🛡️ LIQUIDATED LONG: Scalped position size of ${position} @ $${activePair.price.toLocaleString()}`, "sell");
    } else {
      // Short liquidation
      const shortCovered = Math.abs(position);
      const profit = shortCovered * (entryPrice - activePair.price);
      nextBalance += profit;
      addLog(`🛡️ LIQUIDATED SHORT: Covered position size of ${shortCovered} @ $${activePair.price.toLocaleString()}`, "buy");
    }

    setBalance(parseFloat(nextBalance.toFixed(2)));
    setPosition(0);
    setEntryPrice(0);
  };

  const handleRowPriceClick = (price: number) => {
    setLimitPriceInput(price.toFixed(2));
  };

  // Reverse asks so the highest price is at the top of the vertical ladder!
  // Show 200 levels for deeper scroll and analysis
  const reversedAsks = [...orderBook.asks].slice(0, 200).reverse();
  const slicedBids = [...orderBook.bids].slice(0, 200);

  // Find overall maximum size in the book to properly scale horizontal depth bars
  const maxAmountInBook = Math.max(
    ...orderBook.bids.map(b => b.amount),
    ...orderBook.asks.map(a => a.amount),
    1
  );

  return (
    <div className={`rounded-2xl p-4 flex flex-col h-full shadow-2xl relative backdrop-blur-md overflow-hidden text-xs transition-all duration-300 border ${
      isLight
        ? "bg-white border-slate-200 text-slate-800"
        : "liquid-glass-card bg-slate-950/40 border-white/5 text-slate-100"
    }`}>
      
      {/* CRYPTO FEAR & GREED INDEX WIDGET */}
      <div className={`rounded-xl p-3 mb-3.5 border shadow-inner transition-all duration-300 ${
        isLight ? "bg-slate-50 border-slate-200/80" : "bg-slate-950/60 border-white/5"
      }`}>
        <div className="flex justify-between items-center mb-2 font-sans">
          <span className={`text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            FEAR & GREED INDEX
          </span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
            isLight ? "bg-slate-100 border-slate-250 text-slate-605" : "bg-slate-950/50 border-white/5 text-slate-500"
          }`}>
            SENTIMENT
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          {/* Circular SVG speedo-gauge indicator */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              {/* Outer track background */}
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke={isLight ? "rgba(15, 23, 42, 0.05)" : "rgba(255, 255, 255, 0.04)"}
                strokeWidth="4"
              />
              {/* Value arc segment colored by sentiment */}
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke={getSentimentColor(fearGreedValue)}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - fearGreedValue / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 3px ${getSentimentColor(fearGreedValue)}55)` }}
              />
            </svg>
            <div className="absolute text-center">
              <span className={`text-sm font-black tracking-tighter leading-none select-none block ${
                isLight ? "text-slate-850" : "text-slate-100"
              }`}>
                {Math.round(fearGreedValue)}
              </span>
              <span className={`text-[7.5px] font-mono font-bold select-none block leading-none mt-0.5 ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}>
                MAX 100
              </span>
            </div>
          </div>

          {/* Detailed text sentiment info */}
          <div className="flex-1 min-w-0">
            <div className={`text-[13px] font-black tracking-wide uppercase transition-colors ${getSentimentTextColor(fearGreedValue)}`}>
              {getSentimentLabel(fearGreedValue)}
            </div>
            <p className={`text-[9.5px] leading-snug mt-0.5 font-sans font-medium line-clamp-2 ${
              isLight ? "text-slate-550" : "text-slate-400"
            }`}>
              Driven by cluster buying momentum and orderbook depth imbalances.
            </p>
          </div>
        </div>

        {/* Minimal linear multi-color sentiment range bar showing where we stand */}
        <div className="mt-2.5 relative">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-yellow-500 to-emerald-500 opacity-30 w-full" />
          {/* Sliding glow marker thumb */}
          <div 
            className={`absolute -top-[5px] w-4 h-4 rounded-full border-2 border-white/80 shadow-md transition-all duration-1000 ease-out flex items-center justify-center ${
              isLight ? "bg-[#f8fafc]" : "bg-[#1e293b]"
            }`}
            style={{ 
              left: `${Math.min(95, Math.max(5, fearGreedValue))}%`,
              transform: "translateX(-50%)",
              boxShadow: `0 0 8px 1px ${getSentimentColor(fearGreedValue)}`
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSentimentColor(fearGreedValue) }} />
          </div>
        </div>

        {/* Small comparative records footer */}
        <div className={`grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t text-[9px] font-mono text-center ${
          isLight ? "border-slate-200/60" : "border-white/5"
        }`}>
          <div>
            <span className="text-slate-500 block uppercase text-[7.5px] font-bold">Yesterday</span>
            <span className={`${isLight ? "text-slate-700" : "text-slate-300"} font-bold`}>62 (Greed)</span>
          </div>
          <div className={`border-l border-r ${isLight ? "border-slate-200/60" : "border-white/5"}`}>
            <span className="text-slate-500 block uppercase text-[7.5px] font-bold">Last Week</span>
            <span className={`${isLight ? "text-slate-700" : "text-slate-300"} font-bold`}>59 (Greed)</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase text-[7.5px] font-bold">Last Month</span>
            <span className={`${isLight ? "text-slate-700" : "text-slate-300"} font-bold`}>51 (Neutral)</span>
          </div>
        </div>
      </div>

      {/* 3. DEPTH OF MARKET (DOM) VERTICAL PRICE LADDER */}
      <div className={`flex-1 overflow-hidden flex flex-col rounded-xl border min-h-[140px] transition-all duration-300 ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-[#06080e]/90 border-white/5"
      }`}>
        {/* DOM Table Legend Header */}
        <div className={`grid grid-cols-[1fr_1.2fr] gap-3 border-b py-1.5 text-[8.5px] font-mono font-black uppercase tracking-widest shrink-0 transition-all duration-300 ${
          isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-slate-950 border-white/5 text-slate-500"
        }`}>
          <div className="text-right pr-4">Size</div>
          <div className="text-left pl-3">Price ({activePair.symbol.split("/")[1] || "USDT"})</div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {/* ----- ASKS SIDE (HIGH TO LOW) ----- */}
          {reversedAsks.map((ask) => {
            const hasPendingLimit = limitOrders.filter(o => o.side === "sell" && Math.abs(o.price - ask.price) < 0.001);
            const totalLimitSize = hasPendingLimit.reduce((s, o) => s + o.size, 0);
            const depthPercentage = (ask.amount / maxAmountInBook) * 100;

            return (
              <div 
                key={`dom-ask-${ask.price}`} 
                onClick={() => handleRowPriceClick(ask.price)}
                className={`grid grid-cols-[1fr_1.2fr] gap-3 font-mono font-bold group cursor-pointer border-y border-transparent transition-colors text-[10px] relative h-[18px] items-center ${
                  Math.abs(limitPrice - ask.price) < 0.01 
                    ? (isLight ? "bg-slate-300/40" : "bg-white/[0.04]") 
                    : (isLight ? "hover:bg-slate-200/50" : "hover:bg-white/[0.02]")
                }`}
              >
                {/* Horizontal Depth Volume bar starting from left edge */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-rose-500/[0.12] transition-all duration-300 pointer-events-none"
                  style={{ width: `${Math.min(100, depthPercentage)}%` }}
                />

                {/* Floating pending limit indicators */}
                {totalLimitSize > 0 && (
                  <div className="absolute left-1 z-20 flex items-center">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        hasPendingLimit.forEach(o => cancelLimitOrder(o.id));
                      }}
                      className="bg-rose-500 text-slate-950 font-black text-[7.5px] px-1 py-0.2 rounded tracking-tighter cursor-pointer"
                      title="Click to cancel working orders"
                    >
                      LMT {totalLimitSize.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Size (Ask) Red */}
                <div className="text-right pr-4 z-10 text-rose-500 font-bold tracking-tight">
                  {ask.amount.toFixed(2)}
                </div>

                {/* Price (Ask) standard Gray/White */}
                <div className={`text-left pl-3 z-10 font-bold transition-colors ${
                  isLight ? "text-slate-600 group-hover:text-slate-900" : "text-slate-400 group-hover:text-slate-100"
                }`}>
                  {ask.price.toLocaleString(undefined, { minimumFractionDigits: ask.price < 50 ? 2 : 1 })}
                </div>
              </div>
            );
          })}

          {/* ----- MID TICK / LAST PRICE ROW ----- */}
          <div className={`grid grid-cols-[1fr_1.2fr] gap-3 border-y relative z-20 shrink-0 transition-all duration-300 h-6 items-center ${
            isLight ? "bg-slate-200 border-slate-305" : "bg-[#11141e] border-white/5"
          }`}>
            <div />
            <div className={`text-left pl-3 font-sans font-extrabold text-[12.5px] tracking-wide leading-none ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              {activePair.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* ----- BIDS SIDE (HIGH TO LOW) ----- */}
          {slicedBids.map((bid) => {
            const hasPendingLimit = limitOrders.filter(o => o.side === "buy" && Math.abs(o.price - bid.price) < 0.001);
            const totalLimitSize = hasPendingLimit.reduce((s, o) => s + o.size, 0);
            const depthPercentage = (bid.amount / maxAmountInBook) * 100;

            return (
              <div 
                key={`dom-bid-${bid.price}`} 
                onClick={() => handleRowPriceClick(bid.price)}
                className={`grid grid-cols-[1fr_1.2fr] gap-3 font-mono font-bold group cursor-pointer border-y border-transparent transition-colors text-[10px] relative h-[18px] items-center ${
                  Math.abs(limitPrice - bid.price) < 0.01 
                    ? (isLight ? "bg-slate-300/40" : "bg-white/[0.04]") 
                    : (isLight ? "hover:bg-slate-200/50" : "hover:bg-white/[0.02]")
                }`}
              >
                {/* Horizontal Depth Volume bar starting from left edge */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500/[0.12] transition-all duration-300 pointer-events-none"
                  style={{ width: `${Math.min(100, depthPercentage)}%` }}
                />

                {/* Floating pending limit indicators */}
                {totalLimitSize > 0 && (
                  <div className="absolute left-1 z-20 flex items-center">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        hasPendingLimit.forEach(o => cancelLimitOrder(o.id));
                      }}
                      className="bg-emerald-500 text-slate-950 font-black text-[7.5px] px-1 py-0.2 rounded tracking-tighter cursor-pointer"
                      title="Click to cancel working orders"
                    >
                      LMT {totalLimitSize.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Size (Bid) Green */}
                <div className="text-right pr-4 z-10 text-emerald-500 font-bold tracking-tight">
                  {bid.amount.toFixed(2)}
                </div>

                {/* Price (Bid) standard Gray/White */}
                <div className={`text-left pl-3 z-10 font-bold transition-colors ${
                  isLight ? "text-slate-600 group-hover:text-slate-900" : "text-slate-400 group-hover:text-slate-100"
                }`}>
                  {bid.price.toLocaleString(undefined, { minimumFractionDigits: bid.price < 50 ? 2 : 1 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>


    </div>
  );
}
