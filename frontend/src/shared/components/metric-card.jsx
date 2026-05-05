import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? <Icon className="h-5 w-5 text-primary" /> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
