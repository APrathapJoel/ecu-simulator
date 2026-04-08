import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Mail, KeyRound } from "lucide-react";

export default function LoginView() {
  const { requestRegisterMutation, loginMutation, user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  // Automatically push user into the dashboard ecosystem if they log in successfully
  useEffect(() => {
    if (user) {
      setLocation("/driver");
    }
  }, [user, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      requestRegisterMutation.mutate(
        { data: { email, password } },
        { onSuccess: () => setMode("login") }
      );
    } else {
      loginMutation.mutate({ data: { email, password } });
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent pointer-events-none" />
      
      <Card className="w-full max-w-md bg-secondary/30 backdrop-blur-xl border-white/10 z-10 p-2">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Shield className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Secure Uplink
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground/80">
            {mode === "register" 
              ? "Register a new operator profile."
              : "Enter your operator credentials to access the dashboard."}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="email" className="text-white/70">Operator Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 pl-10"
                  placeholder="operator@ecu-network.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="password" className="text-white/70">Secure Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <Input
                  id="password"
                  type="password"
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-4">
            <Button 
              type="submit" 
              className="w-full relative overflow-hidden group hover:scale-[1.02] transition-transform"
              disabled={requestRegisterMutation.isPending || loginMutation.isPending}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 group-hover:opacity-100 opacity-80 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center font-semibold">
                {requestRegisterMutation.isPending || loginMutation.isPending ? (
                  <span className="animate-pulse">Processing...</span>
                ) : mode === "login" ? "Sign In" : "Register"}
              </span>
            </Button>
            
            <div className="text-sm text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-primary/70 hover:underline hover:text-primary focus:outline-none"
              >
                {mode === "login" ? "Need an account? Register here." : "Already have an account? Sign in."}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
