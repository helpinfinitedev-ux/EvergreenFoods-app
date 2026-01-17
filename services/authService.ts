import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { API_BASE_URL } from "../constants/Config";

const TOKEN_KEY = "driver_auth_token";

export interface User {
  id: string;
  mobile: string;
  name: string;
  role: string;
  status?: string;
}

export const AuthService = {
  login: async (mobile: string, password: string): Promise<{ success: boolean; error?: string; token?: string; user?: User }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { mobile, password });

      if (response.data.token) {
        await SecureStore.setItemAsync(TOKEN_KEY, response.data.token);
        // Optionally store user details if needed, or fetch me
        return { success: true, token: response.data.token, user: response.data.user };
      }
      return { success: false, error: "Login failed" };
    } catch (error: any) {
      console.error("Login error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || "Connection failed. Check internet.",
      };
    }
  },

  register: async (name: string, mobile: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/register`, { name, mobile, password });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || "Registration failed.",
      };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    // window.location.href = "/login";
  },

  getToken: async () => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  isAuthenticated: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    // Optional: verify token validity with backend info
    return !!token;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      console.log(token);
      if (!token) return null;

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.user || null;
    } catch (e) {
      throw new Error("Failed to get current user. User maybe active");
    }
  },
};
