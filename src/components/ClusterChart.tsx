/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { ClusterCandle, ClusterCell, CryptoPair, IndicatorSettings } from "../types";
import { ZoomIn, ZoomOut, Maximize2, Compass, Move, Layers, Activity, Eye, EyeOff, Settings, Trash2 } from "lucide-react";

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
  onToggleIndicator?: (id: string) => void;
  onRemoveIndicator?: (id: string) => void;
  onShowIndicatorsSettings?: () => void;
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
  candleDataType = "bid_ask",
  onToggleIndicator,
  onRemoveIndicator,
  onShowIndicatorsSettings
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
  const [deltaPanelHeight, setDeltaPanelHeight] = useState<number>(() => {
    const saved = localStorage.getItem("procluster_delta_panel_height");
    return saved ? parseInt(saved, 10) : 120;
  });
  const [cvdPanelHeight, setCvdPanelHeight] = useState<number>(() => {
    const saved = localStorage.getItem("procluster_cvd_panel_height");
    return saved ? parseInt(saved, 10) : 120;
  });

  useEffect(() => {
    localStorage.setItem("procluster_delta_panel_height", deltaPanelHeight.toString());
  }, [deltaPanelHeight]);

  useEffect(() => {
    localStorage.setItem("procluster_cvd_panel_height", cvdPanelHeight.toString());
  }, [cvdPanelHeight]);

  const [resizingPanel, setResizingPanel] = useState<"delta" | "cvd" | null>(null);

  const panelGap = 24;
  const deltaHeightTotal = activeIndicators.delta ? (deltaPanelHeight + panelGap) : 0;
  const cvdHeightTotal = activeIndicators.cvd ? (cvdPanelHeight + panelGap) : 0;

  // Calculate base chart height to fill container exactly, ensuring Delta/CVD are always pinned at the bottom
  const chartHeight = Math.max(150, containerHeight - margin.top - margin.bottom - deltaHeightTotal - cvdHeightTotal);
  
  const deltaTopY = margin.top + chartHeight + (activeIndicators.delta ? panelGap : 0);
  const cvdTopY = deltaTopY + (activeIndicators.delta ? deltaPanelHeight : 0) + (activeIndicators.cvd ? panelGap : 0);

  const totalSvgHeight = margin.top + chartHeight + deltaHeightTotal + cvdHeightTotal + margin.bottom;

  const [hoveredCell, setHoveredCell] = useState<{ candleIndex: number; cell: ClusterCell } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; price: number } | null>(null);

  // Drag-to-scroll panning variables supporting full vertical + horizontal scrolling
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [visibleScrollLeft, setVisibleScrollLeft] = useState(0);
  const [visibleClientWidth, setVisibleClientWidth] = useState(800);
  const [priceCenterOffset, setPriceCenterOffset] = useState<number>(0);
  const [startPriceOffset, setStartPriceOffset] = useState<number>(0);

  // States and refs for interactive vertical scroll/zoom dragging on the price scale
  const [isDraggingPriceScale, setIsDraggingPriceScale] = useState(false);
  const startPriceScaleYRef = useRef<number>(0);
  const startVerticalScaleRef = useRef<number>(1.0);

  const [deltaScale, setDeltaScale] = useState<number>(1.0);
  const [cvdScale, setCvdScale] = useState<number>(1.0);

  const [isDraggingDeltaScale, setIsDraggingDeltaScale] = useState(false);
  const startDeltaScaleYRef = useRef<number>(0);
  const startDeltaScaleRef = useRef<number>(1.0);

  const [isDraggingCvdScale, setIsDraggingCvdScale] = useState(false);
  const startCvdScaleYRef = useRef<number>(0);
  const startCvdScaleRef = useRef<number>(1.0);

  // States and refs for interactive horizontal timescale zoom/scale dragging
  const [isDraggingTimeScale, setIsDraggingTimeScale] = useState(false);
  const startTimeScaleXRef = useRef<number>(0);
  const startCandleWidthRef = useRef<number>(145);
  const zoomAnchorIndexRef = useRef<number | null>(null);
  const zoomAnchorClickXRef = useRef<number>(0);

  // Dynamically measure container dimensions with ResizeObserver so CVD/delta are pinned perfectly to the bottom
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = containerRef.current?.clientHeight || entry.contentRect.height;
        if (height && height > 100) {
          setContainerHeight(height);
        }
        const width = containerRef.current?.clientWidth || entry.contentRect.width;
        if (width && width > 100) {
          setVisibleClientWidth(width);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    const initialHeight = containerRef.current.clientHeight;
    if (initialHeight && initialHeight > 100) {
      setContainerHeight(initialHeight);
    }
    const initialWidth = containerRef.current.clientWidth;
    if (initialWidth && initialWidth > 100) {
      setVisibleClientWidth(initialWidth);
    }

    return () => resizeObserver.disconnect();
  }, [candles.length]);

  // Standard trading wheel zoom engine (Wheel / Shift + Wheel on main area/timeline = Horizontal scale; Wheel on price scale = Vertical scale)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Shift + Wheel on the main chart area -> zoom/stretch vertically!
        setVerticalScale(prev => {
          const delta = e.deltaY;
          const direction = Math.sign(delta);
          if (direction === 0) return prev;
          // scroll up (negative delta) => stretch => multiplier > 1
          const multiplier = direction < 0 ? 1.15 : 0.85;
          const next = prev * multiplier;
          return Math.min(2000.0, Math.max(0.1, next));
        });
      } else {
        // Standard Wheel -> zoom horizontally
        setCandleWidth(prev => {
          const delta = e.deltaY;
          const direction = Math.sign(delta);
          if (direction === 0) return prev;
          const next = prev - direction * 12;
          return Math.min(450, Math.max(30, next));
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [candles.length, candleWidth, candleSpacing]);

  // Auto-scroll to show the latest candles with a comfortable padding from the right price scale on mount or symbol change
  useEffect(() => {
    const container = containerRef.current;
    if (container && candles.length > 0) {
      const clientWidth = container.clientWidth || 800;
      const candlesTotalWidth = candles.length * (candleWidth + candleSpacing);
      const lastCandleRight = margin.left + candlesTotalWidth;
      
      // Position the last candle with a neat 120px margin from the fixed price scale
      const targetScrollLeft = lastCandleRight - (clientWidth - margin.right - 120);
      
      // Calculate max scroll bounds using the extended scrollWidth padding
      const rightPadding = Math.round(clientWidth * 0.85);
      const computedScrollWidth = candlesTotalWidth + margin.left + margin.right + rightPadding;
      const maxScroll = computedScrollWidth - clientWidth;
      const finalScrollLeft = Math.max(0, Math.min(maxScroll, targetScrollLeft));
      
      container.scrollLeft = finalScrollLeft;
      setVisibleScrollLeft(finalScrollLeft);
      setVisibleClientWidth(clientWidth);
    }
  }, [activePair.symbol, candles.length]);

  // Reset vertical panning offset only when pair changes
  useEffect(() => {
    setPriceCenterOffset(0);
  }, [activePair.symbol]);

  // Adjust canvas zoom
  const handleZoom = (factor: number) => {
    setCandleWidth(prev => {
      const next = prev + factor;
      return Math.min(450, Math.max(30, next));
    });
  };

  const handleVerticalZoom = (factor: number) => {
    setVerticalScale(prev => {
      const multiplier = factor > 0 ? 1.25 : 0.8;
      const next = prev * multiplier;
      return Math.min(2000.0, Math.max(0.1, next));
    });
  };

  const handleResetZoom = () => {
    setCandleWidth(145);
    setVerticalScale(1.0);
    setPriceCenterOffset(0);
  };

  // Find min/max price boundaries for mapping coordinates based on VISIBLE candles! (memoized)
  const visibleCandlesList = useMemo(() => {
    return candles.filter((_, cIdx) => {
      const x = margin.left + cIdx * (candleWidth + candleSpacing);
      return x + candleWidth >= visibleScrollLeft && x <= visibleScrollLeft + visibleClientWidth;
    });
  }, [candles, visibleScrollLeft, visibleClientWidth, candleWidth, candleSpacing]);

  const candlesToScale = useMemo(() => {
    return visibleCandlesList.length > 0 ? visibleCandlesList : candles;
  }, [visibleCandlesList, candles]);

  const priceBounds = useMemo(() => {
    if (candlesToScale.length === 0) {
      return { maxPriceRaw: 100, minPriceRaw: 0, priceRange: 100, basePriceCenter: 50 };
    }
    let maxPriceRaw = candlesToScale[0].high;
    let minPriceRaw = candlesToScale[0].low;
    for (let i = 0; i < candlesToScale.length; i++) {
      const c = candlesToScale[i];
      if (c.high > maxPriceRaw) maxPriceRaw = c.high;
      if (c.low < minPriceRaw) minPriceRaw = c.low;
    }
    const priceRange = maxPriceRaw - minPriceRaw || 1;
    const basePriceCenter = (maxPriceRaw + minPriceRaw) / 2;
    return { maxPriceRaw, minPriceRaw, priceRange, basePriceCenter };
  }, [candlesToScale]);

  const { maxPriceRaw, minPriceRaw, priceRange, basePriceCenter } = priceBounds;

  // We apply the vertical scale to the price range projection to stretch/compress candles visually!
  // verticalScale > 1.0 means we stretch vertically (narrower visible price range = taller candles)
  // verticalScale < 1.0 means we compress vertically (wider visible price range = flatter candles)
  const zoomedPriceRange = useMemo(() => priceRange / Math.max(0.1, verticalScale), [priceRange, verticalScale]);
  
  const priceCenter = useMemo(() => basePriceCenter + priceCenterOffset, [basePriceCenter, priceCenterOffset]);
  
  const maxPrice = useMemo(() => priceCenter + zoomedPriceRange * 0.58, [priceCenter, zoomedPriceRange]);
  const minPrice = useMemo(() => Math.max(0, priceCenter - zoomedPriceRange * 0.58), [priceCenter, zoomedPriceRange]);

  const priceToY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return margin.top + chartHeight * (1 - (price - minPrice) / range);
  };

  const yToPrice = (y: number) => {
    const range = maxPrice - minPrice || 1;
    const rawPrice = minPrice + (1 - (y - margin.top) / Math.max(1, chartHeight)) * range;
    return Math.max(0, rawPrice);
  };

  // Compute scrollable content width - add a generous scroll zone on the right (85% of screen width) so users can freely drag the last candles away from the price scale
  const scrollRightPadding = Math.round(Number(visibleClientWidth || 800) * 0.85);
  const scrollWidth = candles.length * (candleWidth + candleSpacing) + margin.left + margin.right + scrollRightPadding;

  // Zoom threshold: Detailed cluster footprint mode vs default Candlestick view
  const isDetailedModeCalculated = candleWidth >= 60;
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
    
    // Check if the click is in the timeline zone (at the bottom margin area of the canvas/container)
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clickY = e.clientY - rect.top;
      if (clickY >= totalSvgHeight - margin.bottom) {
        setIsDraggingTimeScale(true);
        startTimeScaleXRef.current = e.clientX;
        startCandleWidthRef.current = candleWidth;
        
        const clickXInContainer = e.clientX - rect.left;
        const currentScroll = containerRef.current?.scrollLeft || 0;
        const absoluteX = currentScroll + clickXInContainer;
        const xFromLeft = absoluteX - margin.left;
        zoomAnchorIndexRef.current = xFromLeft / (candleWidth + candleSpacing);
        zoomAnchorClickXRef.current = clickXInContainer;
        return; // skip standard 2D panning/dragging
      }
    }

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
    const viewportWidth = visibleClientWidth || 800;

    // Check if hovered on the timeline strip at the bottom
    if (y >= totalSvgHeight - margin.bottom && y <= totalSvgHeight) {
      e.currentTarget.style.cursor = "ew-resize";
      setCrosshair(null);
      setHoveredCell(null);
      return;
    } else {
      e.currentTarget.style.cursor = "";
    }

    if (y >= margin.top && y <= totalSvgHeight - margin.bottom && x >= margin.left && x <= viewportWidth - margin.right) {
      const clampedYForPrice = Math.min(margin.top + chartHeight, Math.max(margin.top, y));
      const price = yToPrice(clampedYForPrice);
      setCrosshair({ x, y, price });

      const scrolledX = x + visibleScrollLeft;

      // Identify hovered cell mathematically
      const colIdx = Math.floor((scrolledX - margin.left) / (candleWidth + candleSpacing));
      if (colIdx >= 0 && colIdx < candles.length) {
        const candle = candles[colIdx];
        const candleX = margin.left + colIdx * (candleWidth + candleSpacing);
        
        if (scrolledX >= candleX && scrolledX <= candleX + candleWidth) {
          const step = activePair.priceStep;
          const cell = (candle.cells || []).find(cl => Math.abs(cl.price - price) <= step / 2);
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
        (candle.cells || []).forEach(cell => {
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

  // Memoize Session Profile
  const { buckets: profileBuckets, maxProfileVol, bucketSize: profileBucketSize } = useMemo(() => {
    const profileRange = maxPrice - minPrice;
    const bucketCount = 20;
    const bucketSize = (profileRange / bucketCount) || 1;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      price: minPrice + i * bucketSize + bucketSize / 2,
      volume: 0,
    }));

    if (candles.length > 0) {
      candles.forEach(candle => {
        (candle.cells || []).forEach(cell => {
          const bucketIdx = Math.floor((cell.price - minPrice) / bucketSize);
          if (bucketIdx >= 0 && bucketIdx < bucketCount) {
            buckets[bucketIdx].volume += cell.volume;
          }
        });
      });
    }

    let maxProfileVol = 1;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].volume > maxProfileVol) maxProfileVol = buckets[i].volume;
    }
    return { buckets, maxProfileVol, bucketSize };
  }, [candles, minPrice, maxPrice]);

  // Find overall maximum cell volume to properly scale cell footprint horizontal bars (memoized)
  const maxCellVolume = useMemo(() => {
    let max = 1;
    for (let c = 0; c < candles.length; c++) {
      const cells = candles[c].cells || [];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].volume > max) {
          max = cells[i].volume;
        }
      }
    }
    return max;
  }, [candles]);

  // Compute high delta for standard delta chart scaling (memoized)
  const maxCandleDelta = useMemo(() => {
    let max = 1;
    for (let i = 0; i < candles.length; i++) {
      const absDelta = Math.abs(candles[i].delta);
      if (absDelta > max) max = absDelta;
    }
    return max;
  }, [candles]);

  // Zoomed version of maxCandleDelta based on user vertical dragging/zooming
  const zoomedMaxCandleDelta = useMemo(() => {
    return maxCandleDelta / Math.max(0.01, deltaScale);
  }, [maxCandleDelta, deltaScale]);

  // Find overall maximum cell delta to properly scale imbalance highlights (memoized)
  const maxCellDelta = useMemo(() => {
    let max = 1;
    for (let c = 0; c < candles.length; c++) {
      const cells = candles[c].cells || [];
      for (let i = 0; i < cells.length; i++) {
        const d = Math.abs(cells[i].ask - cells[i].bid);
        if (d > max) max = d;
      }
    }
    return max;
  }, [candles]);

  // Generate Cumulative Delta Line Coordinates (memoized)
  const cumulativeDeltaPoints = useMemo(() => {
    let runningDelta = 0;
    return candles.map((c, i) => {
      runningDelta += c.delta;
      const cx = margin.left + i * (candleWidth + candleSpacing) + candleWidth / 2;
      return { cx, value: runningDelta };
    });
  }, [candles, candleWidth, candleSpacing]);

  const { minCumDeltaVal, maxCumDeltaVal, cvdDeltaRange } = useMemo(() => {
    if (cumulativeDeltaPoints.length === 0) {
      return { minCumDeltaVal: 0, maxCumDeltaVal: 1, cvdDeltaRange: 1 };
    }
    let minCumDeltaVal = 0;
    let maxCumDeltaVal = 1;
    for (let i = 0; i < cumulativeDeltaPoints.length; i++) {
      const val = cumulativeDeltaPoints[i].value;
      if (val < minCumDeltaVal) minCumDeltaVal = val;
      if (val > maxCumDeltaVal) maxCumDeltaVal = val;
    }
    const cvdDeltaRange = Math.max(1, maxCumDeltaVal - minCumDeltaVal);
    return { minCumDeltaVal, maxCumDeltaVal, cvdDeltaRange };
  }, [cumulativeDeltaPoints]);

  const zoomedCvdDeltaRange = useMemo(() => cvdDeltaRange / Math.max(0.01, cvdScale), [cvdDeltaRange, cvdScale]);
  const cvdCenterVal = useMemo(() => (maxCumDeltaVal + minCumDeltaVal) / 2, [maxCumDeltaVal, minCumDeltaVal]);
  const zoomedCvdMax = useMemo(() => cvdCenterVal + zoomedCvdDeltaRange * 0.5, [cvdCenterVal, zoomedCvdDeltaRange]);
  const zoomedCvdMin = useMemo(() => cvdCenterVal - zoomedCvdDeltaRange * 0.5, [cvdCenterVal, zoomedCvdDeltaRange]);

  const getCvdY = (val: number, panelH: number) => {
    return panelH - ((val - zoomedCvdMin) / zoomedCvdDeltaRange) * (panelH * 0.7) - (panelH * 0.15);
  };

  // Find dynamic maximum volume on visible part of the chart (memoized)
  const visibleMaxCellVol = useMemo(() => {
    let max = 1;
    for (let c = 0; c < candlesToScale.length; c++) {
      const cells = candlesToScale[c].cells || [];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].volume > max) {
          max = cells[i].volume;
        }
      }
    }
    return max;
  }, [candlesToScale]);

  const visibleMaxSingleVol = useMemo(() => {
    let max = 1;
    for (let c = 0; c < candlesToScale.length; c++) {
      const cells = candlesToScale[c].cells || [];
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.bid > max) max = cell.bid;
        if (cell.ask > max) max = cell.ask;
      }
    }
    return max;
  }, [candlesToScale]);

  // Window-level mouse resize tracker for indicator panels
  useEffect(() => {
    if (!resizingPanel) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      if (resizingPanel === "delta") {
        const deltaBottomY = deltaTopY + deltaPanelHeight;
        const newHeight = Math.max(50, Math.min(350, deltaBottomY - relativeY));
        setDeltaPanelHeight(newHeight);
      } else if (resizingPanel === "cvd") {
        const cvdBottomY = cvdTopY + cvdPanelHeight;
        const newHeight = Math.max(50, Math.min(350, cvdBottomY - relativeY));
        setCvdPanelHeight(newHeight);
      }
    };

    const handleWindowMouseUp = () => {
      setResizingPanel(null);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [resizingPanel, deltaTopY, deltaPanelHeight, cvdTopY, cvdPanelHeight]);

  // Window-level mouse drag-zoom tracker for vertical price scale dragging
  useEffect(() => {
    if (!isDraggingPriceScale) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const deltaY = startPriceScaleYRef.current - e.clientY;
      // Exponential zoom feel: dragging up zooms in, dragging down zooms out
      const multiplier = Math.exp(deltaY / 200);
      const nextScale = startVerticalScaleRef.current * multiplier;
      const clampedScale = Math.min(2000.0, Math.max(0.1, nextScale));
      setVerticalScale(clampedScale);
    };

    const handleWindowMouseUp = () => {
      setIsDraggingPriceScale(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDraggingPriceScale]);

  // Window-level mouse drag-zoom tracker for vertical Delta scale dragging
  useEffect(() => {
    if (!isDraggingDeltaScale) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const deltaY = startDeltaScaleYRef.current - e.clientY;
      const multiplier = Math.exp(deltaY / 200);
      const nextScale = startDeltaScaleRef.current * multiplier;
      const clampedScale = Math.min(200.0, Math.max(0.01, nextScale));
      setDeltaScale(clampedScale);
    };

    const handleWindowMouseUp = () => {
      setIsDraggingDeltaScale(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDraggingDeltaScale]);

  // Window-level mouse drag-zoom tracker for vertical CVD scale dragging
  useEffect(() => {
    if (!isDraggingCvdScale) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const deltaY = startCvdScaleYRef.current - e.clientY;
      const multiplier = Math.exp(deltaY / 200);
      const nextScale = startCvdScaleRef.current * multiplier;
      const clampedScale = Math.min(200.0, Math.max(0.01, nextScale));
      setCvdScale(clampedScale);
    };

    const handleWindowMouseUp = () => {
      setIsDraggingCvdScale(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDraggingCvdScale]);

  // Window-level mouse drag-zoom tracker for horizontal timeline scale dragging
  useEffect(() => {
    if (!isDraggingTimeScale) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startTimeScaleXRef.current;
      // Linear zoom mapping starting from our cached candleWidth.
      // If we move mouse to the right, we stretch (increase candleWidth).
      // If we move mouse to the left, we squeeze (decrease candleWidth).
      const nextW = startCandleWidthRef.current + deltaX * 1.0;
      const clampedW = Math.min(450, Math.max(30, nextW));

      setCandleWidth(clampedW);

      if (zoomAnchorIndexRef.current !== null && containerRef.current) {
        const targetAbsoluteX = zoomAnchorIndexRef.current * (clampedW + candleSpacing) + margin.left;
        const nextScrollLeft = targetAbsoluteX - zoomAnchorClickXRef.current;
        
        // Calculate the maximum actual scroll boundaries using the prospective width
        const scrollWidthCalculated = candles.length * (clampedW + candleSpacing) + margin.left + margin.right + scrollRightPadding;
        const maxScroll = Math.max(0, scrollWidthCalculated - (containerRef.current.clientWidth || 800));
        const clampedScrollLeft = Math.max(0, Math.min(maxScroll, nextScrollLeft));

        setVisibleScrollLeft(clampedScrollLeft);
        containerRef.current.scrollLeft = clampedScrollLeft;
      }
    };

    const handleWindowMouseUp = () => {
      setIsDraggingTimeScale(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    isDraggingTimeScale, 
    candleSpacing, 
    margin.left, 
    margin.right, 
    candles.length, 
    scrollRightPadding
  ]);

  // Find hovered candle's values in components main render scope so overlays can display them dynamically
  const hoveredCandleIdx = crosshair
    ? Math.floor((crosshair.x - margin.left) / (candleWidth + candleSpacing))
    : -1;
  const hoveredCandle = (hoveredCandleIdx >= 0 && hoveredCandleIdx < candles.length) ? candles[hoveredCandleIdx] : null;

  const deltaValueText = hoveredCandle 
    ? `${hoveredCandle.delta >= 0 ? "+" : ""}${hoveredCandle.delta.toFixed(1)}K`
    : "--";

  const cvdValueText = (hoveredCandleIdx >= 0 && hoveredCandleIdx < cumulativeDeltaPoints.length)
    ? `${cumulativeDeltaPoints[hoveredCandleIdx].value >= 0 ? "+" : ""}${cumulativeDeltaPoints[hoveredCandleIdx].value.toFixed(1)}K`
    : "--";

  useEffect(() => {
    if (candles.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale canvas for ultra-crisp Retina/High-DPI support using the visible viewport size to avoid exceeding browser canvas limits
    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = visibleClientWidth || 800;
    canvas.width = viewportWidth * dpr;
    canvas.height = totalSvgHeight * dpr;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${totalSvgHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.textBaseline = "middle";

    // Clear and draw background (full viewport size)
    ctx.fillStyle = isLight ? "#f8fafc" : "#06080f";
    ctx.fillRect(0, 0, viewportWidth, totalSvgHeight);

    // -------------------------------------------------------------------------
    // RENDER TRADINGVIEW-STYLE INTEGRATED CHART WATERMARK
    // -------------------------------------------------------------------------
    ctx.save();
    // Center it horizontally across the active visible candle plot area (excluding margins)
    const watermarkX = margin.left + (viewportWidth - margin.left - margin.right) / 2;
    // Center it vertically in the main candles chart height
    const watermarkY = margin.top + chartHeight / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Primary watermark string "PROCLUSTER"
    ctx.font = `bold 64px 'Space Grotesk', 'Inter', -apple-system, sans-serif`;
    ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.03)" : "rgba(255, 255, 255, 0.025)";
    ctx.fillText("PROCLUSTER", watermarkX, watermarkY - 14);

    // Secondary sub-line with active instrument details
    ctx.font = `600 12px 'JetBrains Mono', 'Fira Code', monospace`;
    ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.05)" : "rgba(255, 255, 255, 0.05)";
    const currentSymbol = activePair.symbol.toUpperCase();
    const currentMarket = marketType || "SPOT";
    ctx.fillText(`${currentSymbol} • ${currentMarket} • 1M`, watermarkX, watermarkY + 28);
    ctx.restore();
    // -------------------------------------------------------------------------

    // Save context and apply translation for scroll-relative elements
    ctx.save();
    ctx.translate(-visibleScrollLeft, 0);

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

    // Solid horizontal separator line between main chart panel and subcharts
    if (activeIndicators.delta || activeIndicators.cvd) {
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1.0;
      ctx.moveTo(0, margin.top + chartHeight);
      ctx.lineTo(scrollWidth, margin.top + chartHeight);
      ctx.stroke();
    }

    // Dividers between Delta and CVD panels if both are active
    if (activeIndicators.delta && activeIndicators.cvd) {
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = 1.0;
      const midDividerY = deltaTopY + deltaPanelHeight + panelGap / 2;
      ctx.moveTo(0, midDividerY);
      ctx.lineTo(scrollWidth, midDividerY);
      ctx.stroke();
    }

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

    // 3. Draw Aggregated Session Profile on the left side of the chart (fixed on screen, so translate-invariant)
    if (activeIndicators.volume) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(margin.left + visibleScrollLeft, margin.top, viewportWidth, chartHeight);
      ctx.clip();

      profileBuckets.forEach((bucket) => {
        const bWidth = (bucket.volume / maxProfileVol) * 65;
        const bY = priceToY(bucket.price) - (profileBucketSize / (maxPrice - minPrice)) * chartHeight / 2;
        const bHeight = Math.max(2, (profileBucketSize / (maxPrice - minPrice)) * chartHeight - 1.5);
        
        ctx.fillStyle = isLight ? "rgba(71, 85, 105, 0.1)" : "rgba(148, 163, 184, 0.08)";
        ctx.fillRect(margin.left + visibleScrollLeft, bY, bWidth, bHeight);

        ctx.strokeStyle = isLight ? "rgba(71, 85, 105, 0.2)" : "rgba(148, 163, 184, 0.18)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(margin.left + visibleScrollLeft, bY, bWidth, bHeight);
      });
      ctx.restore();
    }



    const startIdx = Math.max(0, Math.floor((visibleScrollLeft - margin.left - candleWidth) / (candleWidth + candleSpacing)));
    const endIdx = Math.min(candles.length - 1, Math.ceil((visibleScrollLeft + viewportWidth - margin.left) / (candleWidth + candleSpacing)));

    // 4. Draw each visible candlestick
    for (let cIdx = startIdx; cIdx <= endIdx; cIdx++) {
      const candle = candles[cIdx];
      const x = margin.left + cIdx * (candleWidth + candleSpacing);
      const bodyY1 = priceToY(Math.max(candle.open, candle.close));
      const bodyY2 = priceToY(Math.min(candle.open, candle.close));
      const isGreen = candle.close >= candle.open;

      // Determine the dynamic/live POC cell of the candle based on the visible vertical range [minPrice, maxPrice]
      const candleCells = candle.cells || [];
      const visibleCellsOfCandle = candleCells.filter(cl => cl.price >= minPrice && cl.price <= maxPrice);
      const activePocCell = visibleCellsOfCandle.length > 0
        ? visibleCellsOfCandle.reduce((max, c) => c.volume > max.volume ? c : max, visibleCellsOfCandle[0])
        : (candleCells.length > 0 
           ? candleCells.reduce((max, c) => c.volume > max.volume ? c : max, candleCells[0])
           : null);

      const activePocPrice = activePocCell ? activePocCell.price : candle.pocPrice;

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

      // Clip candlesticks, footprints and any extra overflow elements to the main chart region [margin.top, margin.top + chartHeight]
      ctx.save();
      ctx.beginPath();
      ctx.rect(margin.left, margin.top, scrollWidth - margin.left + 50, chartHeight);
      ctx.clip();

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

        // Tick for POC (Clean neutral tint instead of yellow)
        ctx.beginPath();
        ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.moveTo(x, priceToY(activePocPrice));
        ctx.lineTo(x + candleWidth, priceToY(activePocPrice));
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      // B. Zoomed in Footprint detailed view
      if (isDetailedMode) {
        // Find maximums for normalization
        let candleMaxTotalVol = 1;
        for (let i = 0; i < candleCells.length; i++) {
          const vol = candleCells[i].volume;
          if (vol > candleMaxTotalVol) {
            candleMaxTotalVol = vol;
          }
        }
        const isClustersMode = candleType === "clusters";

        // Place the vertical separator/spine exactly in the center for symmetrical Bid/Ask columns
        const sepX = x + Math.round(candleWidth / 2);

        // 1. Draw elegant thin candlestick body core container outline box surrounding the open-close range (matches user screenshot)
        const bodyTopY = priceToY(Math.max(candle.open, candle.close));
        const bodyBottomY = priceToY(Math.min(candle.open, candle.close));
        const bodyH = Math.max(3, bodyBottomY - bodyTopY);
        
        ctx.strokeStyle = isGreen 
          ? (isLight ? "rgba(16, 185, 129, 0.45)" : "rgba(16, 185, 129, 0.55)") 
          : (isLight ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.55)");
        ctx.lineWidth = 1.0;
        ctx.strokeRect(x + 0.5, bodyTopY + 0.5, candleWidth - 1, bodyH - 1);

        // Draw the vertical separator line covering the entire high-low range of the cells
        if (candleCells.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.16)" : "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = 1.0;
          const topPriceY = priceToY(candleCells[0].price + activePair.priceStep / 2);
          const bottomPriceY = priceToY(candleCells[candleCells.length - 1].price - activePair.priceStep / 2);
          ctx.moveTo(sepX, topPriceY);
          ctx.lineTo(sepX, bottomPriceY);
          ctx.stroke();
        }

        candleCells.forEach((cell, cellIdx) => {
          const cellBelow = candleCells[cellIdx + 1];
          const cellAbove = candleCells[cellIdx - 1];

          const isDiagonalBuyImbalance = !!(cellBelow && cell.ask > cellBelow.bid * 3.0 && cell.ask > 0);
          const isDiagonalSellImbalance = !!(cellAbove && cell.bid > cellAbove.ask * 3.0 && cell.bid > 0);

          const yTop = priceToY(cell.price + activePair.priceStep / 2);
          const yBottom = priceToY(cell.price - activePair.priceStep / 2);
          const cellHeight = Math.max(1.5, yBottom - yTop);
          const cellY = yTop;
          // Very neat horizontal brick gap for a crisp layout
          const drawHeight = Math.max(1.0, cellHeight - 0.6);

          const isCellPoc = cell.isPoc;

          // Compute volume normalization ratios
          const maxValSingle = visibleMaxSingleVol;
          const bidRatio = cell.bid > 0 ? cell.bid / maxValSingle : 0;
          const askRatio = cell.ask > 0 ? cell.ask / maxValSingle : 0;
          const volRatio = cell.volume > 0 ? cell.volume / visibleMaxCellVol : 0;

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

          // A. Draw Cell Background Fills (Bid left, Ask right)
          if (candleDataType === "bid_ask") {
            // Keep backgrounds completely transparent like the screenshot for that neat, elegant footprint style and only use light lines
            ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 255, 255, 0.02)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.5, cellY + 0.5, candleWidth - 1, drawHeight);
          } else if (candleDataType === "delta") {
            const cellDeltaVal = cell.ask - cell.bid;
            const deltaRatio = Math.abs(cellDeltaVal) / maxValSingle;
            const deltaOpacity = 0.04 + deltaRatio * 0.45;
            const isBuyDelta = cellDeltaVal > 0;

            ctx.fillStyle = isBuyDelta
              ? (isLight ? `rgba(34, 197, 94, ${deltaOpacity * 0.70})` : `rgba(4, 120, 87, ${deltaOpacity})`)
              : (isLight ? `rgba(239, 68, 68, ${deltaOpacity * 0.70})` : `rgba(220, 38, 38, ${deltaOpacity})`);
            ctx.fillRect(x + 0.5, cellY + 0.5, candleWidth - 1, drawHeight);

            ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.03)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.5, cellY + 0.5, candleWidth - 1, drawHeight);
          } else if (candleDataType === "volume") {
            const volOpacity = 0.04 + volRatio * 0.45;
            ctx.fillStyle = isLight
              ? `rgba(100, 116, 139, ${volOpacity * 0.70})`
              : `rgba(148, 163, 184, ${volOpacity * 0.6})`;
            ctx.fillRect(x + 0.5, cellY + 0.5, candleWidth - 1, drawHeight);

            ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.03)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.5, cellY + 0.5, candleWidth - 1, drawHeight);
          }

          // B. Draw Beautiful Outward Growing Horizontal Profile Bars (Exactly matches the user screenshot)
          if (candleDataType === "bid_ask") {
            const maxBarWidth = Math.round((candleWidth / 2) * 0.90);
            const bidBarWidth = cell.bid > 0 ? (cell.bid / maxValSingle) * maxBarWidth : 0;
            const askBarWidth = cell.ask > 0 ? (cell.ask / maxValSingle) * maxBarWidth : 0;

            const bidRatioClamped = Math.min(1.0, Math.max(0.0, bidRatio));
            const askRatioClamped = Math.min(1.0, Math.max(0.0, askRatio));

            // Histograms grow from the center line/spine (sepX) to both sides, corresponding to bids/asks volumes
            if (bidBarWidth > 0) {
              // Bid volume on the left side: Both width and opacity/contrast scale with volume ratio
              // At max ratio (1.0), the color is solid/high contrast. At min ratio, it is faint/low contrast.
              const op = isLight 
                ? (0.06 + bidRatioClamped * 0.68) 
                : (0.10 + bidRatioClamped * 0.85);
              ctx.fillStyle = isLight ? `rgba(220, 38, 38, ${op})` : `rgba(239, 68, 68, ${op})`;
              ctx.fillRect(sepX - bidBarWidth, cellY + 0.5, bidBarWidth, drawHeight);
            }
            if (askBarWidth > 0) {
              // Ask volume on the right side: Both width and opacity/contrast scale with volume ratio
              const op = isLight 
                ? (0.06 + askRatioClamped * 0.68) 
                : (0.10 + askRatioClamped * 0.85);
              ctx.fillStyle = isLight ? `rgba(22, 163, 74, ${op})` : `rgba(16, 185, 129, ${op})`;
              ctx.fillRect(sepX, cellY + 0.5, askBarWidth, drawHeight);
            }
          } else {
            const maxBarWidth = candleWidth - 2;
            const barWidth = cell.volume > 0 ? (cell.volume / visibleMaxCellVol) * maxBarWidth : 0;
            if (barWidth > 0) {
              const barIsBuy = cell.ask > cell.bid;
              ctx.fillStyle = barIsBuy
                ? (isLight ? "rgba(22, 163, 74, 0.35)" : "rgba(16, 185, 129, 0.45)")
                : (isLight ? "rgba(220, 38, 38, 0.35)" : "rgba(239, 68, 68, 0.45)");
              ctx.fillRect(x + 1, cellY + 0.5, barWidth, drawHeight);
            }
          }

          // C. Highlight Diagonal Buy / Sell Imbalance rows removed at user's request (only keep histograms)

          // D. Highlight Point of Control (POC) removed at user request

          // Old Cluster Search outline replaced by new beautiful shapes rendering

          // Stacked imbalance outline highlights removed at user request

          // Bid Ask standard text rendering or delta/volume mode
          if (cellHeight >= 4.0) {
            ctx.save();
            ctx.shadowColor = isLight ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.9)";
            ctx.shadowBlur = 1.0;
            ctx.shadowOffsetX = 0.5;
            ctx.shadowOffsetY = 0.5;
            ctx.textBaseline = "middle";

            // Intelligent adaptive precision volume formatter - prevents BTC/ETH cell numbers from showing as empty "0.0 x 0.0"
            const getFormatter = (maxSingleVal: number) => {
              if (maxSingleVal < 0.1) return (v: number) => v === 0 ? "0" : v.toFixed(4);
              if (maxSingleVal < 1.0) return (v: number) => v === 0 ? "0" : v.toFixed(3);
              if (maxSingleVal < 10.0) return (v: number) => v === 0 ? "0" : v.toFixed(2);
              if (maxSingleVal < 100.0) return (v: number) => v === 0 ? "0" : v.toFixed(1);
              return (v: number) => v === 0 ? "0" : v.toFixed(0);
            };

            const fmt = getFormatter(visibleMaxSingleVol);
            const bidValStr = fmt(cell.bid);
            const askValStr = fmt(cell.ask);
            const cellDeltaVal = cell.ask - cell.bid;
            const deltaDisplayStr = (cellDeltaVal > 0 ? "+" : "") + fmt(Math.abs(cellDeltaVal));
            const volStr = fmt(cell.volume);

            const bidCol = isDiagonalSellImbalance
              ? (isLight ? "#dc2626" : "#ff3355")
              : (isLight ? "#0f172a" : "#ffffff");

            const askCol = isDiagonalBuyImbalance
              ? (isLight ? "#16a34a" : "#05f38c")
              : (isLight ? "#0f172a" : "#ffffff");

            const drawCenteredBidAsk = (targetX: number, targetY: number) => {
              ctx.textAlign = "center";
              const separator = "x";
              const bidW = ctx.measureText(bidValStr).width;
              const sepW = ctx.measureText(separator).width;
              const askW = ctx.measureText(askValStr).width;
              const totalW = bidW + sepW + askW;

              const startX = targetX - totalW / 2;

              ctx.textAlign = "left";
              ctx.fillStyle = bidCol;
              ctx.fillText(bidValStr, startX, targetY);

              ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.55)";
              ctx.fillText(separator, startX + bidW, targetY);

              ctx.fillStyle = askCol;
              ctx.fillText(askValStr, startX + bidW + sepW, targetY);
            };

            const textToMeasure = candleDataType === "bid_ask"
              ? `${bidValStr}x${askValStr}`
              : (candleDataType === "delta" ? deltaDisplayStr : volStr);
            const textLength = Math.max(1, textToMeasure.length);

            // Compute font sizes matching height and width perfectly, allowing vertical stretch scalability
            let idealSize = Math.max(5, Math.floor(cellHeight * 0.72));
            const maxByWidth = Math.max(7, Math.floor((candleWidth - 4) / (textLength * 0.55)));
            let finalFontSize = Math.min(idealSize, maxByWidth);
            // If the user stretched clusters vertically, allow font to upscale independently of narrow width restriction
            if (cellHeight > 24) {
              finalFontSize = Math.max(finalFontSize, Math.min(16, Math.floor(cellHeight * 0.65)));
            }
            if (finalFontSize < 5) finalFontSize = 5;
            if (finalFontSize > 28) finalFontSize = 28;
            const fontSizeVal = `${finalFontSize}px`;
            ctx.font = `${isCellPoc ? "bold" : "normal"} ${fontSizeVal} 'Inter', -apple-system, system-ui, sans-serif`;

            // Symmetrical horizontal midpoints for Bid (left column) and Ask (right column)
            const leftMidX = x + Math.round(candleWidth * 0.25);
            const rightMidX = x + Math.round(candleWidth * 0.75);
            const centerTextX = x + candleWidth / 2;

            if (isCellPoc) {
              // High contrast text on POC background (dark for light theme, white for dark theme)
              const pocTextCol = isLight ? "#0f172a" : "#ffffff";
              ctx.fillStyle = pocTextCol;
              if (isClustersMode) {
                if (candleDataType === "bid_ask") {
                  drawCenteredBidAsk(centerTextX, cellY + cellHeight / 2);
                } else if (candleDataType === "delta") {
                   ctx.textAlign = "center";
                  ctx.fillText(deltaDisplayStr, centerTextX, cellY + cellHeight / 2);
                } else if (candleDataType === "volume") {
                  ctx.textAlign = "center";
                  ctx.fillText(volStr, centerTextX, cellY + cellHeight / 2);
                }
              } else {
                if (candleDataType === "bid_ask") {
                  if (candleWidth >= 55) {
                    ctx.textAlign = "center";
                    ctx.fillStyle = bidCol;
                    ctx.fillText(bidValStr, leftMidX, cellY + cellHeight / 2);
                    ctx.fillStyle = askCol;
                    ctx.fillText(askValStr, rightMidX, cellY + cellHeight / 2);
                  } else {
                    drawCenteredBidAsk(centerTextX, cellY + cellHeight / 2);
                  }
                } else {
                  ctx.textAlign = "center";
                  ctx.fillText(candleDataType === "delta" ? deltaDisplayStr : volStr, centerTextX, cellY + cellHeight / 2);
                }
              }
            } else {
              // Non-POC cells: Color depending on display type
              if (!isClustersMode) {
                if (candleDataType === "bid_ask") {
                  if (candleWidth >= 35) {
                    if (candleWidth >= 55) {
                      // Standard Bid x Ask columns symmetrically spaced
                      ctx.fillStyle = bidCol;
                      ctx.textAlign = "center";
                      ctx.fillText(bidValStr, leftMidX, cellY + cellHeight / 2);

                      ctx.fillStyle = askCol;
                      ctx.textAlign = "center";
                      ctx.fillText(askValStr, rightMidX, cellY + cellHeight / 2);
                    } else {
                      drawCenteredBidAsk(centerTextX, cellY + cellHeight / 2);
                    }
                  }
                } else if (candleDataType === "delta") {
                  ctx.fillStyle = isLight
                    ? (cellDeltaVal > 0 ? "#047857" : cellDeltaVal < 0 ? "#b91c1c" : "#475569")
                    : (cellDeltaVal > 0 ? "#10b981" : cellDeltaVal < 0 ? "#ef4444" : "#94a3b8");
                  ctx.textAlign = "center";
                  ctx.fillText(deltaDisplayStr, centerTextX, cellY + cellHeight / 2);
                } else if (candleDataType === "volume") {
                  ctx.fillStyle = isLight ? "#1e293b" : "#cbd5e1";
                  ctx.textAlign = "center";
                  ctx.fillText(volStr, centerTextX, cellY + cellHeight / 2);
                }
              } else {
                // Clusters Mode Text Rendering (centered)
                if (candleDataType === "bid_ask" && candleWidth >= 35) {
                  drawCenteredBidAsk(centerTextX, cellY + cellHeight / 2);
                } else if (candleDataType === "delta" && candleWidth >= 45) {
                  ctx.fillStyle = isLight
                    ? (cellDeltaVal > 0 ? "#047857" : cellDeltaVal < 0 ? "#b91c1c" : "#475569")
                    : (cellDeltaVal > 0 ? "#10b981" : cellDeltaVal < 0 ? "#ef4444" : "#94a3b8");
                  ctx.textAlign = "center";
                  ctx.fillText(deltaDisplayStr, centerTextX, cellY + cellHeight / 2);
                } else if (candleDataType === "volume" && candleWidth >= 45) {
                  ctx.fillStyle = isLight ? "#1e293b" : "#cbd5e1";
                  ctx.textAlign = "center";
                  ctx.fillText(volStr, centerTextX, cellY + cellHeight / 2);
                }
              }
            }
            ctx.restore();
          }
        });

        // Value Area Bracket removed at user request
          // No VAH/VAL vertical bracket lines
      }

      // --- DYNAMIC CLUSTER SEARCH (GEOMETRIC MULTI-LEVEL VISUALIZER) ---
      if (activeIndicators.clusterSearch && candleCells.length > 0) {
        const csSettings = indicatorSettings?.clusterSearch || {};
        
        const csMergeLevels = typeof csSettings.csMergeLevels === "number" ? csSettings.csMergeLevels : 1;
        const csImbalancePercent = typeof csSettings.csImbalancePercent === "number" ? csSettings.csImbalancePercent : 60;
        
        // Medium Filter
        const csMedMinVolume = typeof csSettings.csMedMinVolume === "number" ? csSettings.csMedMinVolume : 100;
        const csMedMaxVolume = typeof csSettings.csMedMaxVolume === "number" ? csSettings.csMedMaxVolume : 500;
        const csMedMinSize = typeof csSettings.csMedMinSize === "number" ? csSettings.csMedMinSize : 4;
        const csMedMaxSize = typeof csSettings.csMedMaxSize === "number" ? csSettings.csMedMaxSize : 12;
        const csMedShape = csSettings.csMedShape || "circle";
        const csMedColorBid = csSettings.csMedColorBid || "#ef4444";
        const csMedColorAsk = csSettings.csMedColorAsk || "#10b981";
        const csMedOpacity = typeof csSettings.csMedOpacity === "number" ? csSettings.csMedOpacity : 0.70;
        
        // Large Filter
        const csLargeMinVolume = typeof csSettings.csLargeMinVolume === "number" ? csSettings.csLargeMinVolume : 500;
        const csLargeMinSize = typeof csSettings.csLargeMinSize === "number" ? csSettings.csLargeMinSize : 10;
        const csLargeMaxSize = typeof csSettings.csLargeMaxSize === "number" ? csSettings.csLargeMaxSize : 20;
        const csLargeShape = csSettings.csLargeShape || "rhombus";
        const csLargeColorBid = csSettings.csLargeColorBid || "#f43f5e";
        const csLargeColorAsk = csSettings.csLargeColorAsk || "#34d399";
        const csLargeOpacity = typeof csSettings.csLargeOpacity === "number" ? csSettings.csLargeOpacity : 0.90;

        const sortedCells = [...candleCells].sort((a, b) => b.price - a.price);
        const K = Math.max(1, Math.min(csMergeLevels, sortedCells.length));

        for (let i = 0; i <= sortedCells.length - K; i++) {
          let sumVolume = 0;
          let sumBid = 0;
          let sumAsk = 0;
          
          for (let j = 0; j < K; j++) {
            const cell = sortedCells[i + j];
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
          
          let matchedFilter: "large" | "medium" | null = null;
          
          if (sumVolume >= csLargeMinVolume) {
            matchedFilter = "large";
          } else if (sumVolume >= csMedMinVolume && sumVolume <= csMedMaxVolume) {
            matchedFilter = "medium";
          }
          
          if (!matchedFilter) continue;
          
          let color = "";
          let shape: "circle" | "square" | "rhombus" = "circle";
          let opacity = 1.0;
          let size = 8;
          
          if (matchedFilter === "large") {
            color = isBidDominant ? csLargeColorBid : csLargeColorAsk;
            shape = csLargeShape as "circle" | "square" | "rhombus";
            opacity = csLargeOpacity;
            
            const range = csLargeMinVolume * 2;
            const ratio = range > 0 ? Math.min(1.0, (sumVolume - csLargeMinVolume) / range) : 0;
            size = csLargeMinSize + ratio * (csLargeMaxSize - csLargeMinSize);
          } else {
            color = isBidDominant ? csMedColorBid : csMedColorAsk;
            shape = csMedShape as "circle" | "square" | "rhombus";
            opacity = csMedOpacity;
            
            const range = csMedMaxVolume - csMedMinVolume;
            const ratio = range > 0 ? Math.min(1.0, (sumVolume - csMedMinVolume) / range) : 0;
            size = csMedMinSize + ratio * (csMedMaxSize - csMedMinSize);
          }
          
          const centerX = x + candleWidth / 2;
          const firstCellY = priceToY(sortedCells[i].price);
          const lastCellY = priceToY(sortedCells[i + K - 1].price);
          const centerY = (firstCellY + lastCellY) / 2;
          
          ctx.save();
          ctx.fillStyle = color;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          
          if (shape === "square") {
            ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
            ctx.fill();
            ctx.strokeStyle = isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (shape === "rhombus") {
            ctx.moveTo(centerX, centerY - size / 2);
            ctx.lineTo(centerX + size / 2, centerY);
            ctx.lineTo(centerX, centerY + size / 2);
            ctx.lineTo(centerX - size / 2, centerY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            // circle
            ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      ctx.restore(); // Restore context from candlestick main chart area clipping

      // C. Bottom Delta Sub-panel drawing
      if (activeIndicators.delta) {
        ctx.save();
        ctx.translate(0, deltaTopY);

        const deltaMidY = deltaPanelHeight / 2;
        const maxBarScaledHeight = deltaPanelHeight * 0.35;

        // Axis
        ctx.beginPath();
        ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 0.8;
        ctx.moveTo(x, deltaMidY);
        ctx.lineTo(x + candleWidth, deltaMidY);
        ctx.stroke();

        const barHeight = Math.max(2, (Math.abs(candle.delta) / zoomedMaxCandleDelta) * maxBarScaledHeight);
        const barY = candle.delta >= 0 ? deltaMidY - barHeight : deltaMidY;

        // Draw Delta volume bar
        ctx.fillStyle = candle.delta >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)";
        ctx.strokeStyle = candle.delta >= 0 ? "rgba(16, 185, 129, 0.85)" : "rgba(244, 63, 94, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.fillRect(x + 4, barY, candleWidth - 8, barHeight);
        ctx.strokeRect(x + 4, barY, candleWidth - 8, barHeight);

        // Delta quantity text label
        if (candleWidth >= 45) {
          ctx.font = "bold 8.5px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = candle.delta >= 0 ? (isLight ? "#047857" : "#10b981") : (isLight ? "#be123c" : "#f43f5e");
          const lblY = candle.delta >= 0 ? deltaMidY - barHeight - 4 : deltaMidY + barHeight + 11;
          const deltaText = (candle.delta >= 0 ? "+" : "") + candle.delta.toFixed(0) + "K";
          ctx.fillText(deltaText, x + candleWidth / 2, lblY);
        }
        ctx.restore();
      }
    }

    // 5. Drawing Cumulative Volume Delta (CVD) trend line
    if (activeIndicators.cvd && cumulativeDeltaPoints.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(margin.left, cvdTopY, scrollWidth - margin.left + 50, cvdPanelHeight);
      ctx.clip();
      ctx.translate(0, cvdTopY);

      // CVD subchart horizontal reference axis (mid-line)
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(margin.left, cvdPanelHeight / 2);
      ctx.lineTo(scrollWidth, cvdPanelHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      let pathStarted = false;
      const cvdStartIdx = Math.max(0, startIdx - 1);
      const cvdEndIdx = Math.min(cumulativeDeltaPoints.length - 1, endIdx + 1);
      for (let idx = cvdStartIdx; idx <= cvdEndIdx; idx++) {
        const p = cumulativeDeltaPoints[idx];
        const cy = getCvdY(p.value, cvdPanelHeight);
        if (!pathStarted) {
          ctx.moveTo(p.cx, cy);
          pathStarted = true;
        } else {
          ctx.lineTo(p.cx, cy);
        }
      }

      // Add purple glowing effect
      ctx.shadowColor = isLight ? "rgba(124, 58, 237, 0.4)" : "rgba(192, 132, 252, 0.8)";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = isLight ? "#7c3aed" : "#c084fc";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow
      ctx.restore();
    }

    ctx.restore(); // Undoes translation of -visibleScrollLeft for viewport-wide elements

    // 5.5 Draw the solid timeline footer strip and time axis labels on top of everything else (to hide overlapping candles/wicks)
    ctx.save();
    ctx.fillStyle = isLight ? "#f1f5f9" : "#090b12";
    // We fill the entire bottom margin (timeline section) as a solid background to cover any overflowed elements from candles
    ctx.fillRect(0, totalSvgHeight - margin.bottom, viewportWidth, margin.bottom);
    
    ctx.beginPath();
    ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.0;
    ctx.moveTo(0, totalSvgHeight - margin.bottom);
    ctx.lineTo(viewportWidth, totalSvgHeight - margin.bottom);
    ctx.stroke();
    ctx.restore();

    // Re-apply translation to draw the horizontal time axis labels at scrolled positions correctly
    ctx.save();
    ctx.translate(-visibleScrollLeft, 0);

    // Now draw the horizontal time axis labels for visible candles cleanly on top of this background
    for (let cIdx = startIdx; cIdx <= endIdx; cIdx++) {
      const candle = candles[cIdx];
      const x = margin.left + cIdx * (candleWidth + candleSpacing);
      const hoveredCandleIdx = crosshair
        ? Math.floor(((crosshair.x + visibleScrollLeft) - margin.left) / (candleWidth + candleSpacing))
        : -1;
      const isHovered = crosshair && cIdx === hoveredCandleIdx;

      const timeStr = new Date(candle.timestamp).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

      ctx.save();
      if (isHovered) {
        ctx.font = "bold 9px 'Inter', sans-serif";
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
        ctx.font = "bold 9px 'Inter', sans-serif";
        ctx.fillStyle = "#475569";
        ctx.textAlign = "center";
        ctx.fillText(timeStr, x + candleWidth / 2, totalSvgHeight - margin.bottom + 16);
      }
      ctx.restore();
    }

    ctx.restore(); // Undoes translation for the label drawing

    // 6. Draw Crosshair cursor lines
    if (crosshair) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = isLight ? "rgba(100, 116, 139, 0.6)" : "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);

      // Horizontal crosshair
      ctx.moveTo(margin.left, crosshair.y);
      ctx.lineTo(viewportWidth, crosshair.y);

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
    zoomedMaxCandleDelta,
    maxCumDeltaVal,
    minCumDeltaVal,
    zoomedCvdMax,
    zoomedCvdMin,
    zoomedCvdDeltaRange,
    cvdCenterVal,
    deltaScale,
    cvdScale,
    profileBuckets,
    maxProfileVol,
    profileBucketSize,
    isDetailedMode,
    isLight,
    activePair.price,
    activePair.priceStep,
    visibleScrollLeft,
    visibleClientWidth
  ]);

  return (
    <div className={`rounded-2xl overflow-hidden flex flex-col flex-1 shadow-2xl relative border transition-all duration-300 ${
      isLight ? "bg-white border-slate-200" : "liquid-glass-card border-none"
    }`}>
      {/* Chart Tools Header */}
      <div className={`px-5 py-1.5 flex items-center justify-between z-20 backdrop-blur-md border-b transition-all duration-300 ${
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
          onScroll={(e) => {
            setVisibleScrollLeft(e.currentTarget.scrollLeft);
            setVisibleClientWidth(e.currentTarget.clientWidth);
          }}
          className={`flex-1 overflow-x-auto overflow-y-hidden select-none terminal-grid relative transition-all duration-300 ${
            isLight ? "bg-[#f8fafc]" : "bg-[#06080f]"
          } ${isDraggingTimeScale ? "cursor-ew-resize" : (isDragging ? "cursor-grabbing" : "cursor-grab")}`}
          style={{ scrollBehavior: "auto" }}
        >
          {candles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#06080f]/80 z-25">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <>
              {/* Dummy scroll spacer to enable native scrollbar and wheel scroll dynamics */}
              <div style={{ width: `${scrollWidth}px`, height: "1px", pointerEvents: "none" }} />
              
              {/* Absolutely positioned canvas that stays in view and draws only-visible content */}
              <canvas
                ref={canvasRef}
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={handleSvgMouseLeave}
                className="sticky left-0 top-0 block z-10"
              />
            </>
          )}
        </div>

        {/* Dynamic Vector floating Watermark Overlay */}
        <div 
          className="absolute right-[106px] pointer-events-none select-none z-20 opacity-30 sm:opacity-40 transition-all duration-300 flex items-center gap-1.5"
          style={{ bottom: `${margin.bottom + deltaHeightTotal + cvdHeightTotal + 16}px` }}
        >
          <div className="w-5 h-5 rounded bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow">
            <Layers className="w-3 h-3 text-slate-955" strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-black tracking-wider uppercase font-sans ${isLight ? "text-slate-800" : "text-slate-100"}`}>
            PRO<span className={isLight ? "text-amber-600" : "text-amber-400"}>CLUSTER</span>
          </span>
        </div>

      {/* Fixed Price Scale Panel on the Right */}
      <div
        onWheel={(e) => {
          e.preventDefault();
          setVerticalScale(prev => {
            const delta = e.deltaY;
            const direction = Math.sign(delta);
            if (direction === 0) return prev;
            const multiplier = direction < 0 ? 1.15 : 0.85;
            const next = prev * multiplier;
            return Math.min(2000.0, Math.max(0.1, next));
          });
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return; // Only left-click
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickY = e.clientY - rect.top;

          if (activeIndicators.delta && clickY >= deltaTopY && clickY < cvdTopY) {
            setIsDraggingDeltaScale(true);
            startDeltaScaleYRef.current = e.clientY;
            startDeltaScaleRef.current = deltaScale;
          } else if (activeIndicators.cvd && clickY >= cvdTopY) {
            setIsDraggingCvdScale(true);
            startCvdScaleYRef.current = e.clientY;
            startCvdScaleRef.current = cvdScale;
          } else {
            setIsDraggingPriceScale(true);
            startPriceScaleYRef.current = e.clientY;
            startVerticalScaleRef.current = verticalScale;
          }
        }}
        className={`w-[90px] flex-none border-l select-none transition-all duration-300 relative flex flex-col justify-between cursor-ns-resize ${
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
                  fontSize="10.5"
                  fontFamily="'Inter', -apple-system, sans-serif"
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
                    y={activePriceY + 4}
                    fill={isLight ? "#ffffff" : "#010409"}
                    fontSize="9.5"
                    fontFamily="'Inter', -apple-system, sans-serif"
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

          {/* Panel Dividers for right pricing panel */}
          {(activeIndicators.delta || activeIndicators.cvd) && (
            <line
              x1={0}
              y1={margin.top + chartHeight}
              x2={90}
              y2={margin.top + chartHeight}
              stroke={isLight ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.16)"}
              strokeWidth="1"
            />
          )}
          {activeIndicators.delta && activeIndicators.cvd && (
            <line
              x1={0}
              y1={deltaTopY + deltaPanelHeight + panelGap / 2}
              x2={90}
              y2={deltaTopY + deltaPanelHeight + panelGap / 2}
              stroke={isLight ? "rgba(148, 163, 184, 0.35)" : "rgba(255, 255, 255, 0.16)"}
              strokeWidth="1"
            />
          )}

          {/* Delta subchart Y-axis labels */}
          {activeIndicators.delta && (
            <g key="delta-panel-ticks">
              {/* Top Tick */}
              <text
                x={8}
                y={deltaTopY + deltaPanelHeight * 0.15 + 4}
                fill={isLight ? "#047857" : "#10b981"}
                fontSize="9"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="bold"
              >
                +{zoomedMaxCandleDelta.toFixed(1)}K
              </text>
              {/* Mid Tick */}
              <text
                x={8}
                y={deltaTopY + deltaPanelHeight / 2 + 4}
                fill={isLight ? "#475569" : "#94a3b8"}
                fontSize="9"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="bold"
              >
                0.0K
              </text>
              {/* Bottom Tick */}
              <text
                x={8}
                y={deltaTopY + deltaPanelHeight * 0.85 + 4}
                fill={isLight ? "#be123c" : "#f43f5e"}
                fontSize="9"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="bold"
              >
                -{zoomedMaxCandleDelta.toFixed(1)}K
              </text>
            </g>
          )}

          {/* CVD subchart Y-axis labels */}
          {activeIndicators.cvd && (
            <g key="cvd-panel-ticks">
              {/* Top Tick */}
              <text
                x={8}
                y={cvdTopY + cvdPanelHeight * 0.15 + 4}
                fill={isLight ? "#7c3aed" : "#c084fc"}
                fontSize="9"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="bold"
              >
                +{zoomedCvdMax.toFixed(1)}K
              </text>
              {/* Mid Tick */}
              <text
                x={8}
                y={cvdTopY + cvdPanelHeight / 2 + 4}
                fill={isLight ? "#475569" : "#94a3b8"}
                fontSize="9"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="bold"
              >
                {cvdCenterVal.toFixed(1)}K
              </text>
              {/* Bottom Tick */}
              <text
                x={8}
                y={cvdTopY + cvdPanelHeight * 0.85 + 4}
                fill={isLight ? "#7c3aed" : "#c084fc"}
                fontSize="9"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="bold"
              >
                {zoomedCvdMin.toFixed(1)}K
              </text>
            </g>
          )}

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
                y={crosshair.y + 4}
                fill="#ffffff"
                fontSize="9.5"
                fontFamily="'Inter', -apple-system, sans-serif"
                fontWeight="black"
                textAnchor="start"
              >
                ${crosshair.price.toLocaleString(undefined, { minimumFractionDigits: activePair.priceStep < 0.1 ? 3 : 1 })}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Absolute Pinned Indicators Control Overlays (Top-right of subcharts) */}
      {activeIndicators.delta && (
        <div 
          className="absolute z-30 flex items-center gap-2 px-3 py-1 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-300 select-none"
          style={{
            top: `${deltaTopY + 6}px`,
            right: "100px", // Pinned just to the left of the 90px price scale panel
            backgroundColor: isLight ? "rgba(241, 245, 249, 0.9)" : "rgba(15, 23, 42, 0.75)",
            borderColor: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Label / Dynamic value indicator */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider">
            <span className={isLight ? "text-slate-800" : "text-white"}>DELTA</span>
            <span className={hoveredCandle ? (hoveredCandle.delta >= 0 ? "text-emerald-500 font-extrabold" : "text-rose-500 font-extrabold") : "text-slate-500"}>
              {deltaValueText}
            </span>
          </div>

          <div className={`w-[1px] h-3 ${isLight ? "bg-slate-300" : "bg-white/10"}`} />

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleIndicator?.("delta")}
              className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${
                isLight 
                  ? "hover:bg-slate-200 text-slate-500 hover:text-slate-800" 
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
              title="Hide Delta"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onShowIndicatorsSettings}
              className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${
                isLight 
                  ? "hover:bg-slate-200 text-slate-500 hover:text-slate-800" 
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
              title="Delta Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onRemoveIndicator?.("delta")}
              className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${
                isLight 
                  ? "hover:bg-slate-300 hover:text-rose-600 text-slate-500" 
                  : "hover:bg-rose-500/20 hover:text-rose-450 text-slate-400"
              }`}
              title="Remove Delta Overlay"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {activeIndicators.cvd && (
        <div 
          className="absolute z-30 flex items-center gap-2 px-3 py-1 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-300 select-none"
          style={{
            top: `${cvdTopY + 6}px`,
            right: "100px",
            backgroundColor: isLight ? "rgba(241, 245, 249, 0.9)" : "rgba(15, 23, 42, 0.75)",
            borderColor: isLight ? "rgba(203, 213, 225, 0.8)" : "rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Label / Dynamic value indicator */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider">
            <span className={isLight ? "text-slate-800" : "text-white"}>CVD</span>
            <span className={hoveredCandleIdx >= 0 && hoveredCandleIdx < cumulativeDeltaPoints.length ? "text-purple-400 font-extrabold" : "text-slate-500"}>
              {cvdValueText}
            </span>
          </div>

          <div className={`w-[1px] h-3 ${isLight ? "bg-slate-300" : "bg-white/10"}`} />

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleIndicator?.("cvd")}
              className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${
                isLight 
                  ? "hover:bg-slate-200 text-slate-500 hover:text-slate-800" 
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
              title="Hide CVD"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onShowIndicatorsSettings}
              className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${
                isLight 
                  ? "hover:bg-slate-200 text-slate-500 hover:text-slate-800" 
                  : "hover:bg-white/10 text-slate-400 hover:text-white"
              }`}
              title="CVD Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onRemoveIndicator?.("cvd")}
              className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${
                isLight 
                  ? "hover:bg-slate-300 hover:text-rose-600 text-slate-500" 
                  : "hover:bg-rose-500/20 hover:text-rose-450 text-slate-400"
              }`}
              title="Remove CVD"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Drag Handles / Resizing Splitters */}
      {activeIndicators.delta && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setResizingPanel("delta");
          }}
          className={`absolute left-0 right-0 z-40 cursor-ns-resize flex items-center justify-center group`}
          style={{
            top: `${deltaTopY - panelGap / 2}px`,
            height: "14px",
            transform: "translateY(-7px)"
          }}
          title="Drag to resize Delta Panel"
        >
          {/* Subtle colored horizontal line that lights up when hovered */}
          <div className="w-24 h-[3px] rounded-full bg-yellow-500/0 group-hover:bg-yellow-500/85 transition-all duration-200 shadow-md shadow-yellow-500/40" />
        </div>
      )}

      {activeIndicators.cvd && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setResizingPanel("cvd");
          }}
          className={`absolute left-0 right-0 z-40 cursor-ns-resize flex items-center justify-center group`}
          style={{
            top: `${cvdTopY - panelGap / 2}px`,
            height: "14px",
            transform: "translateY(-7px)"
          }}
          title="Drag to resize CVD Panel"
        >
          {/* Subtle colored horizontal line that lights up when hovered */}
          <div className="w-24 h-[3px] rounded-full bg-yellow-500/0 group-hover:bg-yellow-500/85 transition-all duration-200 shadow-md shadow-yellow-500/40" />
        </div>
      )}

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
