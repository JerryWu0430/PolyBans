import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WebLivePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Web Live Mode</h1>
      <Card>
        <CardHeader>
          <CardTitle>Stream Input</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Platform selector and stream player will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
