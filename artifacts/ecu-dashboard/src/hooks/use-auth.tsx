import { createContext, useContext, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useRequestOtp, useVerifyOtp, useLogout } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  requestOtpMutation: ReturnType<typeof useRequestOtp>;
  verifyOtpMutation: ReturnType<typeof useVerifyOtp>;
  logoutMutation: ReturnType<typeof useLogout>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe();

  const requestOtpMutation = useRequestOtp({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "OTP Sent",
          description: data.data.message || "Please check your email for the code.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Request failed",
          description: error.response?.data?.error || "Could not process request",
          variant: "destructive",
        });
      },
    },
  });

  const verifyOtpMutation = useVerifyOtp({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getMe"] });
        toast({
          title: "Access Granted",
          description: "System authentication successful.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Verification failed",
          description: error.response?.data?.error || "Invalid or expired OTP",
          variant: "destructive",
        });
      },
    },
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(["getMe"], null);
      },
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user?.data || null,
        isLoading,
        error: error as Error | null,
        requestOtpMutation,
        verifyOtpMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
