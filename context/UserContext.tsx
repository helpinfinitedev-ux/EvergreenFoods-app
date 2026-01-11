import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthService, User } from "../services/authService";

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

  const refreshUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
    }
  };

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
