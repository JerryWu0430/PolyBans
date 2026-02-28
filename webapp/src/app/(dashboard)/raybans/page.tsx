import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RayBansPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ray-Bans Mode</h1>
      <Card>
        <CardHeader>
          <CardTitle>Video Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Video feed and analysis overlay will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
