/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ClusterCandle, ClusterCell, CryptoPair, IndicatorSettings } from "../types";
import { ZoomIn, ZoomOut, Maximize2, Compass, Move, Layers, Activity } from "lucide-react";

interface ClusterChartProps {
  candles: ClusterCandle[];
  activePair: CryptoPair;
  activeIndicators?: Record<string, boolean>;
  indicatorSettings?: Record<string, any>;
  marketType?: "SPOT" | "FUTURES";
  onToggleMarketType?: () => void;
  theme?: "dark" | "light";
  candleType?: "auto" | "japanese" | "footprint" | "clusters";
  candleDataType?: "bid_ask" | "delta" | "volume";
}

export default function ClusterChart({
  candles,
  activePair,
  activeIndicators = {
    clusterSearch: true,
    delta: true,
    volume: true,
    cvd: true,
    stackedImbalance: false
  },
  indicatorSettings,
  marketType = "SPOT",
  onToggleMarketType,
  theme = "dark",
  candleType = "auto",
  candleDataType = "bid_ask"
}: ClusterChartProps) {
  
  const isLight = theme === "light";
  // Zoom state: width of each candlestick in pixels
  const [candleWidth, setCandleWidth] = useState<number>(145);
  const candleSpacing = 12;
  const margin = { top: 30, right: 90, bottom: 40, left: 60 };

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(550);
  const [verticalScale, setVerticalScale] = useState<number>(1.0);

  // Height configurations dynamic calculations
  const deltaHeight = activeIndicators.delta ? 70 : 0;
  const spacing = activeIndicators.delta ? 20 : 0;

  // Calculate base chart height to fill container exactly, ensuring Delta/CVD are always pinned at the bottom
  const chartHeight = Math.max(150, containerHeight - margin.top - margin.bottom - spacing - deltaHeight);
  const totalSvgHeight = margin.top + chartHeight + spacing + deltaHeight + margin.bottom;

  const [hoveredCell, setHoveredCell] = useState<{ candleIndex: number; cell: ClusterCell } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number } | null>(null);

  // Drag-to-scroll panning variables supporting full vertical + horizontal scrolling
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [priceCenterOffset, setPriceCenterOffset] = useState<number>(0);
  const [startPriceOffset, setStartPriceOffset] = useState<number>(0);

  // Dynamically measure container dimensions with ResizeObserver so CVD/delta are pinned perfectly to the bottom
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = containerRef.current?.clientHeight || entry.contentRect.height;
        if (height && height > 100) {
          setContainerHeight(height);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    const initialHeight = containerRef.current.clientHeight;
    if (initialHeight && initialHeight > 100) {
      setContainerHeight(initialHeight);
    }

    return () => resizeObserver.disconnect();
  }, [candles.length]);

  // Standard trading wheel zoom engine (Wheel / Shift + Wheel on main area/timeline = Horizontal scale; Wheel on price scale = Vertical scale)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Scroll on main area or timeline (with or without Shift) -> Stretch / compress horizontally
      setCandleWidth(prev => {
        const delta = e.deltaY;
        const direction = Math.sign(delta);
        if (direction === 0) return prev;
        // Scroll down (positive deltaY) -> zoom out / compress horizontally (decrease candleWidth)
        // Scroll up (negative deltaY) -> zoom in / stretch horizontally (increase candleWidth)
        const next = prev - direction * 8;
        return Math.min(240, Math.max(30, next));
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [candles.length, candleWidth, candleSpacing]);

  // Auto-scroll to the very end (most recent candles) on mount or symbol change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [activePair.symbol]);

  // Reset vertical panning offset only when pair changes
  useEffect(() => {
    setPriceCenterOffset(0);
  }, [activePair.symbol]);

  // Adjust canvas zoom
  const handleZoom = (factor: number) => {
    setCandleWidth(prev => {
      const next = prev + factor;
      return Math.min(240, Math.max(30, next));
    });
  };

  const handleVerticalZoom = (factor: number) => {
    setVerticalScale(prev => {
      const next = prev + factor;
      return Math.min(3.0, Math.max(0.3, next));
    });
  };

  const handleResetZoom = () => {
    setCandleWidth(130);
    setVerticalScale(1.0);
    setPriceCenterOffset(0);
  };

  // Find min/max price boundaries for mapping coordinates
  const prices = candles.length > 0 ? candles.flatMap(c => [c.high, c.low]) : [];
  const maxPriceRaw = prices.length > 0 ? Math.max(...prices) : 100;
  const minPriceRaw = prices.length > 0 ? Math.min(...prices) : 0;
  // Add 10% padding to price bounds so candles don't touch top/bottom wicks
  const priceRange = maxPriceRaw - minPriceRaw || 1;
  
  // We apply the vertical scale to the price range projection to stretch/compress candles visually!
  // verticalScale > 1.0 means we stretch vertically (narrower visible price range = taller candles)
  // verticalScale < 1.0 means we compress vertically (wider visible price range = flatter candles)
  const zoomedPriceRange = priceRange / Math.max(0.1, verticalScale);
  const basePriceCenter = (maxPriceRaw + minPriceRaw) / 2;
  const priceCenter = basePriceCenter + priceCenterOffset;
  const maxPrice = priceCenter + zoomedPriceRange * 0.58;
  const minPrice = Math.max(0, priceCenter - zoomedPriceRange * 0.58);

  const priceToY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return margin.top + chartHeight * (1 - (price - minPrice) / range);
  };

  const yToPrice = (y: number) => {
    const range = maxPrice - minPrice || 1;
    const rawPrice = minPrice + (1 - (y - margin.top) / Math.max(1, chartHeight)) * range;
    return Math.max(0, rawPrice);
  };

  // Compute scrollable content width
  const scrollWidth = candles.length * (candleWidth + candleSpacing) + margin.left + margin.right;

  // Zoom threshold: Detailed cluster footprint mode vs default Candlestick view
  const isDetailedModeCalculated = candleWidth >= 85;
  const isDetailedMode = candleType === "japanese"
    ? false
    : (candleType === "footprint" || candleType === "clusters"
        ? true
        : isDetailedModeCalculated);

  // Panning drag-to-scroll handlers (supports 2D movement)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select")) return; // skip for controls
    
    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setStartY(e.pageY - (containerRef.current?.offsetTop || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
    setStartPriceOffset(priceCenterOffset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    
    const x = e.pageX - containerRef.current.offsetLeft;
    const walkX = (x - startX) * 1.5; // multiplier for panning speed
    containerRef.current.scrollLeft = scrollLeft - walkX;

    const y = e.pageY - containerRef.current.offsetTop;
    const deltaY = y - startY;
    // Scale deltaY to actual financial price change.
    // Since page Y coordinate is 0 at top and increases downwards, dragging down (positive deltaY) should
    // make candles move down (representing higher prices). Therefore, dragging down should increase the priceCenterOffset.
    const priceChange = (deltaY / Math.max(100, chartHeight)) * zoomedPriceRange;
    setPriceCenterOffset(startPriceOffset + priceChange);
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Mouse crosshair update builder
  const handleSvgMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (y >= margin.top && y <= totalSvgHeight - margin.bottom && x >= margin.left && x <= scrollWidth) {
      const clampedYForPrice = Math.min(margin.top + chartHeight, Math.max(margin.top, y));
      const price = yToPrice(clampedYForPrice);
      setCrosshair({ x, y, price });

      // Identify hovered cell mathematically
      const colIdx = Math.floor((x - margin.left) / (candleWidth + candleSpacing));
      if (colIdx >= 0 && colIdx < candles.length) {
        const candle = candles[colIdx];
        const candleX = margin.left + colIdx * (candleWidth + candleSpacing);
        
        if (x >= candleX && x <= candleX + candleWidth) {
          const step = activePair.priceStep;
          const cell = candle.cells.find(cl => Math.abs(cl.price - price) <= step / 2);
          if (cell) {
            setHoveredCell({ candleIndex: colIdx, cell });
          } else {
            setHoveredCell(null);
          }
        } else {
          setHoveredCell(null);
        }
      } else {
        setHoveredCell(null);
      }
    } else {
      setCrosshair(null);
      setHoveredCell(null);
    }
  };

  const handleSvgMouseLeave = () => {
    setCrosshair(null);
    setHoveredCell(null);
  };

  // Profile aggregates: Horizontal Session Profile drawn on the vertical scale.
  // Slices price ranges and sums volumes from visible candles
  const generateSessionProfile = () => {
    const profileRange = maxPrice - minPrice;
    const bucketCount = 20;
    const bucketSize = (profileRange / bucketCount) || 1;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      price: minPrice + i * bucketSize + bucketSize / 2,
      volume: 0,
    }));

    if (candles.length > 0) {
      candles.forEach(candle => {
        candle.cells.forEach(cell => {
          const bucketIdx = Math.floor((cell.price - minPrice) / bucketSize);
          if (bucketIdx >= 0 && bucketIdx < bucketCount) {
            buckets[bucketIdx].volume += cell.volume;
          }
        });
      });
    }

    const maxProfileVol = Math.max(...buckets.map(b => b.volume), 1);
    return { buckets, maxProfileVol, bucketSize };
  };

  const { buckets: profileBuckets, maxProfileVol, bucketSize: profileBucketSize } = generateSessionProfile();

  // Find overall maximum cell volume to properly scale cell footprint horizontal bars
  const maxCellVolume = candles.length > 0 ? Math.max(...candles.flatMap(c => c.cells.map(cell => cell.volume)), 1) : 1;

  // Compute high delta for standard delta chart scaling
  const maxCandleDelta = candles.length > 0 ? Math.max(...candles.map(c => Math.abs(c.delta)), 1) : 1;

  // Generate Cumulative Delta Line Coordinates
  let runningDelta = 0;
  const cumulativeDeltaPoints = candles.map((c, i) => {
    runningDelta += c.delta;
    const cx = margin.left + i * (candleWidth + candleSpacing) + candleWidth / 2;
    return { cx, value: runningDelta };
  });

  const maxCumDelta = cumulativeDeltaPoints.length > 0 ? Math.max(...cumulativeDeltaPoints.map(p => Math.abs(p.value)), 1) : 1;
  const deltaToY = (val: number) => {
    const rootY = margin.top + chartHeight + spacing + deltaHeight / 2;
    return rootY - (val / maxCumDelta) * (deltaHeight / 2.5);
  };

  useEffect(() => {
    if (candles.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale canvas for ultra-crisp Retina/High-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = scrollWidth * dpr;
    canvas.height = totalSvgHeight * dpr;
    canvas.style.width = `${scrollWidth}px`;
    canvas.style.height = `${totalSvgHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.textBaseline = "middle";

    // Clear and draw background
    ctx.fillStyle = isLight ? "#f8fafc" : "#06080f";
    ctx.fillRect(0, 0, scrollWidth, totalSvgHeight);

    // 1. Horizontal Grid Lines
    Array.from({ length: 6 }).forEach((_, i) => {
      const ratio = i / 5;
      const price = minPrice + ratio * (maxPrice - minPrice);
      const gridY = priceToY(price);
      
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.12)" : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(margin.left, gridY);
      ctx.lineTo(scrollWidth, gridY);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 2. Real-time active price tracker tag on chart grid
    const activePriceY = priceToY(activePair.price);
    if (activePriceY >= margin.top && activePriceY <= margin.top + chartHeight) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(margin.left, activePriceY);
      ctx.lineTo(scrollWidth, activePriceY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Aggregated Session Profile on the left side of the chart
    if (activeIndicators.volume) {
      profileBuckets.forEach((bucket) => {
        const bWidth = (bucket.volume / maxProfileVol) * 65;
        const bY = priceToY(bucket.price) - (profileBucketSize / (maxPrice - minPrice)) * chartHeight / 2;
        const bHeight = Math.max(2, (profileBucketSize / (maxPrice - minPrice)) * chartHeight - 1.5);
        
        ctx.fillStyle = isLight ? "rgba(71, 85, 105, 0.1)" : "rgba(148, 163, 184, 0.08)";
        ctx.fillRect(margin.left, bY, bWidth, bHeight);

        ctx.strokeStyle = isLight ? "rgba(71, 85, 105, 0.2)" : "rgba(148, 163, 184, 0.18)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(margin.left, bY, bWidth, bHeight);
      });
    }

    // 3.8 Draw solid footer strip for secondary timeline panel decoration
    ctx.save();
    ctx.fillStyle = isLight ? "#f1f5f9" : "#090b12";
    ctx.fillRect(0, totalSvgHeight - margin.bottom, scrollWidth, margin.bottom);
    ctx.beginPath();
    ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.moveTo(0, totalSvgHeight - margin.bottom);
    ctx.lineTo(scrollWidth, totalSvgHeight - margin.bottom);
    ctx.stroke();
    ctx.restore();

    // 4. Draw each candlestick
    candles.forEach((candle, cIdx) => {
      const x = margin.left + cIdx * (candleWidth + candleSpacing);
      const bodyY1 = priceToY(Math.max(candle.open, candle.close));
      const bodyY2 = priceToY(Math.min(candle.open, candle.close));
      const isGreen = candle.close >= candle.open;

      const hoveredCandleIdx = crosshair
        ? Math.floor((crosshair.x - margin.left) / (candleWidth + candleSpacing))
        : -1;
      const isHoveredCol = crosshair && cIdx === hoveredCandleIdx;

      // Draw vertical alignment gridline behind column
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.03)" : "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.moveTo(x + candleWidth / 2, margin.top);
      ctx.lineTo(x + candleWidth / 2, margin.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw vertical wick lines
      ctx.beginPath();
      ctx.strokeStyle = isGreen ? "#10b981" : "#f43f5e";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = isDetailedMode ? 0.45 : 0.85;
      ctx.moveTo(x + candleWidth / 2, priceToY(candle.high));
      ctx.lineTo(x + candleWidth / 2, priceToY(candle.low));
      ctx.stroke();
      ctx.globalAlpha = 1.0; // Reset

      // A. Zoomed out simple candlestick
      if (!isDetailedMode) {
        ctx.fillStyle = isGreen ? (isLight ? "#10b8812a" : "#064e3b") : (isLight ? "#f43f5e2a" : "#4c0519");
        ctx.strokeStyle = isGreen ? "#10b981" : "#f43f5e";
        ctx.lineWidth = 1.5;
        
        const rectY = Math.min(bodyY1, bodyY2);
        const rectH = Math.max(3, Math.abs(bodyY1 - bodyY2));
        
        ctx.fillRect(x, rectY, candleWidth, rectH);
        ctx.strokeRect(x, rectY, candleWidth, rectH);

        // Tick for POC
        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.moveTo(x, priceToY(candle.pocPrice));
        ctx.lineTo(x + candleWidth, priceToY(candle.pocPrice));
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      // B. Zoomed in Footprint detailed view
      if (isDetailedMode) {
        // Draw premium glassy candle body frame container
        ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.06)" : "rgba(244, 63, 94, 0.06)";
        ctx.strokeStyle = isGreen ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)";
        ctx.lineWidth = 1;
        const rectY = Math.min(bodyY1, bodyY2);
        const rectH = Math.max(4, Math.abs(bodyY1 - bodyY2));
        ctx.fillRect(x, rectY, candleWidth, rectH);
        ctx.strokeRect(x, rectY, candleWidth, rectH);

        // Sliced Price Cells
        const candleMaxVol = Math.max(...candle.cells.map(c => Math.max(c.bid, c.ask, 1)), 1);
        const candleMaxTotalVol = Math.max(...candle.cells.map(c => Math.max(c.volume, 1)), 1);
        const isClustersMode = candleType === "clusters";

        candle.cells.forEach((cell) => {
          const yTop = priceToY(cell.price + activePair.priceStep / 2);
          const yBottom = priceToY(cell.price - activePair.priceStep / 2);
          const cellHeight = Math.max(1.5, yBottom - yTop);
          const cellY = yTop;
          const drawHeight = Math.max(1, cellHeight - 0.8);

          const midX = x + candleWidth / 2;
          const halfWidth = candleWidth / 2 - 4;

          const bidBarWidth = cell.bid > 0 ? Math.max(2, (cell.bid / candleMaxVol) * halfWidth) : 0;
          const askBarWidth = cell.ask > 0 ? Math.max(2, (cell.ask / candleMaxVol) * halfWidth) : 0;
          const clusterBarWidth = cell.volume > 0 ? Math.max(4, (cell.volume / candleMaxTotalVol) * (candleWidth - 8)) : 0;

          // Double check Cluster Search parameters
          const csSettings = indicatorSettings?.clusterSearch || {
            mode: "Volume",
            direction: "Both",
            location: "Any",
            sensitivity: 4,
            useMinMax: false
          };
          const csSensitivity = typeof csSettings.sensitivity === "number" ? csSettings.sensitivity : 4;
          const sensFactor = 1 - csSensitivity * 0.06;
          const baseVolumeThreshold = maxCellVolume * sensFactor;

          let matchesClusterSearch = false;
          if (activeIndicators.clusterSearch) {
            let isTargetMode = false;
            if (csSettings.mode === "Delta") {
              const cellDelta = Math.abs(cell.ask - cell.bid);
              const maxCellDelta = Math.max(...candles.flatMap(c => c.cells.map(cl => Math.abs(cl.ask - cl.bid))), 1);
              isTargetMode = cellDelta >= maxCellDelta * sensFactor;
            } else {
              isTargetMode = cell.volume >= baseVolumeThreshold;
            }

            let isTargetDirection = true;
            if (csSettings.direction === "Buy") {
              isTargetDirection = cell.ask > cell.bid;
            } else if (csSettings.direction === "Sell") {
              isTargetDirection = cell.bid > cell.ask;
            }

            let isTargetLocation = true;
            if (csSettings.location === "Body") {
              const isGreenBody = candle.close >= candle.open;
              const highBody = isGreenBody ? candle.close : candle.open;
              const lowBody = isGreenBody ? candle.open : candle.close;
              isTargetLocation = cell.price <= highBody && cell.price >= lowBody;
            } else if (csSettings.location === "Wick") {
              const isGreenBody = candle.close >= candle.open;
              const highBody = isGreenBody ? candle.close : candle.open;
              const lowBody = isGreenBody ? candle.open : candle.close;
              isTargetLocation = cell.price > highBody || cell.price < lowBody;
            }
            matchesClusterSearch = isTargetMode && isTargetDirection && isTargetLocation;
          }

          if (!isClustersMode) {
            // Draw left side (Bid) block
            ctx.fillStyle = !activeIndicators.volume ? "rgba(255,255,255,0.01)" : cell.isSellImbalance ? "rgba(239, 68, 68, 0.48)" : "rgba(239, 68, 68, 0.18)";
            ctx.strokeStyle = "rgba(244, 63, 94, 0.06)";
            ctx.lineWidth = 0.5;
            ctx.fillRect(midX - bidBarWidth, cellY + 0.5, bidBarWidth, drawHeight);
            ctx.strokeRect(midX - bidBarWidth, cellY + 0.5, bidBarWidth, drawHeight);

            // Draw right side (Ask) block
            ctx.fillStyle = !activeIndicators.volume ? "rgba(255,255,255,0.01)" : cell.isBuyImbalance ? "rgba(16, 185, 129, 0.48)" : "rgba(16, 185, 129, 0.18)";
            ctx.strokeStyle = "rgba(16, 185, 129, 0.06)";
            ctx.fillRect(midX, cellY + 0.5, askBarWidth, drawHeight);
            ctx.strokeRect(midX, cellY + 0.5, askBarWidth, drawHeight);

            // Draw central separating line
            ctx.beginPath();
            ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 0.8;
            ctx.moveTo(midX, cellY);
            ctx.lineTo(midX, cellY + cellHeight);
            ctx.stroke();
          } else {
            // Clusters Mode unified block
            ctx.fillStyle = !activeIndicators.volume
              ? "rgba(255,255,255,0.01)"
              : cell.isPoc
                ? "rgba(245, 158, 11, 0.35)"
                : cell.ask > cell.bid
                  ? cell.isBuyImbalance
                    ? "rgba(16, 185, 129, 0.45)"
                    : "rgba(16, 185, 129, 0.18)"
                  : cell.isSellImbalance
                    ? "rgba(239, 68, 68, 0.45)"
                    : "rgba(239, 68, 68, 0.18)";
            ctx.strokeStyle = cell.isPoc
              ? "rgba(245, 158, 11, 0.6)"
              : cell.ask > cell.bid
                ? "rgba(16, 185, 129, 0.15)"
                : "rgba(244, 63, 94, 0.15)";
            ctx.lineWidth = 0.5;
            ctx.fillRect(midX - clusterBarWidth / 2, cellY + 0.5, clusterBarWidth, drawHeight);
            ctx.strokeRect(midX - clusterBarWidth / 2, cellY + 0.5, clusterBarWidth, drawHeight);
          }

          // Cluster Search glow
          if (matchesClusterSearch) {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2.2;
            ctx.setLineDash([3, 2]);
            const strokeX = isClustersMode ? midX - clusterBarWidth / 2 : midX - bidBarWidth;
            const strokeW = isClustersMode ? clusterBarWidth : Math.max(6, bidBarWidth + askBarWidth);
            ctx.strokeRect(strokeX, cellY + 0.5, strokeW, drawHeight);
            ctx.setLineDash([]);
          }

          // Stacked Imbalance highlights
          if (activeIndicators.stackedImbalance && (cell.isBuyImbalance || cell.isSellImbalance)) {
            ctx.strokeStyle = cell.isBuyImbalance ? "#05f38c" : "#ff3355";
            ctx.lineWidth = 2;
            const strokeX = isClustersMode ? midX - clusterBarWidth / 2 : midX - (cell.isSellImbalance ? bidBarWidth : 0);
            const strokeW = isClustersMode ? clusterBarWidth : (cell.isSellImbalance ? bidBarWidth : askBarWidth);
            ctx.strokeRect(strokeX, cellY + 0.5, strokeW, drawHeight);
          }

          // POC outline highlight
          if (cell.isPoc && activeIndicators.volume) {
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.2;
            const strokeX = isClustersMode ? midX - clusterBarWidth / 2 : midX - bidBarWidth;
            const strokeW = isClustersMode ? Math.max(6, clusterBarWidth) : Math.max(6, bidBarWidth + askBarWidth);
            ctx.strokeRect(strokeX, cellY + 0.5, strokeW, drawHeight);
          }

          // Text metrics & Drawing
          if (activeIndicators.volume && cellHeight > 10) {
            ctx.save();
            ctx.shadowColor = isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.95)";
            ctx.shadowBlur = 1.5;
            ctx.shadowOffsetX = 0.5;
            ctx.shadowOffsetY = 0.5;

            const bidValStr = cell.bid >= 10 ? cell.bid.toFixed(0) : cell.bid.toFixed(1);
            const askValStr = cell.ask >= 10 ? cell.ask.toFixed(0) : cell.ask.toFixed(1);
            const cellDeltaVal = cell.ask - cell.bid;
            const deltaDisplayStr = (cellDeltaVal > 0 ? "+" : "") + (Math.abs(cellDeltaVal) >= 10 ? cellDeltaVal.toFixed(0) : cellDeltaVal.toFixed(1));
            const volStr = cell.volume >= 10 ? cell.volume.toFixed(0) : cell.volume.toFixed(1);

            const fontSize = candleWidth >= 135 ? "9px" : "7.5px";
            ctx.font = `600 ${fontSize} Fira Code, monospace`;

            if (!isClustersMode) {
              if (candleDataType === "bid_ask" && candleWidth >= 95) {
                // Bid Left
                ctx.fillStyle = isLight
                  ? (cell.isSellImbalance ? "#b91c1c" : "#1e293b")
                  : (cell.isSellImbalance ? "#f87171" : "#cbd5e1");
                ctx.textAlign = "right";
                ctx.fillText(bidValStr, midX - 4, cellY + cellHeight / 2);

                // Ask Right
                ctx.fillStyle = isLight
                  ? (cell.isBuyImbalance ? "#15803d" : "#1e293b")
                  : (cell.isBuyImbalance ? "#4ade80" : "#cbd5e1");
                ctx.textAlign = "left";
                ctx.fillText(askValStr, midX + 4, cellY + cellHeight / 2);
              } else if (candleDataType === "delta" && candleWidth >= 55) {
                ctx.fillStyle = isLight
                  ? (cellDeltaVal > 0 ? "#047857" : cellDeltaVal < 0 ? "#b91c1c" : "#475569")
                  : (cellDeltaVal > 0 ? "#10b981" : cellDeltaVal < 0 ? "#ef4444" : "#94a3b8");
                ctx.textAlign = "center";
                ctx.font = `bold ${candleWidth >= 110 ? "9px" : candleWidth >= 80 ? "8px" : "7.2px"} Fira Code, monospace`;
                ctx.fillText(deltaDisplayStr, midX, cellY + cellHeight / 2);
              } else if (candleDataType === "volume" && candleWidth >= 55) {
                ctx.fillStyle = isLight
                  ? (cell.isPoc ? "#b45309" : "#1e293b")
                  : (cell.isPoc ? "#f59e0b" : "#cbd5e1");
                ctx.textAlign = "center";
                ctx.font = `bold ${candleWidth >= 110 ? "9px" : candleWidth >= 80 ? "8px" : "7.2px"} Fira Code, monospace`;
                ctx.fillText(volStr, midX, cellY + cellHeight / 2);
              }
            } else {
              // Clusters Mode Text Rendering
              if (candleDataType === "delta" && candleWidth >= 55) {
                ctx.fillStyle = isLight
                  ? (cellDeltaVal > 0 ? "#047857" : cellDeltaVal < 0 ? "#b91c1c" : "#475569")
                  : (cellDeltaVal > 0 ? "#10b981" : cellDeltaVal < 0 ? "#ef4444" : "#94a3b8");
                ctx.textAlign = "center";
                ctx.font = `bold ${candleWidth >= 110 ? "9px" : candleWidth >= 80 ? "8px" : "7.2px"} Fira Code, monospace`;
                ctx.fillText(deltaDisplayStr, midX, cellY + cellHeight / 2);
              } else if (candleDataType === "volume" && candleWidth >= 55) {
                ctx.fillStyle = isLight
                  ? (cell.isPoc ? "#b45309" : "#1e293b")
                  : (cell.isPoc ? "#f59e0b" : "#cbd5e1");
                ctx.textAlign = "center";
                ctx.font = `bold ${candleWidth >= 110 ? "9px" : candleWidth >= 80 ? "8px" : "7.2px"} Fira Code, monospace`;
                ctx.fillText(volStr, midX, cellY + cellHeight / 2);
              }
            }
            ctx.restore();
          }
        });

        // Value Area Bracket (VAH to VAL) on Left side of candle body path
        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        const vahY = priceToY(candle.vah);
        const valY = priceToY(candle.val);
        ctx.moveTo(x - 2, vahY);
        ctx.lineTo(x - 2, valY);
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(x - 5, vahY);
        ctx.lineTo(x - 1, vahY);
        ctx.moveTo(x - 5, valY);
        ctx.lineTo(x - 1, valY);
        ctx.stroke();
      }

      // C. Bottom Delta Sub-panel drawing
      if (activeIndicators.delta) {
        ctx.save();
        ctx.translate(0, margin.top + chartHeight + spacing);

        // Axis
        ctx.beginPath();
        ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 0.8;
        ctx.moveTo(x, 35);
        ctx.lineTo(x + candleWidth, 35);
        ctx.stroke();

        const barHeight = Math.max(2, (Math.abs(candle.delta) / maxCandleDelta) * 26);
        const barY = candle.delta >= 0 ? 35 - barHeight : 35;

        // Draw Delta volume bar
        ctx.fillStyle = candle.delta >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)";
        ctx.strokeStyle = candle.delta >= 0 ? "rgba(16, 185, 129, 0.85)" : "rgba(244, 63, 94, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.fillRect(x + 4, barY, candleWidth - 8, barHeight);
        ctx.strokeRect(x + 4, barY, candleWidth - 8, barHeight);

        // Delta quantity text label
        if (candleWidth >= 45) {
          ctx.font = "bold 8px Fira Code, monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = candle.delta >= 0 ? (isLight ? "#047857" : "#10b981") : (isLight ? "#be123c" : "#f43f5e");
          const lblY = candle.delta >= 0 ? 35 - barHeight - 4 : 35 + barHeight + 11;
          const deltaText = (candle.delta >= 0 ? "+" : "") + candle.delta.toFixed(0) + "K";
          ctx.fillText(deltaText, x + candleWidth / 2, lblY);
        }
        ctx.restore();
      }

      // D. Time Axis Label
      ctx.save();
      const isHovered = isHoveredCol;
      const timeStr = new Date(candle.timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isHovered) {
        ctx.font = "bold 9px Fira Code, monospace";
        const textWidth = ctx.measureText(timeStr).width;
        const padX = 6;
        const padY = 3;
        const rectW = textWidth + padX * 2;
        const rectH = 15;
        const rectX = x + candleWidth / 2 - rectW / 2;
        const rectY = totalSvgHeight - margin.bottom + 16 - rectH / 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rectX, rectY, rectW, rectH, 3);
        } else {
          ctx.rect(rectX, rectY, rectW, rectH);
        }
        ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(245, 158, 11, 0.15)";
        ctx.fill();

        ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.18)" : "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isLight ? "#0f172a" : "#f59e0b";
        ctx.textAlign = "center";
        ctx.fillText(timeStr, x + candleWidth / 2, totalSvgHeight - margin.bottom + 16);
      } else {
        ctx.font = "bold 9px Fira Code, monospace";
        ctx.fillStyle = "#475569";
        ctx.textAlign = "center";
        ctx.fillText(timeStr, x + candleWidth / 2, totalSvgHeight - margin.bottom + 16);
      }
      ctx.restore();
    });

    // 5. Drawing Cumulative Volume Delta (CVD) trend line
    if (activeIndicators.delta && activeIndicators.cvd && cumulativeDeltaPoints.length > 0) {
      ctx.save();
      ctx.translate(0, margin.top + chartHeight + spacing);

      ctx.beginPath();
      cumulativeDeltaPoints.forEach((p, idx) => {
        const cy = 35 - (p.value / maxCumDelta) * 26;
        if (idx === 0) {
          ctx.moveTo(p.cx, cy);
        } else {
          ctx.lineTo(p.cx, cy);
        }
      });

      // Add purple glowing effect
      ctx.shadowColor = isLight ? "rgba(124, 58, 237, 0.4)" : "rgba(192, 132, 252, 0.8)";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = isLight ? "#7c3aed" : "#c084fc";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Crosshair cursor lines
    if (crosshair) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(100, 116, 139, 0.6)" : "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);

      // Horizontal crosshair
      ctx.moveTo(margin.left, crosshair.y);
      ctx.lineTo(scrollWidth, crosshair.y);

      // Vertical crosshair inside Price chart panel
      ctx.moveTo(crosshair.x, margin.top);
      ctx.lineTo(crosshair.x, totalSvgHeight - margin.bottom);
      
      ctx.stroke();
      ctx.restore();
    }
  }, [
    candles,
    candleWidth,
    verticalScale,
    activeIndicators,
    indicatorSettings,
    theme,
    candleType,
    candleDataType,
    crosshair,
    hoveredCell,
    priceCenterOffset,
    containerHeight,
    scrollWidth,
    totalSvgHeight,
    maxCellVolume,
    maxCandleDelta,
    maxCumDelta,
    profileBuckets,
    maxProfileVol,
    profileBucketSize,
    isDetailedMode,
    isLight,
    activePair.price,
    activePair.priceStep
  ]);

  return (
    <div className={`rounded-2xl overflow-hidden flex flex-col flex-1 shadow-2xl relative border transition-all duration-300 ${
      isLight ? "bg-white border-slate-200" : "liquid-glass-card border-none"
    }`}>
      {/* Chart Tools Header */}
      <div className={`px-5 py-3 flex items-center justify-between z-20 backdrop-blur-md border-b transition-all duration-300 ${
        isLight ? "bg-slate-50/90 border-slate-200" : "bg-slate-950/80 border-white/5"
      }`}>
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/30" />
          <h3 className={`text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 ${
            isLight ? "text-slate-700" : "text-slate-200"
          }`}>
            <span className={`font-display font-extrabold text-sm tracking-tight ${
              isLight ? "text-slate-900" : "text-slate-100"
            }`}>{activePair.symbol}</span>
            <span className="text-[10px] text-slate-500">•</span>
            <button
              onClick={onToggleMarketType}
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded cursor-pointer border transition-all ${
                marketType === "SPOT"
                  ? isLight
                    ? "text-cyan-900 bg-cyan-100 border-cyan-300 font-extrabold shadow-sm hover:bg-cyan-200"
                    : "text-cyan-400 bg-cyan-950/30 border-cyan-500/10 hover:bg-cyan-900/40"
                  : isLight
                    ? "text-purple-900 bg-purple-100 border-purple-300 font-extrabold shadow-sm hover:bg-purple-200"
                    : "text-purple-400 bg-purple-950/30 border-purple-500/10 hover:bg-purple-900/40"
              }`}
              title="Click to toggle Market Type"
            >
              {marketType}
            </button>
          </h3>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons */}
          <div className={`flex rounded-xl p-[3px] border backdrop-blur-sm shadow-inner gap-0.5 transition-all duration-300 ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950/60 border-white/5"
          }`} title="Horizontal Scale">
            <button
              onClick={() => handleZoom(15)}
              className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                isLight ? "hover:bg-slate-200 text-slate-650 hover:text-slate-900" : "hover:bg-white/5 text-slate-400 hover:text-yellow-450"
              }`}
              title="Zoom In (Expand Clusters)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-15)}
              className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                isLight ? "hover:bg-slate-200 text-slate-650 hover:text-slate-900" : "hover:bg-white/5 text-slate-400 hover:text-yellow-450"
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vertical Price Scale Buttons */}
          <div className={`flex rounded-xl p-[3px] border backdrop-blur-sm shadow-inner gap-0.5 transition-all duration-300 ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950/60 border-white/5"
          }`} title="Vertical Price Scale">
            <button
              onClick={() => handleVerticalZoom(0.15)}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                isLight ? "hover:bg-slate-200 text-slate-600 hover:text-slate-900" : "hover:bg-white/5 text-slate-400 hover:text-cyan-405"
              }`}
              title="Stretch Vertically (Narrow visible range)"
            >
              ↕ +
            </button>
            <button
              onClick={() => handleVerticalZoom(-0.15)}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                isLight ? "hover:bg-slate-200 text-slate-600 hover:text-slate-900" : "hover:bg-white/5 text-slate-400 hover:text-cyan-405"
              }`}
              title="Compress Vertically (Widen visible range)"
            >
              ↕ -
            </button>
            <button
              onClick={handleResetZoom}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all duration-150 font-mono cursor-pointer ${
                isLight ? "hover:bg-slate-200 text-slate-600 hover:text-yellow-600" : "hover:bg-white/5 text-slate-400 hover:text-yellow-450"
              }`}
              title="Reset Zoom & Offsets"
            >
              100%
            </button>
          </div>
          
          <div className={`border px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 hidden sm:flex shadow-inner transition-all duration-300 ${
            isLight ? "bg-slate-100 border-slate-200/60 text-slate-600" : "bg-slate-950/60 border-white/5 text-slate-400"
          }`}>
            <Move className="w-3 h-3 text-slate-500" /> Click & Drag to Pan (2D)
          </div>
        </div>
      </div>

      {/* 2D Panning Chart Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main SVG/Zoom Panel */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex-1 overflow-x-auto overflow-y-hidden select-none terminal-grid relative transition-all duration-300 ${
            isLight ? "bg-[#f8fafc]" : "bg-[#06080f]"
          } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ scrollBehavior: "auto" }}
        >
          {candles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#06080f]/80 z-25">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
              className="relative block"
            />
          )}
        </div>

      {/* Fixed Price Scale Panel on the Right */}
      <div
        onWheel={(e) => {
          e.preventDefault();
          setVerticalScale(prev => {
            const delta = e.deltaY;
            const direction = Math.sign(delta);
            if (direction === 0) return prev;
            const next = prev - direction * 0.08;
            return Math.min(3.0, Math.max(0.3, next));
          });
        }}
        className={`w-[90px] flex-none border-l select-none transition-all duration-300 relative flex flex-col justify-between ${
          isLight ? "bg-[#f8fafc] border-slate-200" : "bg-[#06080f] border-white/5"
        }`}
        style={{ height: totalSvgHeight }}
      >
        <svg width={90} height={totalSvgHeight} className="absolute inset-0 block pointer-events-none">
          {/* Price Scale Background Panel */}
          <rect
            x={0}
            y={0}
            width={90}
            height={totalSvgHeight}
            fill={isLight ? "#f8fafc" : "#06080f"}
          />
          
          {/* Primary left divider line to outline the scale */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={totalSvgHeight}
            stroke={isLight ? "#cbd5e1" : "#1e293b"}
            strokeWidth="1.5"
          />

          {/* Price Ticks & Labels */}
          {Array.from({ length: 6 }).map((_, i) => {
            const ratio = i / 5;
            const price = minPrice + ratio * (maxPrice - minPrice);
            const gridY = priceToY(price);
            return (
              <g key={`fixed-grid-label-${i}`}>
                {/* Tick Line */}
                <line
                  x1={0}
                  y1={gridY}
                  x2={5}
                  y2={gridY}
                  stroke={isLight ? "#94a3b8" : "#475569"}
                  strokeWidth="1.2"
                />
                {/* Label Text */}
                <text
                  x={8}
                  y={gridY + 4}
                  fill={isLight ? "#1e293b" : "#cbd5e1"}
                  fontSize="11"
                  fontFamily="Fira Code, monospace"
                  fontWeight="600"
                  textAnchor="start"
                >
                  ${price.toLocaleString(undefined, { minimumFractionDigits: activePair.priceStep < 0.1 ? 3 : 1 })}
                </text>
              </g>
            );
          })}

          {/* Live Active Price level label */}
          {(() => {
            const activePriceY = priceToY(activePair.price);
            if (activePriceY >= margin.top && activePriceY <= margin.top + chartHeight) {
              return (
                <g key="fixed-active-price">
                  <rect
                    x={3}
                    y={activePriceY - 8}
                    width={82}
                    height={16}
                    fill={isLight ? "#1e293b" : "#eab308"}
                    rx="2"
                    stroke={isLight ? "#1e293b" : "#f59e0b"}
                    strokeWidth="1"
                  />
                  <text
                    x={8}
                    y={activePriceY + 4.2}
                    fill={isLight ? "#ffffff" : "#010409"}
                    fontSize="9.5"
                    fontFamily="Fira Code, monospace"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    ${activePair.price.toLocaleString(undefined, { minimumFractionDigits: activePair.priceStep < 0.1 ? 3 : 1 })}
                  </text>
                </g>
              );
            }
            return null;
          })()}

          {/* Hover Crosshair price label */}
          {crosshair && (
            <g key="fixed-crosshair-price">
              <rect
                x={2}
                y={crosshair.y - 8}
                width={82}
                height={16}
                fill={isLight ? "#2563eb" : "#3b82f6"}
                rx="2"
                stroke={isLight ? "#1d4ed8" : "#60a5fa"}
                strokeWidth="1"
              />
              <text
                x={8}
                y={crosshair.y + 4.2}
                fill="#ffffff"
                fontSize="9.5"
                fontFamily="Fira Code, monospace"
                fontWeight="black"
                textAnchor="start"
              >
                ${crosshair.price.toLocaleString(undefined, { minimumFractionDigits: activePair.priceStep < 0.1 ? 3 : 1 })}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>

      {/* Floating Detailed Cell HUD */}
      {hoveredCell && (
        <div className={`absolute top-16 left-5 border rounded-xl p-3 text-xs shadow-2xl z-30 flex flex-col gap-1 backdrop-blur-md transition-all ${
          isLight
            ? "bg-white/95 border-slate-200 text-slate-800 shadow-xl"
            : "bg-slate-950/90 border-white/10 text-slate-100"
        }`}>
          <span className="font-bold text-yellow-500 font-display flex items-center gap-1.5 uppercase tracking-wider border-b pb-1 mb-1 border-white/5">
            <Layers className="w-3.5 h-3.5 text-yellow-500" /> Cell Profiler
          </span>
          <div className={`grid grid-cols-2 gap-x-5 gap-y-1 font-mono text-[11px] ${
            isLight ? "text-slate-650" : "text-slate-400"
          }`}>
            <span>Price Bracket:</span>
            <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>${hoveredCell.cell.price.toLocaleString()}</span>
            <span>Market Sells/Bids:</span>
            <span className="text-rose-500 font-semibold">{hoveredCell.cell.bid.toFixed(2)}K</span>
            <span>Market Buys/Asks:</span>
            <span className="text-emerald-500 font-semibold">{hoveredCell.cell.ask.toFixed(2)}K</span>
            <span>Total Volume:</span>
            <span className="text-yellow-500 font-bold">{(hoveredCell.cell.bid + hoveredCell.cell.ask).toFixed(2)}K</span>
            <span>Cell Imbalance:</span>
            <span className={hoveredCell.cell.isBuyImbalance ? "text-emerald-500 font-bold" : hoveredCell.cell.isSellImbalance ? "text-rose-500 font-bold" : "text-slate-400"}>
              {hoveredCell.cell.isBuyImbalance ? "AGGRESSIVE BUY" : hoveredCell.cell.isSellImbalance ? "AGGRESSIVE SELL" : "BALANCED"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
