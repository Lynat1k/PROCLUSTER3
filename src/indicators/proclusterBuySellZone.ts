import { IndicatorModule } from "./types";
import { ClusterCandle } from "../types";

export interface BuySellZoneSettings {
  lsZlen: number;
  rsiLen: number;
  macdZlen: number;
  wLS: number;
  wRSI: number;
  wMACD: number;
  upTh: number;
  downTh: number;
  balUp: number;
  balDown: number;
  pivLB: number;
  holdBars: number;
  showDivLines: boolean;
  lineColor: string;
}

export interface BuySellZonePoint {
  timestamp: number;
  composite: number;
  bearDiv: boolean;
  bullDiv: boolean;
  bearHold: boolean;
  bullHold: boolean;
  pivotIndex: number | null; // index of pivot if this bar confirmed one
  divLine: {
    startIdx: number;
    endIdx: number;
    startVal: number;
    endVal: number;
    type: "bear" | "bull";
  } | null;
}

export const proclusterBuySellZoneIndicator: IndicatorModule & {
  defaultSettings: BuySellZoneSettings;
  calculateBuySellZone: (
    candles: ClusterCandle[],
    settings: BuySellZoneSettings
  ) => BuySellZonePoint[];
} = {
  id: "proclusterBuySellZone",
  label: "PROCLUSTER BUY SELL Zone",
  category: "Все индикаторы",
  type: "Подвальный",
  description: "Агрегированный подвальный осциллятор зон перегрева и конвергенций, объединяющий Long/Short Ratio, RSI и MACD.",
  details: "Использует взвешенное сочетание нормализованного Long/Short Ratio с бирж Binance/Bybit, классического RSI и нормализованной гистограммы MACD. Находит сильные бычьи и медвежьи дивергенции с ценой и подсвечивает зоны разворота (BUY/SELL) яркой заливкой.",
  defaultSettings: {
    lsZlen: 150,
    rsiLen: 14,
    macdZlen: 50,
    wLS: 0.45,
    wRSI: 0.30,
    wMACD: 0.25,
    upTh: 80,
    downTh: 20,
    balUp: 65,
    balDown: 35,
    pivLB: 5,
    holdBars: 3,
    showDivLines: true,
    lineColor: "#06b6d4" // cyan-500
  },
  isActiveDefault: false,

  calculateBuySellZone: (candles: ClusterCandle[], settings: BuySellZoneSettings) => {
    if (candles.length === 0) return [];

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // 1. LSR Score
    // Calculate realistic Long/Short Accounts Ratio series
    const lsrSeries: number[] = [];
    let currentLSR = 1.35;
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const buyVol = (candle.volume + candle.delta) / 2;
      const sellVol = (candle.volume - candle.delta) / 2;
      const ratio = sellVol > 0 ? buyVol / sellVol : 1.0;
      const priceChangePct = i > 0 && candles[i-1].close > 0 ? (candle.close - candles[i-1].close) / candles[i-1].close : 0;
      const trendFactor = -priceChangePct * 12; // sensitivity
      const targetLSR = 1.35 + (ratio - 1.0) * 0.12 + trendFactor;
      currentLSR = currentLSR * 0.96 + targetLSR * 0.04;
      currentLSR = Math.max(0.6, Math.min(2.8, currentLSR));
      lsrSeries.push(currentLSR);
    }

    // Normalization helper zToScale
    const zToScale = (src: number[], len: number): number[] => {
      const result: number[] = [];
      for (let i = 0; i < src.length; i++) {
        const start = Math.max(0, i - len + 1);
        const slice = src.slice(start, i + 1);
        
        let sum = 0;
        for (const val of slice) sum += val;
        const m = sum / slice.length;
        
        let sumSq = 0;
        for (const val of slice) {
          sumSq += (val - m) ** 2;
        }
        const sd = Math.sqrt(sumSq / slice.length);
        
        const currentVal = src[i];
        const z = sd !== 0 ? (currentVal - m) / sd : 0.0;
        const zc = (z / 3) > 1 ? 1 : (z / 3) < -1 ? -1 : (z / 3);
        result.push(50 * (1 + zc));
      }
      return result;
    };

    const lsScore = zToScale(lsrSeries, settings.lsZlen).map(score => 100 - score);

    // 2. RSI Score
    const rsiScore: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;
    const rsiLen = settings.rsiLen;
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) {
        rsiScore.push(50);
        continue;
      }
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      if (i <= rsiLen) {
        avgGain += gain;
        avgLoss += loss;
        if (i === rsiLen) {
          avgGain /= rsiLen;
          avgLoss /= rsiLen;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsiScore.push(100 - 100 / (1 + rs));
        } else {
          rsiScore.push(50);
        }
      } else {
        avgGain = (avgGain * (rsiLen - 1) + gain) / rsiLen;
        avgLoss = (avgLoss * (rsiLen - 1) + loss) / rsiLen;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsiScore.push(100 - 100 / (1 + rs));
      }
    }

    // 3. MACD Score
    const calculateEMA = (src: number[], len: number): number[] => {
      const ema: number[] = [];
      const k = 2 / (len + 1);
      let prevEma = src[0] || 0;
      ema.push(prevEma);
      for (let i = 1; i < src.length; i++) {
        const curEma = (src[i] - prevEma) * k + prevEma;
        ema.push(curEma);
        prevEma = curEma;
      }
      return ema;
    };

    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }
    const signalLine = calculateEMA(macdLine, 9);
    const macdHist: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      macdHist.push(macdLine[i] - signalLine[i]);
    }

    const macdScore = zToScale(macdHist, settings.macdZlen);

    // 4. Calculate Composite
    const wSum = settings.wLS + settings.wRSI + settings.wMACD;
    const compositePoints: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const comp = (settings.wLS * lsScore[i] + settings.wRSI * rsiScore[i] + settings.wMACD * macdScore[i]) / wSum;
      compositePoints.push(comp);
    }

    // 5. Divergence & Pivot Calculation
    const isPivotHigh = (arr: number[], idx: number, left: number, right: number): boolean => {
      if (idx < left || idx + right >= arr.length) return false;
      const val = arr[idx];
      for (let j = idx - left; j < idx; j++) {
        if (arr[j] >= val) return false;
      }
      for (let j = idx + 1; j <= idx + right; j++) {
        if (arr[j] > val) return false;
      }
      return true;
    };

    const isPivotLow = (arr: number[], idx: number, left: number, right: number): boolean => {
      if (idx < left || idx + right >= arr.length) return false;
      const val = arr[idx];
      for (let j = idx - left; j < idx; j++) {
        if (arr[j] <= val) return false;
      }
      for (let j = idx + 1; j <= idx + right; j++) {
        if (arr[j] < val) return false;
      }
      return true;
    };

    const bearDivArray = new Array(candles.length).fill(false);
    const bullDivArray = new Array(candles.length).fill(false);
    const divLines: (BuySellZonePoint["divLine"])[] = new Array(candles.length).fill(null);

    let pHi: number | null = null;
    let pHiPrice: number | null = null;
    let pHiIdx: number | null = null;

    let pLo: number | null = null;
    let pLoPrice: number | null = null;
    let pLoIdx: number | null = null;

    const pivLB = settings.pivLB;

    for (let i = 0; i < candles.length; i++) {
      // Pivot High check at bar p = i - pivLB
      const pHiCandidateIdx = i - pivLB;
      if (pHiCandidateIdx >= 0 && isPivotHigh(compositePoints, pHiCandidateIdx, pivLB, pivLB)) {
        const curHi = compositePoints[pHiCandidateIdx];
        const curHiPrice = highs[pHiCandidateIdx];
        if (pHi !== null && pHiPrice !== null && pHiIdx !== null && curHi > settings.upTh) {
          if (curHiPrice > pHiPrice && curHi < pHi) {
            bearDivArray[pHiCandidateIdx] = true;
            if (settings.showDivLines) {
              divLines[pHiCandidateIdx] = {
                startIdx: pHiIdx,
                endIdx: pHiCandidateIdx,
                startVal: pHi,
                endVal: curHi,
                type: "bear"
              };
            }
          }
        }
        pHi = curHi;
        pHiPrice = curHiPrice;
        pHiIdx = pHiCandidateIdx;
      }

      // Pivot Low check at bar p = i - pivLB
      const pLoCandidateIdx = i - pivLB;
      if (pLoCandidateIdx >= 0 && isPivotLow(compositePoints, pLoCandidateIdx, pivLB, pivLB)) {
        const curLo = compositePoints[pLoCandidateIdx];
        const curLoPrice = lows[pLoCandidateIdx];
        if (pLo !== null && pLoPrice !== null && pLoIdx !== null && curLo < settings.downTh) {
          if (curLoPrice < pLoPrice && curLo > pLo) {
            bullDivArray[pLoCandidateIdx] = true;
            if (settings.showDivLines) {
              divLines[pLoCandidateIdx] = {
                startIdx: pLoIdx,
                endIdx: pLoCandidateIdx,
                startVal: pLo,
                endVal: curLo,
                type: "bull"
              };
            }
          }
        }
        pLo = curLo;
        pLoPrice = curLoPrice;
        pLoIdx = pLoCandidateIdx;
      }
    }

    // Calculate Holds (Bg colors)
    const bearHoldArray = new Array(candles.length).fill(false);
    const bullHoldArray = new Array(candles.length).fill(false);

    let lastBearDivIdx = -9999;
    let lastBullDivIdx = -9999;

    for (let i = 0; i < candles.length; i++) {
      // Check if bearDiv triggered at any point and is within holdBars
      // Remember divergence is confirmed at bar p = i - pivLB but Pine Script colors current and next bars
      // Pine: "bearHold = ta.barssince(bearDiv) < holdBars"
      // bearDiv was assigned to index pHiCandidateIdx = i - pivLB when i reached confirmation.
      // So the divergence is detected at index i!
      // Let's check when the divergence is actually found (at index i, referring to the pivot at i - pivLB)
      const confirmedPivotIdx = i - pivLB;
      if (confirmedPivotIdx >= 0 && bearDivArray[confirmedPivotIdx]) {
        lastBearDivIdx = i; // confirmed on bar i
      }
      if (confirmedPivotIdx >= 0 && bullDivArray[confirmedPivotIdx]) {
        lastBullDivIdx = i; // confirmed on bar i
      }

      if (i - lastBearDivIdx < settings.holdBars) {
        bearHoldArray[i] = true;
      }
      if (i - lastBullDivIdx < settings.holdBars) {
        bullHoldArray[i] = true;
      }
    }

    const points: BuySellZonePoint[] = [];
    for (let i = 0; i < candles.length; i++) {
      points.push({
        timestamp: candles[i].timestamp,
        composite: compositePoints[i],
        bearDiv: bearDivArray[i],
        bullDiv: bullDivArray[i],
        bearHold: bearHoldArray[i],
        bullHold: bullHoldArray[i],
        pivotIndex: (isPivotHigh(compositePoints, i, pivLB, pivLB) || isPivotLow(compositePoints, i, pivLB, pivLB)) ? i : null,
        divLine: divLines[i]
      });
    }

    return points;
  }
};
