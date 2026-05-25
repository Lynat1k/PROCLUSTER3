/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

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
