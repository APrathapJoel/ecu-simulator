import { 
  useGetHistory, 
  useGetHistoryStats
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function HistoryView() {
  const { data: statsAxiosResponse } = useGetHistoryStats();
  const { data: historyAxiosResponse } = useGetHistory({ limit: 100 });
  
  const stats = statsAxiosResponse?.data;
  const history = historyAxiosResponse?.data;

  const renderStatCard = (title: string, statItem: any, unit: string) => {
    if (!statItem) return null;
    return (
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border">
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Min</p>
              <p className="font-mono font-bold">{statItem.min.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Avg</p>
              <p className="font-mono font-bold text-primary">{statItem.avg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Max</p>
              <p className="font-mono font-bold">{statItem.max.toFixed(1)}</p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2 font-mono">{unit}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-wider">Historical Data</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Telemetry Record & Aggregation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {renderStatCard("Speed", stats?.speed, "KM/H")}
        {renderStatCard("RPM", stats?.rpm, "RPM")}
        {renderStatCard("Engine Temp", stats?.engineTemp, "°C")}
        {renderStatCard("Fuel Level", stats?.fuelLevel, "%")}
        {renderStatCard("Battery", stats?.batteryVoltage, "V")}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Telemetry Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-mono text-xs">Timestamp</TableHead>
                  <TableHead className="font-mono text-xs">Source</TableHead>
                  <TableHead className="font-mono text-xs text-right">Speed</TableHead>
                  <TableHead className="font-mono text-xs text-right">RPM</TableHead>
                  <TableHead className="font-mono text-xs text-right">Temp</TableHead>
                  <TableHead className="font-mono text-xs text-right">Fuel</TableHead>
                  <TableHead className="font-mono text-xs text-right">Battery</TableHead>
                  <TableHead className="font-mono text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(history) && history.map((reading) => (
                  <TableRow key={reading.id} className="font-mono text-sm hover:bg-muted/30 border-b border-border/50">
                    <TableCell className="text-muted-foreground">
                      {format(new Date(reading.createdAt || Date.now()), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {reading.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(reading.speed || 0).toFixed(0)}</TableCell>
                    <TableCell className="text-right">{Number(reading.rpm || 0).toFixed(0)}</TableCell>
                    <TableCell className="text-right">{Number(reading.engineTemp || 0).toFixed(1)}°</TableCell>
                    <TableCell className="text-right">{Number(reading.fuelLevel || 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{Number(reading.batteryVoltage || 0).toFixed(1)}V</TableCell>
                    <TableCell className="text-center">
                      {reading.hasFault ? (
                        <Badge variant="destructive" className="text-[10px] uppercase">Fault</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 text-[10px] uppercase border-0">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!Array.isArray(history) || !history.length) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono">
                      No historical data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
