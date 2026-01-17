// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator
// For physical device, use your machine's LAN IP (e.g., 192.168.1.X)
// export const API_BASE_URL = 'http://192.168.1.10:3000';

import { Platform } from "react-native";

const LOCALHOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
// export const API_BASE_URL = `https://evergreen-foods-backend.vercel.app`;
export const API_BASE_URL = "http://192.168.1.3:3000";
// export const API_BASE_URL = 'http://192.168.x.x:3000'; // Uncomment and set for physical device
