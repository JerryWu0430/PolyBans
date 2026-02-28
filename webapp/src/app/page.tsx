import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const modes = [
  {
    href: "/raybans",
    title: "Ray-Bans Mode",
    description: "AR glasses video feed with real-time analysis overlay",
    icon: "👓",
  },
  {
    href: "/weblive",
    title: "Web Live Mode",
    description: "Stream analysis from web platforms like Twitch and YouTube",
    icon: "🌐",
  },
  {
    href: "/arbitrage",
    title: "Arbitrage Dashboard",
    description: "Market trends, odds comparison, and sentiment analysis",
    icon: "📊",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-4xl font-bold">🎯 PolyBans</h1>
        <p className="text-muted-foreground">
          Polymarket analysis powered by Ray-Bans and Web Live streams
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-3">
        {modes.map((mode) => (
          <Card key={mode.href} className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{mode.icon}</span>
                {mode.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {mode.description}
              </p>
              <Button asChild className="w-full">
                <Link href={mode.href}>Enter</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
