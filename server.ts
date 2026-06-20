/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import AdmZip from "adm-zip";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Check if GEMINI_API_KEY is configured
  const apiKey = process.env.GEMINI_API_KEY;

  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log("[PROCLUSTER Server] Gemini API client successfully initialized.");
    } catch (e) {
      console.error("[PROCLUSTER Server] Failed to initialize Gemini API Client:", e);
    }
  } else {
    console.warn("[PROCLUSTER Server] Warning: GEMINI_API_KEY is not defined in the environment. AI analysis will fall back to local rule-based diagnostics.");
  }

  // API Route - Cluster Analysis
  app.post("/api/analyze-cluster", async (req, res) => {
    const { pair, interval, candles, currentPrice, orderBookSummary } = req.body;

    if (!candles || candles.length === 0) {
      return res.status(400).json({ error: "Missing candles data for analysis." });
    }

    // Prepare diagnostic statistics for the prompt
    const recentCandles = candles.slice(-5); // Analyze last 5 candles
    const totalVolume = recentCandles.reduce((acc: number, c: any) => acc + c.volume, 0);
    const netDelta = recentCandles.reduce((acc: number, c: any) => acc + c.delta, 0);
    const priceDirection = recentCandles[recentCandles.length - 1].close >= recentCandles[0].open ? "upward" : "downward";

    const clusterDiagnostics = recentCandles.map((c: any, index: number) => {
      // Find highest volume cell in candle
      const maxVolCell = c.cells.find((cell: any) => cell.isPoc);
      const pocInfo = maxVolCell ? `POC Price: ${maxVolCell.price} (Bid: ${maxVolCell.bid.toFixed(1)}K, Ask: ${maxVolCell.ask.toFixed(1)}K)` : "N/A";
      
      const buyImbalances = c.cells.filter((cell: any) => cell.isBuyImbalance).length;
      const sellImbalances = c.cells.filter((cell: any) => cell.isSellImbalance).length;

      return `Candle ${index + 1} (${new Date(c.timestamp).toLocaleTimeString()}): Open: ${c.open}, Close: ${c.close}, High: ${c.high}, Low: ${c.low}, Volume: ${c.volume.toFixed(1)}K, Delta: ${c.delta.toFixed(1)}K, ${pocInfo}, Imbalances: ${buyImbalances} Buys / ${sellImbalances} Sells`;
    }).join("\n");

    const promptText = `
You are a highly professional Institutional Order Flow and Cluster Chart Analyst for cryptocurrency trading, operating under the brand 'PROCLUSTER'.
Your task is to analyze the following real-time cluster footprint chart data and provide a detailed institutional-grade order flow analysis.

=== MARKET PROFILE PROTOCOL ===
Crypto Asset Pair: ${pair}
Timeframe/Interval: ${interval}
Current Last Price: $${currentPrice}
Order Book Bid/Ask Liquidity Balance: ${orderBookSummary || "Balanced bids & asks"}

=== ZOOMED-IN FOOTPRINT CLUSTERS (Recent 5 Candles in chronological order) ===
${clusterDiagnostics}

=== DIRECTIVES ===
1. Analyze the movement of Point of Control (POC) levels across these 5 candles. Is the POC migrating higher, lower, or flat? Are price actions accepting or rejecting these high-volume nodes?
2. Address the Delta profile. Is there delta divergence? (e.g., price is making higher highs, but cumulative delta is weakening or negative, suggesting absorption and hidden sell limits or exhausted buyers).
3. Evaluate the horizontal Imbalances (buying imbalances where market buyers hit asks aggressively vs selling imbalances).
4. Identify key short-term Support and Resistance levels based strictly on POCs and thick clusters.
5. Provide a clear, actionable prediction (Bullish, Bearish, or Neutral) and a specific tactical trading recommendation (e.g., breakout target, pullback long, absorption shorts).

Return your response as a strict JSON object with this exact structure:
{
  "summary": "Short 1-sentence executive summary of the order flow condition.",
  "sentiment": "bullish" | "bearish" | "neutral",
  "details": "Detailed institutional-grade order-flow narrative (2-3 paragraphs, formatted with clear markdown). Describe POC migrations, buying/selling absorption, imbalance densities, and auction dynamics.",
  "support": number, // exact price value based on data (e.g. key POC holding as support)
  "resistance": number, // exact price value based on data
  "recommendation": "Technical step-by-step trading recommendation (entry zone, invalidation level, trade setups)."
}
`;

    // Fallback Mock analysis in case Gemini API is not working or API Key is missing
    const getFallbackAnalysis = () => {
      const isBullish = netDelta > 0;
      const lastCandle = recentCandles[recentCandles.length - 1];
      const sup = lastCandle.low * 0.995;
      const resVal = lastCandle.high * 1.005;
      
      return {
        summary: `Local Diagnostics: Net Delta is currently ${isBullish ? "positive" : "negative"} (${(netDelta / 1000).toFixed(2)}M) with POC consolidating near $${lastCandle.pocPrice}.`,
        sentiment: isBullish ? "bullish" : "bearish",
        details: `### Order Flow Diagnosis (Local Analytics Mode)
The cluster analysis of **${pair}** is running in deterministic local fallback mode. 

**POC Migration Evaluation**:
We observe the Point of Control situated at **$${lastCandle.pocPrice}**, which serves as the core equilibrium node of the current range. Price is currently fluctuating ${lastCandle.close >= lastCandle.pocPrice ? "above" : "below"} this heavy transaction density level, indicating short-term ${lastCandle.close >= lastCandle.pocPrice ? "buyer acceptance" : "seller acceptance"}.

**Absorption & Imbalances**:
Cumulative volume in the last 5 cycles is **${(totalVolume / 1000).toFixed(2)}M**. There has been an active exchange around key clusters, with total delta sitting at **${(netDelta / 1000).toFixed(2)}M**. Buy/sell imbalances have emerged near the outer wicks, suggesting minor price rejection near support levels.

*(Configure your GEMINI_API_KEY in the Secrets panel in the sidebar to unlock fully-featured, ultra-deep generative AI order flow reasoning.)*`,
        support: Math.round(sup),
        resistance: Math.round(resVal),
        recommendation: `**Tactical Playbook**:
1. **Entry Strategy**: Look for long entries on pullbacks to the support at **$${Math.round(sup)}** if buy imbalances emerge, or short on rejection of resistance at **$${Math.round(resVal)}**.
2. **Stop Placement**: Standard invalidation sits 0.5% below trigger POC cluster.
3. **Targets**: Target the high volume POC nodes at **$${lastCandle.pocPrice}**.`
      };
    };

    if (!ai) {
      // Return fallback response directly if AI is not initialized
      return res.json(getFallbackAnalysis());
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response text from Gemini API.");
      }

      // Try parsing JSON returned from Gemini
      const parsedAnalysis = JSON.parse(responseText.trim());
      res.json(parsedAnalysis);
    } catch (err) {
      console.error("[PROCLUSTER Server] Gemini generation error or JSON parse failure:", err);
      // Fallback in case of call errors or bad format
      res.json(getFallbackAnalysis());
    }
  });

  // --- START INDICATOR PRESETS & SCOPED SEETING PERSISTENCE ENDPOINTS ---
  const PRESETS_FILE = path.join(process.cwd(), "indicator_presets.json");
  const SCOPED_SETTINGS_FILE = path.join(process.cwd(), "indicator_scoped_settings.json");

  function readJsonFile<T>(filePath: string, defaultValue: T): T {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data) as T;
      }
    } catch (err) {
      console.error(`[PROCLUSTER Server] Error reading database file ${filePath}:`, err);
    }
    return defaultValue;
  }

  function writeJsonFile<T>(filePath: string, data: T): boolean {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error(`[PROCLUSTER Server] Error writing database file ${filePath}:`, err);
      return false;
    }
  }

  // Endpoints for indicator presets (now indicator-specific!)
  app.get("/api/indicator/presets", (req, res) => {
    const indicatorId = req.query.indicatorId as string;
    let presets = readJsonFile<any[]>(PRESETS_FILE, []);
    
    if (presets.length === 0) {
      // Seed initial presets for different indicators
      presets = [
        {
          id: "cs_default",
          indicatorId: "clusterSearch",
          name: "Стандартный поиск",
          isDefault: true,
          author: "Система",
          settings: {
            csMedEnabled: true,
            csMedMinVolume: 100,
            csMedMinSize: 8,
            csMedMaxSize: 16,
            csMedLocation: "any",
            csMedShape: "circle",
            csMedColorAsk: "#10b981",
            csMedColorBid: "#ef4444",
            csMedOpacity: 0.7,
            csMedTgAlert: false,
            csLargeEnabled: true,
            csLargeMinVolume: 500,
            csLargeMinSize: 10,
            csLargeMaxSize: 22,
            csLargeLocation: "any",
            csLargeShape: "rhombus",
            csLargeColorAsk: "#34d399",
            csLargeColorBid: "#f43f5e",
            csLargeOpacity: 0.9,
            csLargeTgAlert: false,
            csMedImbalancePercent: 60,
            csLargeImbalancePercent: 60
          }
        },
        {
          id: "cs_whales",
          indicatorId: "clusterSearch",
          name: "Крупные киты (Whales)",
          isDefault: false,
          author: "Система",
          settings: {
            csMedEnabled: false,
            csLargeEnabled: true,
            csLargeMinVolume: 1200,
            csLargeMinSize: 15,
            csLargeMaxSize: 26,
            csLargeLocation: "any",
            csLargeShape: "star",
            csLargeColorAsk: "#3b82f6",
            csLargeColorBid: "#ec4899",
            csLargeOpacity: 1.0,
            csLargeTgAlert: true,
            csLargeImbalancePercent: 75
          }
        },
        {
          id: "delta_candles",
          indicatorId: "delta",
          name: "Свечная дельта",
          isDefault: true,
          author: "Система",
          settings: { sensitivity: 5, showLabels: true, deltaPlotType: "candles" }
        },
        {
          id: "delta_bars",
          indicatorId: "delta",
          name: "Гистограммный вид",
          isDefault: false,
          author: "Система",
          settings: { sensitivity: 5, showLabels: true, deltaPlotType: "bars" }
        },
        {
          id: "cvd_line",
          indicatorId: "cvd",
          name: "Классическая линия",
          isDefault: true,
          author: "Система",
          settings: { smoothing: 10, cvdLineColor: "#a855f7", cvdPeriod: "all", cvdPlotType: "line" }
        },
        {
          id: "cvd_candles",
          indicatorId: "cvd",
          name: "Свечи CVD",
          isDefault: false,
          author: "Система",
          settings: { smoothing: 5, cvdLineColor: "#3b82f6", cvdPeriod: "all", cvdPlotType: "candles" }
        }
      ];
      writeJsonFile(PRESETS_FILE, presets);
    }

    if (indicatorId) {
      const filtered = presets.filter(p => p.indicatorId === indicatorId);
      return res.json({ presets: filtered });
    }

    res.json({ presets });
  });

  app.post("/api/indicator/presets", (req, res) => {
    const { id, indicatorId, name, settings, isDefault, author } = req.body;
    let presets = readJsonFile<any[]>(PRESETS_FILE, []);
    
    if (!name) {
      return res.status(400).json({ error: "Preset name is required" });
    }
    if (!indicatorId) {
      return res.status(400).json({ error: "indicatorId is required" });
    }

    const newPresetId = id || `preset_${Date.now()}`;
    
    // If setting a new preset as default, clear default status only for existing presets of THIS indicatorId
    let updatedPresets = [...presets];
    if (isDefault) {
      updatedPresets = updatedPresets.map(p => 
        p.indicatorId === indicatorId ? { ...p, isDefault: false } : p
      );
    }

    const existingIndex = updatedPresets.findIndex(p => p.id === newPresetId);
    const newPreset = {
      id: newPresetId,
      indicatorId,
      name,
      settings,
      isDefault: !!isDefault,
      author: author || "User"
    };

    if (existingIndex > -1) {
      updatedPresets[existingIndex] = newPreset;
    } else {
      updatedPresets.push(newPreset);
    }

    // Default protection per indicatorId
    const indicatorPresets = updatedPresets.filter(p => p.indicatorId === indicatorId);
    if (indicatorPresets.length > 0 && !indicatorPresets.some(p => p.isDefault)) {
      // Find the first preset for this indicator to make default
      const firstId = indicatorPresets[0].id;
      updatedPresets = updatedPresets.map(p => p.id === firstId ? { ...p, isDefault: true } : p);
    }

    writeJsonFile(PRESETS_FILE, updatedPresets);
    
    const finalFiltered = updatedPresets.filter(p => p.indicatorId === indicatorId);
    res.json({ success: true, preset: newPreset, presets: finalFiltered });
  });

  app.delete("/api/indicator/presets/:id", (req, res) => {
    const { id } = req.params;
    const presets = readJsonFile<any[]>(PRESETS_FILE, []);
    
    const targetPreset = presets.find(p => p.id === id);
    if (!targetPreset) {
      return res.status(404).json({ error: "Preset not found" });
    }

    const indicatorId = targetPreset.indicatorId;
    let updatedPresets = presets.filter(p => p.id !== id);
    
    const indicatorPresets = updatedPresets.filter(p => p.indicatorId === indicatorId);
    if (indicatorPresets.length > 0 && !indicatorPresets.some(p => p.isDefault)) {
      const firstId = indicatorPresets[0].id;
      updatedPresets = updatedPresets.map(p => p.id === firstId ? { ...p, isDefault: true } : p);
    }

    writeJsonFile(PRESETS_FILE, updatedPresets);
    
    const finalFiltered = updatedPresets.filter(p => p.indicatorId === indicatorId);
    res.json({ success: true, presets: finalFiltered });
  });

  // Endpoints for indicator scoped settings
  app.get("/api/indicator/scoped-settings", (req, res) => {
    const scopeKey = req.query.scopeKey as string;
    if (!scopeKey) {
      return res.status(400).json({ error: "scopeKey is required" });
    }

    const scopedSettings = readJsonFile<Record<string, any>>(SCOPED_SETTINGS_FILE, {});
    const data = scopedSettings[scopeKey];
    
    if (data) {
      return res.json({ success: true, indicators: data });
    }
    
    // Look up system 'isDefault' preset if no custom scope set
    const presets = readJsonFile<any[]>(PRESETS_FILE, []);
    const defaultPreset = presets.find(p => p.isDefault);
    if (defaultPreset) {
      return res.json({ success: true, indicators: defaultPreset.indicators, source: "default_preset" });
    }

    res.json({ success: true, indicators: null });
  });

  app.post("/api/indicator/scoped-settings", (req, res) => {
    const { scopeKey, indicators } = req.body;
    if (!scopeKey) {
      return res.status(400).json({ error: "scopeKey is required" });
    }
    if (!indicators || !Array.isArray(indicators)) {
      return res.status(400).json({ error: "indicators array is required" });
    }

    const scopedSettings = readJsonFile<Record<string, any>>(SCOPED_SETTINGS_FILE, {});
    scopedSettings[scopeKey] = indicators;
    
    writeJsonFile(SCOPED_SETTINGS_FILE, scopedSettings);
    res.json({ success: true, scopeKey });
  });
  // --- END INDICATOR PRESETS & SCOPED SEETING PERSISTENCE ENDPOINTS ---

  // --- START MAINTENANCE MODE ENDPOINTS ---
  const MAINTENANCE_FILE = path.join(process.cwd(), "maintenance_config.json");

  app.get("/api/maintenance/status", (req, res) => {
    const config = readJsonFile<{ active: boolean }>(MAINTENANCE_FILE, { active: false });
    res.json(config);
  });

  app.post("/api/maintenance/toggle", (req, res) => {
    const { active } = req.body;
    const config = { active: !!active };
    writeJsonFile(MAINTENANCE_FILE, config);
    res.json({ success: true, active: config.active });
  });
  // --- END MAINTENANCE MODE ENDPOINTS ---

  app.get("/api/binance-klines", async (req, res) => {
    const symbol = (req.query.symbol || "BTCUSDT").toString().toUpperCase().replace("/", "");
    const interval = (req.query.interval || "15m").toString();
    const isFutures = req.query.isFutures === "true";
    let priceStep = parseFloat((req.query.priceStep || "2.5").toString());
    if (isNaN(priceStep) || priceStep <= 0) {
      priceStep = 2.5;
    }

    const cacheKey = `klines_${symbol}_${interval}_${isFutures}_${priceStep}`;
    if (binanceVisionCache.has(cacheKey)) {
      return res.json({ status: "ok", candles: binanceVisionCache.get(cacheKey) });
    }

    const endpoint = isFutures
      ? `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1000`
      : `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`;

    try {
      console.log(`[PROCLUSTER Server] Proxying klines for ${symbol} via endpoint: ${endpoint}`);
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Binance API response status: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid klines format from Binance");
      }

      const candles = data.map((item: any) => {
        const timestamp = Number(item[0]);
        const open = parseFloat(item[1]);
        const high = parseFloat(item[2]);
        const low = parseFloat(item[3]);
        const close = parseFloat(item[4]);
        const volume = parseFloat(item[5]);
        const takerBuyVol = parseFloat(item[9]);

        const cells: any[] = [];
        const startPrice = Math.floor(low / priceStep) * priceStep;
        const endPrice = Math.ceil(high / priceStep) * priceStep;

        const centerPrice = (open + close) / 2;
        const maxPriceDistance = Math.max(endPrice - startPrice, priceStep);

        let activePriceStep = priceStep;
        let rangeUnits = Math.round((endPrice - startPrice) / activePriceStep);
        if (rangeUnits > 250) {
          const scaleFactor = Math.ceil(rangeUnits / 250);
          activePriceStep = priceStep * scaleFactor;
        }

        let cellCount = 0;
        for (let price = startPrice; price <= endPrice; price += activePriceStep) {
          cellCount++;
          if (cellCount > 250) break;
        }

        let currentPriceLevel = startPrice;
        const parsedLevels: number[] = [];
        for (let i = 0; i < cellCount; i++) {
          parsedLevels.push(parseFloat(currentPriceLevel.toFixed(4)));
          currentPriceLevel += activePriceStep;
        }

        const weights = parsedLevels.map(p => {
          const dist = Math.abs(p - centerPrice);
          return Math.max(0.01, Math.exp(-Math.pow(dist / (maxPriceDistance * 0.45), 2)));
        });
        const sumWeights = weights.reduce((s, w) => s + w, 0) || 1;

        const tempCells: any[] = [];
        parsedLevels.forEach((priceLevel, idx) => {
          const weight = weights[idx] / sumWeights;
          const levelVol = volume * weight;
          const takerRatio = volume > 0 ? takerBuyVol / volume : 0.5;
          const ask = levelVol * takerRatio;
          const bid = levelVol * (1 - takerRatio);

          tempCells.push({
            price: priceLevel,
            bid: parseFloat(bid.toFixed(4)),
            ask: parseFloat(ask.toFixed(4)),
            volume: parseFloat(levelVol.toFixed(4)),
            isPoc: false,
            isBuyImbalance: false,
            isSellImbalance: false
          });
        });

        let maxCellVol = 0;
        let pocIndex = -1;
        tempCells.forEach((c, idx) => {
          if (c.volume > maxCellVol) {
            maxCellVol = c.volume;
            pocIndex = idx;
          }
        });

        if (pocIndex !== -1) {
          tempCells[pocIndex].isPoc = true;
        }

        // Calculate delta
        const bidTotal = tempCells.reduce((sum, c) => sum + c.bid, 0);
        const askTotal = tempCells.reduce((sum, c) => sum + c.ask, 0);
        const delta = askTotal - bidTotal;

        // Imbalances & POC lines
        tempCells.forEach(c => {
          c.isBuyImbalance = c.ask > c.bid * 1.8 && c.volume > (volume / tempCells.length) * 0.4;
          c.isSellImbalance = c.bid > c.ask * 1.8 && c.volume > (volume / tempCells.length) * 0.4;
        });

        // Value Area (VAH, VAL) Calculation - approx as top 70% volume surrounding POC
        const sortedByVol = [...tempCells].sort((a, b) => b.volume - a.volume);
        const targetVolume = volume * 0.7;
        let accumulatedVolume = 0;
        const vaCells: number[] = [];

        for (const cell of sortedByVol) {
          accumulatedVolume += cell.volume;
          vaCells.push(cell.price);
          if (accumulatedVolume >= targetVolume) break;
        }

        const val = vaCells.length > 0 ? Math.min(...vaCells) : low;
        const vah = vaCells.length > 0 ? Math.max(...vaCells) : high;

        // Sort descending by price
        tempCells.sort((a, b) => b.price - a.price);

        return {
          timestamp,
          open: parseFloat(open.toFixed(4)),
          high: parseFloat(high.toFixed(4)),
          low: parseFloat(low.toFixed(4)),
          close: parseFloat(close.toFixed(4)),
          volume: parseFloat(volume.toFixed(4)),
          delta: parseFloat(delta.toFixed(4)),
          pocPrice: pocIndex !== -1 ? tempCells.find(x => x.isPoc)?.price || close : close,
          cells: tempCells,
          vah: parseFloat(vah.toFixed(4)),
          val: parseFloat(val.toFixed(4))
        };
      });

      console.log(`[PROCLUSTER Server] Succeeded proxying ${candles.length} klines for ${symbol}`);
      binanceVisionCache.set(cacheKey, candles);
      res.json({ status: "ok", candles });
    } catch (err: any) {
      console.error("[PROCLUSTER Server] Proxy klines error:", err);
      res.status(500).json({ error: "Failed to fetch klines from Binance API.", details: err.message });
    }
  });

  // --- BINANCE VISION TICK DOWNLOADER & AGGREGATOR ---
  interface TradeTick {
    p: number;
    q: number;
    T: number;
    m: boolean;
  }

  const binanceVisionCache = new Map<string, any[]>();

  async function fetchBinanceVisionTrades(symbol: string, isFutures: boolean): Promise<string> {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const curDate = new Date();
      curDate.setUTCDate(curDate.getUTCDate() - attempt);
      
      const yyyy = curDate.getUTCFullYear();
      const mm = String(curDate.getUTCMonth() + 1).padStart(2, '0');
      const dayPad = String(curDate.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dayPad}`;
      
      const folder = isFutures ? 'futures/um/daily/aggTrades' : 'spot/daily/aggTrades';
      const url = `https://data.binance.vision/data/${folder}/${symbol}/${symbol}-aggTrades-${dateStr}.zip`;
      console.log(`[PROCLUSTER Vision] Attempting download: ${url}`);
      
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          const buffer = await response.buffer();
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          for (const entry of zipEntries) {
            if (entry.entryName.endsWith('.csv')) {
              console.log(`[PROCLUSTER Vision] Successfully unzipped CSV: ${entry.entryName}`);
              return entry.getData().toString('utf8');
            }
          }
        } else {
          console.warn(`[PROCLUSTER Vision] Status ${response.status} for URL ${url}`);
        }
      } catch (err) {
        console.error(`[PROCLUSTER Vision] Download error:`, err);
      }
    }
    throw new Error("Could not download daily aggregate trades zip from Binance Vision.");
  }

  function parseVisionCsv(csvString: string, maxRows: number = 300000): TradeTick[] {
    const trades: TradeTick[] = [];
    let idx = 0;
    let lineStart = 0;
    
    while (idx < csvString.length) {
      if (csvString[idx] === '\n' || csvString[idx] === '\r') {
        if (idx > lineStart) {
          const line = csvString.slice(lineStart, idx);
          const parts = line.split(',');
          if (parts.length >= 7) {
            const firstCol = parts[0];
            if (firstCol !== 'agg_trade_id' && firstCol !== 'id' && !firstCol.includes('id')) {
              const price = parseFloat(parts[1]);
              const qty = parseFloat(parts[2]);
              const timestamp = parseInt(parts[5]);
              const mStr = parts[6].trim().toLowerCase();
              const isBuyerMaker = mStr === 'true' || mStr === '1';
              
              if (!isNaN(price) && !isNaN(qty) && !isNaN(timestamp)) {
                trades.push({ p: price, q: qty, T: timestamp, m: isBuyerMaker });
                if (trades.length >= maxRows) {
                  break;
                }
              }
            }
          }
        }
        if (csvString[idx] === '\r' && idx + 1 < csvString.length && csvString[idx + 1] === '\n') {
          idx++;
        }
        lineStart = idx + 1;
      }
      idx++;
    }
    return trades;
  }

  async function fetchBinanceLiveTradesFallback(symbol: string, isFutures: boolean): Promise<TradeTick[]> {
    const binanceSymbol = symbol.toUpperCase().replace("/", "");
    const baseUrl = isFutures ? "https://fapi.binance.com" : "https://api.binance.com";
    const apiPath = isFutures ? "/fapi/v1/aggTrades" : "/api/v3/aggTrades";
    
    const limit = 1000;
    const initialUrl = `${baseUrl}${apiPath}?symbol=${binanceSymbol}&limit=${limit}`;

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

    const pages = 3;
    const fetchPromises: Promise<any[]>[] = [];

    for (let i = 1; i <= pages; i++) {
      const targetFromId = Math.max(1, firstId - i * 1000);
      const pageUrl = `${baseUrl}${apiPath}?symbol=${binanceSymbol}&limit=1000&fromId=${targetFromId}`;

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

    allTrades.sort((a, b) => a.a - b.a);

    return allTrades.map(t => ({
      p: parseFloat(t.p),
      q: parseFloat(t.q),
      T: t.T,
      m: !!t.m
    }));
  }

  function aggregateTicksToClusters(trades: any[], priceStep: number, compressionTicks: number): any[] {
    const candles: any[] = [];
    
    for (let i = 0; i < trades.length; i += compressionTicks) {
      const chunk = trades.slice(i, i + compressionTicks);
      if (chunk.length < 5) continue;
      
      const prices = chunk.map(t => t.p);
      const open = prices[0];
      const close = prices[prices.length - 1];
      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const timestamp = chunk[chunk.length - 1].T;
      const totalVolume = chunk.reduce((sum, t) => sum + t.q, 0);
      
      const cellMap: { [price: number]: { bid: number; ask: number; volume: number } } = {};
      
      chunk.forEach(t => {
        const stepPrice = Math.floor(t.p / priceStep) * priceStep;
        const roundedPrice = parseFloat(stepPrice.toFixed(4));
        
        if (!cellMap[roundedPrice]) {
          cellMap[roundedPrice] = { bid: 0, ask: 0, volume: 0 };
        }
        
        if (t.m) {
          cellMap[roundedPrice].bid += t.q;
        } else {
          cellMap[roundedPrice].ask += t.q;
        }
        cellMap[roundedPrice].volume += t.q;
      });
      
      const cells: any[] = [];
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

  app.get("/api/binance-vision-ticks", async (req, res) => {
    const symbol = (req.query.symbol || "BTCUSDT").toString().toUpperCase().replace("/", "");
    const priceStep = parseFloat((req.query.priceStep || "2.5").toString());
    const compression = parseInt((req.query.compression || "50").toString());
    const isFutures = req.query.isFutures === "true";
    
    const cacheKey = `${symbol}_${priceStep}_${compression}_${isFutures}`;
    if (binanceVisionCache.has(cacheKey)) {
      console.log(`[PROCLUSTER Vision] Serving cached candles for key: ${cacheKey}`);
      return res.json({ status: "ok", candles: binanceVisionCache.get(cacheKey) });
    }
    
    try {
      console.log(`[PROCLUSTER Vision] Attempting download for ${symbol} (isFutures: ${isFutures})...`);
      let trades: TradeTick[] = [];
      try {
        const csvContent = await fetchBinanceVisionTrades(symbol, isFutures);
        trades = parseVisionCsv(csvContent, 300000);
        console.log(`[PROCLUSTER Vision] Parsed ${trades.length} trades from Binance Vision CSV`);
      } catch (visionErr) {
        console.warn("[PROCLUSTER Vision] Binance Vision download failed, falling back to Binance REST live trade series...", visionErr);
        trades = await fetchBinanceLiveTradesFallback(symbol, isFutures);
        console.log(`[PROCLUSTER Vision] Fetched ${trades.length} trades from live REST endpoint`);
      }

      if (trades.length === 0) {
        throw new Error("Zero trades fetched from Binance.");
      }
      
      const candles = aggregateTicksToClusters(trades, priceStep, compression);
      console.log(`[PROCLUSTER Vision] Aggregated into ${candles.length} cluster candles.`);
      
      binanceVisionCache.set(cacheKey, candles);
      res.json({ status: "ok", candles });
    } catch (err: any) {
      console.error("[PROCLUSTER Vision] Handler failed:", err);
      res.status(500).json({ error: "Failed to load Binance ticks.", details: err.message });
    }
  });

  // Setup Vite Dev Server / Prod static asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[PROCLUSTER Server] Vite Mounted in dev middleware mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`[PROCLUSTER Server] Serving static build from ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PROCLUSTER Server] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[PROCLUSTER Server] Startup crashed:", error);
});
