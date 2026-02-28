"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Terminal as TerminalIcon, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const ASCII_BANNER = `██████╗  ██████╗ ██╗     ██╗   ██╗██████╗  █████╗ ███╗   ██╗███████╗
██╔══██╗██╔═══██╗██║     ╚██╗ ██╔╝██╔══██╗██╔══██╗████╗  ██║██╔════╝
██████╔╝██║   ██║██║      ╚████╔╝ ██████╔╝███████║██╔██╗ ██║███████╗
██╔═══╝ ██║   ██║██║       ╚██╔╝  ██╔══██╗██╔══██║██║╚██╗██║╚════██║
██║     ╚██████╔╝███████╗   ██║   ██████╔╝██║  ██║██║ ╚████║███████║
╚═╝      ╚═════╝ ╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝`;

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "system" | "ascii";
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: "ascii", content: ASCII_BANNER, timestamp: new Date() },
    { id: 1, type: "system", content: "", timestamp: new Date() },
    { id: 2, type: "output", content: "Type 'help' for commands.", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(3);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setLines((prev) => [
      ...prev,
      { id: idCounter.current++, type, content, timestamp: new Date() },
    ]);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const args = trimmed.split(" ");
    const command = args[0];

    switch (command) {
      case "help":
        addLine("output", "Available commands:");
        addLine("output", "  help     - Show this message");
        addLine("output", "  clear    - Clear terminal");
        addLine("output", "  status   - Show system status");
        addLine("output", "  markets  - List detected markets");
        addLine("output", "  search   - Search Polymarket");
        addLine("output", "  balance  - Check wallet balance");
        addLine("output", "  history  - Show command history");
        break;

      case "clear":
        setLines([]);
        break;

      case "status":
        addLine("output", "System Status:");
        addLine("output", "  Stream: ACTIVE");
        addLine("output", "  Vision: ENABLED");
        addLine("output", "  Markets: CONNECTED");
        addLine("output", "  Latency: 42ms");
        break;

      case "markets":
        addLine("output", "Fetching markets...");
        setTimeout(() => {
          addLine("output", "Use sidebar to view detected markets");
        }, 300);
        break;

      case "search":
        if (args.length < 2) {
          addLine("error", "Usage: search <query>");
        } else {
          const query = args.slice(1).join(" ");
          addLine("output", `Searching: "${query}"...`);
          setTimeout(() => {
            addLine("output", "Results will appear in sidebar");
          }, 500);
        }
        break;

      case "balance":
        addLine("output", "Wallet: 0x...3f4a");
        addLine("output", "USDC: $1,234.56");
        addLine("output", "Positions: 3 active");
        break;

      case "history":
        if (history.length === 0) {
          addLine("output", "No command history");
        } else {
          addLine("output", "Recent commands:");
          history.slice(-5).forEach((h, i) => {
            addLine("output", `  ${i + 1}. ${h}`);
          });
        }
        break;

      case "":
        break;

      default:
        addLine("error", `Unknown command: ${command}`);
        addLine("output", "Type 'help' for available commands");
    }
  }, [addLine, history]);

  const handleSubmit = useCallback((e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!input.trim()) return;

    addLine("input", `$ ${input}`);
    setHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);
    handleCommand(input);
    setInput("");
  }, [input, addLine, handleCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  }, [history, historyIndex]);

  return (
    <div
      className={cn(
        "flex flex-col border-t border-border/30 bg-background/50",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/30">
        <TerminalIcon className="h-3.5 w-3.5 text-chart-2" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Terminal
        </span>
      </div>

      {/* Output */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 font-mono text-xs space-y-0.5">
          {lines.map((line) =>
            line.type === "ascii" ? (
              <pre
                key={line.id}
                className="text-[5px] leading-[5px] text-chart-4 font-mono overflow-hidden"
                style={{ fontFamily: "'Lucida Console', Monaco, monospace" }}
              >
                {line.content}
              </pre>
            ) : (
              <div
                key={line.id}
                className={cn(
                  "leading-relaxed",
                  line.type === "input" && "text-chart-4",
                  line.type === "output" && "text-foreground/80",
                  line.type === "error" && "text-destructive",
                  line.type === "system" && "text-muted-foreground italic"
                )}
              >
                {line.content}
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 px-2 py-1.5 border-t border-border/30">
        <ChevronRight className="h-3 w-3 text-chart-4 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 bg-transparent text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
