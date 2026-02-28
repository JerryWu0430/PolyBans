"use client";

import { ModeToggle } from "./ModeToggle";
import { Activity, Radio } from "lucide-react";

export function Header() {
  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-6">
      {/* Subtle gradient line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            PolyBans
          </span>
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            Market Intelligence
          </span>
        </div>
      </div>

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
          <span className="text-xs font-mono text-muted-foreground">
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}
