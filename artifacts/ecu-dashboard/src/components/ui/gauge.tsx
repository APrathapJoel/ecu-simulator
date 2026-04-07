import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GaugeProps {
  title: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  criticalThreshold?: number;
  warningThreshold?: number;
  isHighBad?: boolean;
}

export function Gauge({
  title,
  value,
  unit,
  min = 0,
  max = 100,
  criticalThreshold,
  warningThreshold,
  isHighBad = true
}: GaugeProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  let status = "normal";
  if (criticalThreshold !== undefined) {
    if (isHighBad ? value >= criticalThreshold : value <= criticalThreshold) {
      status = "critical";
    } else if (warningThreshold !== undefined) {
      if (isHighBad ? value >= warningThreshold : value <= warningThreshold) {
        status = "warning";
      }
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "critical": return "text-destructive";
      case "warning": return "text-primary";
      default: return "text-green-500";
    }
  };


  const getGlowClass = () => {
    switch (status) {
      case "critical": return "pulse-glow";
      default: return "";
    }
  };

  return (
    <Card className="bg-card/40 backdrop-blur-md border-card-border overflow-hidden shadow-xl">
      <CardHeader className="pb-2 border-b border-border/20 bg-muted/10">
        <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex flex-col items-center justify-center relative min-h-[180px]">
        
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn("transition-all duration-700 ease-out", getStatusColor(), getGlowClass())}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-4xl font-sans font-bold tracking-tighter drop-shadow-lg", getStatusColor(), getGlowClass())}>
              {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : '0'}
            </span>
            <span className="text-xs font-mono text-muted-foreground mt-1">{unit}</span>
          </div>
        </div>
        
        <div className="w-full flex justify-between mt-4 px-4 font-mono">
          <span className="text-[10px] text-muted-foreground/70">{min}</span>
          <span className="text-[10px] text-muted-foreground/70">{max}</span>
        </div>
      </CardContent>
    </Card>
  );
}
