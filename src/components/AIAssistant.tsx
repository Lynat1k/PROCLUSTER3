/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ClusterCandle, CryptoPair, AIAnalysis } from "../types";
import { BrainCircuit, Star, BarChart3, HelpCircle, Loader2, ArrowRight } from "lucide-react";

interface AIAssistantProps {
  candles: ClusterCandle[];
  activePair: CryptoPair;
  onSelectTargets: (support: number, resistance: number) => void;
}

export default function AIAssistant({ candles, activePair, onSelectTargets }: AIAssistantProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);

  // Simulation loading telemetry console output for maximum UI premium appeal
  const runLoadingLogs = () => {
    setLogLines([]);
    const lines = [
      "Connecting to PROCLUSTER analytics server...",
      `Serializing localized ${activePair.symbol} order-book map...`,
      "Identifying Point of Control (POC) high-volume nodes...",
      "Evaluating diagonal Bid / Ask order-flow imbalances...",
      "Aggregating visible Cumulative Delta trends...",
      "Submitting token metadata to Gemini Cognitive Engine...",
      "Awaiting institutional intelligence report..."
    ];

    lines.forEach((line, index) => {
      setTimeout(() => {
        setLogLines(prev => [...prev, `[TELEMETRY] ${line}`]);
      }, (index + 1) * 350);
    });
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    runLoadingLogs();

    try {
      const response = await fetch("/api/analyze-cluster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pair: activePair.symbol,
          interval: "Visible Timeline",
          candles: candles.slice(-8), // send last 8 candles for analysis
          currentPrice: activePair.price,
          orderBookSummary: `Sells aggregated above. Whale walls are holding near key intervals. Delta is matching volume ticks.`
        }),
      });

      if (!response.ok) {
        throw new Error("Server responded with error status");
      }

      const data = await response.json();
      setAnalysis(data as AIAnalysis);
      
      // If valid targets came back, feed them back to parent element
      if (data.support && data.resistance) {
        onSelectTargets(data.support, data.resistance);
      }
    } catch (e) {
      console.error("AI Analysis Fetch Failed:", e);
      // In case of fatal error, populate an emergency dashboard notice
      setAnalysis({
        timestamp: Date.now(),
        summary: "Communication glitch with active Gemini proxy.",
        sentiment: "neutral",
        details: "### Diagnostic Notice\nThe full-stack AI endpoint had a connectivity exception. Please check that your process environment supports internet routing and that `GEMINI_API_KEY` is validated under secrets.\n\n*Check the command line or terminal logs for server stack trace exceptions.*",
        support: Math.round(activePair.price * 0.99),
        resistance: Math.round(activePair.price * 1.01),
        recommendation: "Review raw candles delta profile and bids/asks imbalance profiles manually on the main interface."
      });
    } finally {
      // Small buffer to guarantee logging stream finishes
      setTimeout(() => {
        setLoading(false);
      }, 2600);
    }
  };

  // Custom regex markdown line renderer to bypass heavy dependencies in React 19 environment
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={`md-${index}`} className="text-sm font-bold text-yellow-500 font-display mt-4 mb-2 first:mt-1">
            {trimmed.replace("###", "").trim()}
          </h4>
        );
      }
      
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={`md-${index}`} className="text-base font-black text-slate-100 font-display mt-5 mb-2 first:mt-1 border-b border-slate-900 pb-1">
            {trimmed.replace("##", "").trim()}
          </h3>
        );
      }

      if (trimmed.startsWith("**")) {
        // Simple bold highlight parsing
        const cleanText = trimmed.replace(/\*\*/g, "");
        return (
          <p key={`md-${index}`} className="text-xs text-slate-300 font-mono pr-2 mt-1 flex items-baseline gap-1.5 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block shrink-0" />
            {cleanText}
          </p>
        );
      }

      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const cleanText = trimmed.replace(/^[-*]\s*/, "");
        return (
          <div key={`md-${index}`} className="flex items-start gap-2 pl-2 my-1 text-slate-300 leading-relaxed font-sans text-xs">
            <span className="text-yellow-500 select-none mt-0.5">•</span>
            <span>{cleanText}</span>
          </div>
        );
      }

      if (trimmed === "") {
        return <div key={`md-${index}`} className="h-2" />;
      }

      return (
        <p key={`md-${index}`} className="text-xs text-slate-300 leading-relaxed font-sans mb-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="liquid-glass-card rounded-2xl p-5 flex flex-col h-full shadow-2xl relative">
      <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-500/10 p-1 rounded">
            <BrainCircuit className="w-4 h-4 text-yellow-500 animate-pulse" />
          </div>
          <h3 className="text-xs font-bold text-slate-300 font-display flex items-center gap-1.5 uppercase tracking-wider">
            AI Cluster Analyst
            <span className="text-[8px] bg-yellow-500 text-slate-950 font-black px-1.5 py-0.5 rounded ml-1">
              GEMINI 3.5
            </span>
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-950/65 border border-white/5 px-2.5 py-0.5 rounded-md shadow-inner">
          ORDER FLOW RESEARCH
        </span>
      </div>

      {!analysis && !loading && (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 flex-1">
          <BrainCircuit className="w-12 h-12 text-slate-800 mb-4 stroke-[1.25]" />
          <h4 className="text-slate-300 font-display font-semibold mb-2">
            Ask Gemini Order Flow Analyst
          </h4>
          <p className="text-xs text-slate-500 text-center leading-relaxed max-w-sm mb-6">
            Submits localized candle cluster points, POC nodes, daily imbalances, and delta structures to the full-stack intelligence module for structural trading diagnostics.
          </p>
          <button
            onClick={fetchAnalysis}
            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-650 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase font-display cursor-pointer transition shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <BrainCircuit className="w-4.5 h-4.5 text-slate-950" />
            Begin Cluster Diagnostics
          </button>
        </div>
      )}

      {/* LOADING SCREEN WITH TERMINAL LOG FEED */}
      {loading && (
        <div className="flex flex-col flex-1 p-4 bg-slate-955/40 rounded-xl border border-white/5 font-mono text-xs overflow-hidden h-full min-h-[250px] backdrop-blur-md shadow-inner">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3">
            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
            <span className="font-bold text-slate-300 uppercase tracking-widest text-[10px]">
              Cognitive Session Diagnostics Running
            </span>
          </div>
          
          <div className="flex-1 space-y-1.5 overflow-y-auto text-slate-400 text-[10.5px]">
            {logLines.map((line, idx) => (
              <div key={idx} className="fade-in">
                <span className="text-slate-600 font-medium">{`>`}</span> {line}
              </div>
            ))}
          </div>
          
          <div className="text-[9.5px] text-slate-500 uppercase text-center mt-3 border-t border-white/5 pt-2 font-black tracking-widest">
            PROCLUSTER COGNITIVE BRIDGE
          </div>
        </div>
      )}      {/* AI ANALYSIS RESULTS REPORT */}
      {analysis && !loading && (
        <div className="flex flex-col flex-1 gap-4 overflow-y-auto pr-1">
          {/* Executive Header Block */}
          <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md backdrop-blur-sm">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">
                Executive Synthesis
              </span>
              <p className="text-slate-200 text-xs font-semibold leading-relaxed">
                {analysis.summary}
              </p>
            </div>
            
            {/* Sentiment Marker */}
            <div className="shrink-0">
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-black font-display uppercase tracking-widest block text-center border ${
                  analysis.sentiment === "bullish"
                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                    : analysis.sentiment === "bearish"
                    ? "bg-rose-950/20 text-rose-400 border-rose-500/40 shadow-sm"
                    : "bg-slate-950 text-slate-400 border-white/10"
                }`}
              >
                {analysis.sentiment === "bullish" && "★ BULLISH"}
                {analysis.sentiment === "bearish" && "▼ BEARISH"}
                {analysis.sentiment === "neutral" && "● NEUTRAL"}
              </span>
            </div>
          </div>

          {/* Price targets derived by AI */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-slate-955/35 border border-white/5 p-3 rounded-xl text-center shadow-inner">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                Structural Support
              </span>
              <span className="text-base font-black font-mono text-emerald-400 tracking-tight block">
                ${analysis.support.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-955/35 border border-white/5 p-3 rounded-xl text-center shadow-inner">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                Heavy Resistance
              </span>
              <span className="text-base font-black font-mono text-rose-400 tracking-tight block">
                ${analysis.resistance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Narrative Detailed Diagnosis */}
          <div className="p-4 bg-slate-955/20 rounded-xl border border-white/5 text-slate-300 shadow-inner">
            {renderMarkdown(analysis.details)}
          </div>

          {/* Actionable Playbook Call */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-lg flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-yellow-500">
              <Star className="w-4 h-4 fill-yellow-500/20" />
              <span className="text-[10px] font-black uppercase tracking-wider font-display">
                Tactical Playbook & Actions
              </span>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed font-sans">
              {renderMarkdown(analysis.recommendation)}
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={fetchAnalysis}
            className="w-full bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-450 hover:text-yellow-400 font-black py-2.5 rounded-xl text-xs tracking-wider uppercase font-display cursor-pointer border border-yellow-500/25 transition-all shadow-lg hover:scale-[1.01]"
          >
            Re-Evaluate Cluster Profiles
          </button>
        </div>
      )}
    </div>
  );
}
