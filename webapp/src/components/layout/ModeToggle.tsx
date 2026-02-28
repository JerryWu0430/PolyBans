"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const modes = [
  { href: "/raybans", label: "Ray-Bans" },
  { href: "/weblive", label: "Web Live" },
];

export function ModeToggle() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {modes.map((mode) => {
        const isActive = pathname === mode.href;
        return (
          <Link
            key={mode.href}
            href={mode.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode.label}
          </Link>
        );
      })}
    </div>
  );
}
