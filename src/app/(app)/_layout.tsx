import { Stack } from "expo-router";
import { Colors } from "../../../constants/Colors";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        contentStyle: {
          backgroundColor: Colors.dark.background,
          paddingTop: 64,
        },
        headerShown: false,
      }}>
      <Stack.Screen name="index" options={{ title: "Dashboard", headerShown: false }} />
    </Stack>
  );
}
