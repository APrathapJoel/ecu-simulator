import { Sidebar } from "./sidebar";
import { useThemeProvider } from "@/hooks/use-theme";

export function Layout({ children }: { children: React.ReactNode }) {
  useThemeProvider();
  
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
