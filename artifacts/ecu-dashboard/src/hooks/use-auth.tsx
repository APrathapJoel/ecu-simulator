import { createContext, useContext, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useRegister, useLogin, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  requestRegisterMutation: ReturnType<typeof useRegister>;
  loginMutation: ReturnType<typeof useLogin>;
  logoutMutation: ReturnType<typeof useLogout>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useGetMe();

  const requestRegisterMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Registration successful",
          description: data.data.message || "You can now log in.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Registration failed",
          description: error.response?.data?.error || "Could not process request",
          variant: "destructive",
        });
      },
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({
          title: "Access Granted",
          description: "System authentication successful.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error.response?.data?.error || "Invalid credentials",
          variant: "destructive",
        });
      },
    },
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        // Clear the cached user data with the correct query key, then redirect
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        queryClient.clear();
        setLocation("/login");
      },
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user?.data || null,
        isLoading,
        error: error as Error | null,
        requestRegisterMutation,
        loginMutation,
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
