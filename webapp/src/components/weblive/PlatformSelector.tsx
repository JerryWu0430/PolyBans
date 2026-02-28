"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StreamPlatform } from "@/lib/types/stream";

interface PlatformSelectorProps {
  value: Exclude<StreamPlatform, "raybans">;
  onChange: (platform: Exclude<StreamPlatform, "raybans">) => void;
}

const PLATFORMS = [
  { id: "youtube" as const, label: "YouTube", icon: "▶" },
  { id: "twitch" as const, label: "Twitch", icon: "📺" },
  { id: "x" as const, label: "X", icon: "𝕏" },
];

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as Exclude<StreamPlatform, "raybans">)}
    >
      <TabsList>
        {PLATFORMS.map((p) => (
          <TabsTrigger key={p.id} value={p.id} className="gap-1.5">
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
