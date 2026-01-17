import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthService, User } from "../services/authService";
import { useRouter, usePathname } from "expo-router";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname(); // e.g. "/settings/profile"

  const router = useRouter();

  const refreshUser = async () => {
    try {
      if (pathname === "/login") return;
      const currentUser = await AuthService.getCurrentUser();
      console.log(currentUser);
      if (currentUser?.status === "BLOCKED") {
        await AuthService.logout();
        setUser(null);
        router.push("/login");
        return;
      }
      setUser(currentUser);
    } catch (error) {
      await AuthService.logout();
      setUser(null);
      router.push("/login");
      return;
    }
  };

  useEffect(() => {
    const interval = setInterval(
      async () => {
        await refreshUser();
      },
      1000 * 2 * 60,
    );
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Check for existing session on app load
    const initializeUser = async () => {
      setIsLoading(true);
      try {
        const token = await AuthService.getToken();
        if (token) {
          const currentUser = await AuthService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Failed to initialize user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  return <UserContext.Provider value={{ user, setUser, isLoading, refreshUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
