import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { AuthService } from "../../services/authService";
import { Colors } from "../../constants/Colors";

export default function Index() {
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuthenticated = await AuthService.isAuthenticated();
      if (isAuthenticated) {
        router.replace("/(app)");
      } else {
        router.replace("/login");
      }
    } catch (e) {
      console.error(e);
      router.replace("/login");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.dark.background }}>
      <ActivityIndicator size="large" color={Colors.dark.primary} />
    </View>
  );
}
