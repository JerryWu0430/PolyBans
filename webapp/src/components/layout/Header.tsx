"use client";

import { ModeToggle } from "./ModeToggle";
import { Activity, Radio } from "lucide-react";

export function Header() {
  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-6">
      {/* Subtle gradient line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Center - Live indicator */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
          <Radio className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            System Ready
          </span>
        </div>
      </div>

      {/* Right - Controls */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 border border-border/50">
          <div className="w-1.5 h-1.5 rounded-full bg-chart-4 animate-pulse-live" />
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}
