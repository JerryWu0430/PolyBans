"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  className,
  strokeColor = "currentColor",
  strokeWidth = 1.5,
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const points = data.map((val, i) => {
      const x = padding + (i / (data.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((val - min) / range) * effectiveHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  }, [data, width, height]);

  if (!data || data.length < 2) {
    return null;
  }

  // Determine trend color
  const isUp = data[data.length - 1] >= data[0];
  const trendColor = strokeColor === "currentColor"
    ? isUp ? "#22c55e" : "#ef4444"
    : strokeColor;

  return (
    <svg
      width={width}
      height={height}
      className={cn("flex-shrink-0", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
