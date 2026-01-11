import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { AuthService } from "../../services/authService";
import { Colors } from "../../constants/Colors";
import { StatusBar } from "expo-status-bar";
import { useUser } from "../../context/UserContext";

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!mobile || !password) {
      Alert.alert("Error", "Please enter both mobile number and password.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.login(mobile, password);

      if (result.success && result.user) {
        setUser(result.user);
        router.replace("/(app)");
      } else {
        Alert.alert("Login Failed", result.error || "Something went wrong.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Driver Portal</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput style={styles.input} placeholder="Enter your mobile number" placeholderTextColor="#666" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} autoCapitalize="none" />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#666" secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Contact Admin if you forgot your credentials</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  headerContainer: {
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: "#888",
    marginTop: 8,
    fontWeight: "500",
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1C1C1E",
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  button: {
    backgroundColor: "#0A84FF",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#0A84FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 12,
  },
});
