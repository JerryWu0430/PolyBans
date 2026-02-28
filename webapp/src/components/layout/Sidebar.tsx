"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/raybans", label: "Ray-Bans", icon: "👓" },
  { href: "/weblive", label: "Web Live", icon: "🌐" },
  { href: "/arbitrage", label: "Arbitrage", icon: "📊" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden",
          collapsed ? "hidden" : "block lg:hidden"
        )}
        onClick={() => setCollapsed(true)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-sidebar transition-all duration-300",
          "lg:relative lg:z-auto",
          collapsed ? "-translate-x-full lg:w-16 lg:translate-x-0" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl">🎯</span>
            {!collapsed && <span>PolyBans</span>}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:block"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <span>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          "fixed left-4 top-4 z-30 rounded-md bg-sidebar p-2 shadow-md lg:hidden",
          !collapsed && "hidden"
        )}
      >
        ☰
      </button>
    </>
  );
}
