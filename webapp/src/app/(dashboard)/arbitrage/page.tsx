import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArbitragePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Arbitrage Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Market Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Real-time market trends will be displayed here.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Odds Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Odds comparison across platforms will be displayed here.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Gauge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sentiment analysis gauge will be displayed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
