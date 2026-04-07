import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetVehicleStatus, 
  useListDtcs,
  useGetHistory,
  useResolveDtc,
  useIngestEcuData,
  getGetVehicleStatusQueryKey,
  getListDtcsQueryKey,
  getGetHistoryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Info, Terminal, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MechanicView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: statusAxiosResponse } = useGetVehicleStatus();
  const { data: dtcsAxiosResponse } = useListDtcs({ active: true });
  const { data: historyAxiosResponse } = useGetHistory({ limit: 50 });
  
  const statusData = statusAxiosResponse?.data;
  const dtcs = dtcsAxiosResponse?.data;
  const history = historyAxiosResponse?.data;
  
  const resolveMutation = useResolveDtc();
  const ingestMutation = useIngestEcuData();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetVehicleStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListDtcsQueryKey({ active: true }) });
      queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey({ limit: 50 }) });
    }, 10000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleResolve = (id: string) => {
    resolveMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Fault Resolved", description: "DTC has been marked as resolved." });
        queryClient.invalidateQueries({ queryKey: getListDtcsQueryKey({ active: true }) });
        queryClient.invalidateQueries({ queryKey: getGetVehicleStatusQueryKey() });
      }
    });
  };

  const handleTestIngest = () => {
    ingestMutation.mutate({
      data: {
        speed: 120 + Math.random() * 20,
        rpm: 3000 + Math.random() * 1000,
        engineTemp: 90 + Math.random() * 10,
        fuelLevel: 50,
        batteryVoltage: 13.8 + Math.random() * 0.5,
        throttlePosition: 40 + Math.random() * 20,
        coolantTemp: 85 + Math.random() * 10,
        oilPressure: 40 + Math.random() * 5
      }
    }, {
      onSuccess: () => {
        toast({ title: "Data Ingested", description: "Manual telemetry point successfully sent." });
        queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey({ limit: 50 }) });
      }
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      case "warning": return "bg-primary text-primary-foreground hover:bg-primary/90";
      default: return "bg-blue-500 text-white hover:bg-blue-600";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertCircle className="w-4 h-4" />;
      case "warning": return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const chartData = Array.isArray(history) ? [...history].reverse().map(h => ({
    ...h,
    time: format(new Date(h.createdAt || Date.now()), "HH:mm:ss")
  })) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-wider">Mechanic Diagnostics</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Deep System Analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 md:col-span-1 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Fault Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <span className="font-mono text-destructive font-bold">Critical</span>
              <span className="font-mono text-xl text-destructive">{statusData?.criticalFaultCount || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-primary/10 border border-primary/20">
              <span className="font-mono text-primary font-bold">Warning</span>
              <span className="font-mono text-xl text-primary">{statusData?.warningFaultCount || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-md bg-muted border border-border">
              <span className="font-mono text-muted-foreground font-bold">Total Readings</span>
              <span className="font-mono text-xl">{statusData?.totalReadings || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Active Diagnostic Trouble Codes (DTC)</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(dtcs) && dtcs.length > 0 ? (
              <div className="space-y-3">
                {dtcs.map(dtc => (
                  <div key={dtc.id} className="flex items-center justify-between p-4 rounded-md border border-border bg-muted/30">
                    <div className="flex items-center gap-4">
                      <Badge className={getSeverityColor(dtc.severity)}>
                        <span className="flex items-center gap-1">
                          {getSeverityIcon(dtc.severity)}
                          {dtc.severity.toUpperCase()}
                        </span>
                      </Badge>
                      <div>
                        <p className="font-mono font-bold text-lg">{dtc.code}</p>
                        <p className="text-sm text-muted-foreground">{dtc.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-mono text-muted-foreground uppercase">{dtc.system} System</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(dtc.detectedAt), "MMM d, HH:mm")}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleResolve(dtc.id)}
                        disabled={resolveMutation.isPending}
                        className="font-mono"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground font-mono flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-2 opacity-50" />
                No active diagnostic trouble codes found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Telemetry History (Last 50 Readings)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="engine" className="w-full">
              <TabsList className="mb-4 bg-muted">
                <TabsTrigger value="engine" className="font-mono">Engine Performance</TabsTrigger>
                <TabsTrigger value="temperature" className="font-mono">Thermals</TabsTrigger>
                <TabsTrigger value="systems" className="font-mono">Subsystems</TabsTrigger>
              </TabsList>
              
              <TabsContent value="engine" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <YAxis yAxisId="left" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'monospace' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="rpm" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2} name="RPM" />
                    <Line yAxisId="right" type="monotone" dataKey="speed" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} name="Speed (km/h)" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="temperature" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <YAxis stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'monospace' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <Line type="monotone" dataKey="engineTemp" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} name="Engine Temp (°C)" />
                    <Line type="monotone" dataKey="coolantTemp" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} name="Coolant Temp (°C)" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="systems" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="time" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <YAxis yAxisId="fuel" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} domain={[0, 100]} />
                    <YAxis yAxisId="battery" orientation="right" stroke="#666" tick={{fontFamily: 'monospace', fontSize: 10}} domain={[9, 16]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'monospace' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 12 }} />
                    <Line yAxisId="fuel" type="stepAfter" dataKey="fuelLevel" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} name="Fuel (%)" />
                    <Line yAxisId="battery" type="monotone" dataKey="batteryVoltage" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2} name="Battery (V)" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-4 border-dashed border-muted-foreground/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              ESP32 Integration Guide
            </CardTitle>
            <Button size="sm" variant="outline" className="font-mono text-xs" onClick={handleTestIngest} disabled={ingestMutation.isPending}>
              <Upload className="w-3 h-3 mr-2" />
              Test Ingest API
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 p-4 rounded-md border border-border overflow-x-auto">
              <pre className="text-xs font-mono text-green-400">
{`// Example Arduino/ESP32 Code for sending telemetry
#include <WiFi.h>
#include <HTTPClient.h>

void sendTelemetry() {
  HTTPClient http;
  // Replace with your actual deployed URL
  http.begin("https://your-app-url.replit.app/api/ecu/ingest");
  http.addHeader("Content-Type", "application/json");

  String payload = "{"
    "\\"speed\\": " + String(currentSpeed) + ","
    "\\"rpm\\": " + String(currentRpm) + ","
    "\\"engineTemp\\": " + String(engineTemp) + ","
    "\\"fuelLevel\\": " + String(fuelLevel) + ","
    "\\"batteryVoltage\\": " + String(batteryVolt) +
  "}";

  int httpResponseCode = http.POST(payload);
  http.end();
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
