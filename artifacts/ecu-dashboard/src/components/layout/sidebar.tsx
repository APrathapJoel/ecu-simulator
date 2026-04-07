import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, History, Settings, ServerCrash, Server } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: health, isError } = useHealthCheck();

  const navItems = [
    { href: "/driver", label: "Driver View", icon: Activity },
    { href: "/mechanic", label: "Mechanic View", icon: LayoutDashboard },
    { href: "/history", label: "History Data", icon: History },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar h-full flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-foreground tracking-wider uppercase">ECU DIAGNOSTICS</h1>
          <p className="text-[10px] text-muted-foreground font-mono">SYS-V 1.0.4</p>
        </div>
      </div>
      
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

      <div className="p-4 border-t border-border">
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

