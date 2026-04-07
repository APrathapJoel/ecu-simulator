import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Mail, KeyRound } from "lucide-react";

export default function LoginView() {
  const { requestOtpMutation, verifyOtpMutation } = useAuth();
  
  // Step 1: Request OTP
  const [email, setEmail] = useState("");
  // Step 2: Verify OTP
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    requestOtpMutation.mutate(
      { data: { email } },
      {
        onSuccess: () => {
          setStep("verify");
        }
      }
    );
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtpMutation.mutate({ data: { email, otpCode } });
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
            {step === "request" 
              ? "Enter your work email to receive a temporary access code."
              : "Enter the 6-digit access code sent to your email."}
          </CardDescription>
        </CardHeader>
        
        {step === "request" && (
          <form onSubmit={handleRequestOtp}>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="email" className="text-white/70">Operator Email</Label>
                <div className="relative relative-group">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 pl-10"
                    placeholder="operator@ecu-network.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden group hover:scale-[1.02] transition-transform"
                disabled={requestOtpMutation.isPending}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 group-hover:opacity-100 opacity-80 transition-opacity" />
                <span className="relative z-10 flex items-center justify-center font-semibold">
                  {requestOtpMutation.isPending ? (
                    <span className="animate-pulse">Transmitting...</span>
                  ) : (
                    "Request Access Code"
                  )}
                </span>
              </Button>
            </CardFooter>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-white/70">Access Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                  <Input
                    id="otp"
                    type="text"
                    name="otp"
                    className="bg-black/40 font-mono tracking-widest text-center border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 text-lg py-6"
                    placeholder="000000"
                    maxLength={6}
                    pattern="\\d{6}"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden group hover:scale-[1.02] transition-transform"
                disabled={verifyOtpMutation.isPending}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 group-hover:opacity-100 opacity-80 transition-opacity" />
                <span className="relative z-10 flex items-center justify-center font-semibold">
                  {verifyOtpMutation.isPending ? (
                    <span className="animate-pulse">Verifying...</span>
                  ) : (
                    "Verify Uplink"
                  )}
                </span>
              </Button>
              
              <div className="text-sm text-center">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="text-primary/70 hover:underline hover:text-primary focus:outline-none"
                >
                  Return to email entry
                </button>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
