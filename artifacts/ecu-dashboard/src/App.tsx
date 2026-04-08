import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/layout";
import NotFound from "@/pages/not-found";
import DriverView from "@/pages/driver-view";
import MechanicView from "@/pages/mechanic-view";
import HistoryView from "@/pages/history-view";
import TrackingView from "@/pages/tracking-view";
import LoginView from "@/pages/login-view";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// A wrapper component that checks authentication before rendering children
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/driver" />
      </Route>
      <Route path="/login" component={LoginView} />
      <Route path="/driver">
        <ProtectedRoute component={DriverView} />
      </Route>
      <Route path="/mechanic">
        <ProtectedRoute component={MechanicView} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={HistoryView} />
      </Route>
      <Route path="/tracking">
        <ProtectedRoute component={TrackingView} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
