import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetCurrentEcuData, 
  useGetVehicleStatus, 
  useSimulateEcuData,
  getGetCurrentEcuDataQueryKey,
  getGetVehicleStatusQueryKey
} from "@workspace/api-client-react";
import { Gauge } from "@/components/ui/gauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, CheckCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function DriverView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ecuAxiosResponse, isLoading: isLoadingEcu } = useGetCurrentEcuData();
  const { data: statusAxiosResponse, isLoading: isLoadingStatus } = useGetVehicleStatus();
  
  const ecuData = ecuAxiosResponse?.data;
  const statusData = statusAxiosResponse?.data;
  
  const simulateMutation = useSimulateEcuData();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetCurrentEcuDataQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetVehicleStatusQueryKey() });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleSimulate = () => {
    simulateMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Simulation triggered",
          description: "New ECU reading generated.",
        });
        queryClient.invalidateQueries({ queryKey: getGetCurrentEcuDataQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetVehicleStatusQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Simulation failed",
          description: err.message || "Could not generate reading.",
          variant: "destructive"
        });
      }
    });
  };

  const getStatusColor = (health?: string) => {
    switch (health) {
      case "healthy": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "warning": return "text-primary bg-primary/10 border-primary/20";
      case "critical": return "text-destructive bg-destructive/10 border-destructive/20";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  const getStatusIcon = (health?: string) => {
    switch (health) {
      case "healthy": return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "warning": return <AlertCircle className="w-8 h-8 text-primary" />;
      case "critical": return <AlertCircle className="w-8 h-8 text-destructive" />;
      default: return <Activity className="w-8 h-8 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase tracking-wider">Driver Display</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Live Telemetry</p>
        </div>
        <Button 
          onClick={handleSimulate} 
          disabled={simulateMutation.isPending}
          variant="outline"
          className="font-mono bg-card"
        >
          <Zap className="w-4 h-4 mr-2" />
          {simulateMutation.isPending ? "Simulating..." : "Simulate Reading"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={cn("col-span-1 md:col-span-4 border-2", getStatusColor(statusData?.overallHealth))}>
          <CardContent className="p-6 flex items-center gap-6">
            {getStatusIcon(statusData?.overallHealth)}
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-muted-foreground">System Status</h2>
              <p className="text-3xl font-mono font-bold uppercase mt-1">
                {statusData?.overallHealth || "Unknown"}
              </p>
            </div>
            <div className="ml-auto flex gap-8">
              <div className="text-center">
                <p className="text-xs font-mono text-muted-foreground">Active Faults</p>
                <p className="text-2xl font-mono font-bold text-destructive">{statusData?.activeFaultCount || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-mono text-muted-foreground">Total Readings</p>
                <p className="text-2xl font-mono font-bold">{statusData?.totalReadings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {ecuData ? (
          <>
            <div className="col-span-1 md:col-span-2">
              <Gauge 
                title="Speed" 
                value={ecuData.speed} 
                unit="KM/H" 
                min={0} 
                max={240} 
                warningThreshold={120}
                criticalThreshold={160}
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Gauge 
                title="Engine RPM" 
                value={ecuData.rpm} 
                unit="RPM" 
                min={0} 
                max={8000} 
                warningThreshold={5500}
                criticalThreshold={6500}
              />
            </div>
            <Gauge 
              title="Engine Temp" 
              value={ecuData.engineTemp} 
              unit="°C" 
              min={50} 
              max={150} 
              warningThreshold={105}
              criticalThreshold={120}
            />
            <Gauge 
              title="Fuel Level" 
              value={ecuData.fuelLevel} 
              unit="%" 
              min={0} 
              max={100} 
              warningThreshold={20}
              criticalThreshold={10}
              isHighBad={false}
            />
            <Gauge 
              title="Battery" 
              value={ecuData.batteryVoltage} 
              unit="V" 
              min={9} 
              max={16} 
              warningThreshold={11.5}
              criticalThreshold={11}
              isHighBad={false}
            />
            <Gauge 
              title="Oil Pressure" 
              value={ecuData.oilPressure} 
              unit="PSI" 
              min={0} 
              max={100} 
              warningThreshold={25}
              criticalThreshold={15}
              isHighBad={false}
            />
          </>
        ) : (
          <div className="col-span-4 py-20 text-center text-muted-foreground font-mono">
            {isLoadingEcu ? "Loading telemetry..." : "No ECU data available."}
          </div>
        )}
      </div>
    </div>
  );
}
