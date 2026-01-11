import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { UserProvider } from "../../context/UserContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Create a custom Dark Theme for that premium look
  const PremiumDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: "#121212", // Slightly deeper black
      card: "#1E1E1E",
      text: "#FFFFFF",
      primary: "#0A84FF",
    },
  };

  const [loaded] = useFonts({
    // Load fonts here if needed, keeping it simple for now
    // 'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || !loaded) {
      // Simplified for no fonts
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  return (
    <UserProvider>
      <ThemeProvider value={PremiumDarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          {/* Add other screens here */}
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </UserProvider>
  );
}
