import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, History, Settings, ServerCrash, Server, LogOut, Zap, ZapOff, User, MapPin } from "lucide-react";
import { useHealthCheck, useSimulateEcuData, getGetCurrentEcuDataQueryKey, getGetVehicleStatusQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function Sidebar() {
  const [location] = useLocation();
  const { data: health, isError } = useHealthCheck();
  const { logoutMutation, user } = useAuth();
  const queryClient = useQueryClient();
  const simulateMutation = useSimulateEcuData();
  const [autoSimulate, setAutoSimulate] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoSimulate) {
      // Fire once immediately, then every 5 seconds
      simulateMutation.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentEcuDataQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetVehicleStatusQueryKey() });
        }
      });
      intervalRef.current = setInterval(() => {
        simulateMutation.mutate(undefined, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetCurrentEcuDataQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetVehicleStatusQueryKey() });
          }
        });
      }, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoSimulate]);

  const navItems = [
    { href: "/driver", label: "Driver View", icon: Activity },
    { href: "/mechanic", label: "Mechanic View", icon: LayoutDashboard },
    { href: "/history", label: "History Data", icon: History },
    { href: "/tracking", label: "Tracking", icon: MapPin },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-foreground tracking-wider uppercase">ECU DIAGNOSTICS</h1>
          <p className="text-[10px] text-muted-foreground font-mono">SYS-V 1.0.4</p>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Operator</p>
            <p className="text-xs font-medium text-foreground truncate" title={user.email}>{user.email}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
              location === item.href
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-border flex flex-col gap-3">
        {/* Auto-Simulate Toggle */}
        <button
          onClick={() => setAutoSimulate((v) => !v)}
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium w-full ${
            autoSimulate
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          }`}
        >
          {autoSimulate ? <Zap className="w-4 h-4 animate-pulse" /> : <ZapOff className="w-4 h-4" />}
          <span>{autoSimulate ? "Live Mode ON" : "Auto-Simulate"}</span>
          {autoSimulate && (
            <span className="ml-auto text-[10px] font-mono bg-primary/30 px-1.5 py-0.5 rounded">5s</span>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full"
        >
          <LogOut className="w-4 h-4" />
          {logoutMutation.isPending ? "Signing Out..." : "Sign Out"}
        </button>

        {/* Server Status */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {isError || health?.status !== 200 ? (
            <>
              <ServerCrash className="w-4 h-4 text-destructive" />
              <span className="text-destructive uppercase">Server Offline</span>
            </>
          ) : (
            <>
              <Server className="w-4 h-4 text-green-500" />
              <span className="text-green-500 uppercase">Server Online</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
