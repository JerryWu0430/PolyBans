"use client";

import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "./ModeToggle";

interface HeaderProps {
  connected?: boolean;
}

export function Header({ connected = false }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-4">
        <Badge variant={connected ? "default" : "secondary"}>
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>
      <ModeToggle />
    </header>
  );
}
