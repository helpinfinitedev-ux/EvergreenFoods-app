import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Camera, MapPin, Scale, Trash2, Skull, Check, X } from "lucide-react-native";
import { Colors } from "../../../constants/Colors";
import { AuthService, User as AuthUser } from "../../../services/authService";
import { DataService, Transaction } from "../../../services/dataService";
import { uploadImageFromUri } from "../../../utils/firebase";

export default function WeightLossEntry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Active Tab: 'mortality' | 'waste'
  const [activeTab, setActiveTab] = useState<"mortality" | "waste">("mortality");

  // Mortality Form State
  const [mortalityKg, setMortalityKg] = useState("");
  const [mortalityType, setMortalityType] = useState<"Boiler" | "Chiller">("Boiler");
  const [mortalityImage, setMortalityImage] = useState<string | null>(null);
  const [mortalityLocation, setMortalityLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);

  // Waste Form State
  const [wasteKg, setWasteKg] = useState("");
  const [wasteType, setWasteType] = useState<"Boiler" | "Chiller">("Boiler");

  // History State
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      // Load history for current tab
      const historyData = await DataService.getWeightLossHistory(activeTab === "mortality" ? "MORTALITY" : "WASTE");
      setHistory(historyData);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    // 1. Permission Check
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

    if (cameraStatus !== "granted") {
      Alert.alert("Permission Denied", "Camera permission is required for Mortality entry.");
      return;
    }
    if (locationStatus !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required for Mortality entry.");
      return;
    }

    setIsCaptureLoading(true);
    try {
      // 2. Capture Image
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Corrected enum usage
        quality: 0.5,
        allowsEditing: false, // Ensure raw photo
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMortalityImage(result.assets[0].uri);

        // 3. Capture Location immediately after photo
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMortalityLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to capture photo or location.");
    } finally {
      setIsCaptureLoading(false);
    }
  };

  const handleSubmitMortality = async () => {
    if (!mortalityKg) {
      Alert.alert("Validation", "Please enter Weight (KG).");
      return;
    }
    if (!mortalityImage) {
      Alert.alert("Validation", "Photo proof is required.");
      return;
    }
    if (!mortalityLocation) {
      Alert.alert("Validation", "GPS Location is required. Please retake photo.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (mortalityImage) {
        try {
          imageUrl = await uploadImageFromUri(mortalityImage, "weight-loss");
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          Alert.alert("Error", "Image upload failed. Please try again.");
          return;
        }
      }
      await DataService.addWeightLossEntry({
        type: "WEIGHT_LOSS",
        subType: "MORTALITY",
        amount: parseFloat(mortalityKg),
        unit: "KG",
        date: new Date().toISOString(),
        itemType: mortalityType,
        imageUrl: mortalityImage,
        locationCoords: mortalityLocation,
        location: `${mortalityLocation.lat.toFixed(5)}, ${mortalityLocation.lng.toFixed(5)}`,
        details: `Mortality: ${mortalityType}`,
      });

      Alert.alert("Success", "Mortality entry submitted successfully!");
      setMortalityKg("");
      setMortalityImage(null);
      setMortalityLocation(null);
      loadInitialData(); // Refresh history
    } catch (e: any) {
      Alert.alert("Error", e?.error || "Failed to submit entry.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWaste = async () => {
    if (!wasteKg) {
      Alert.alert("Validation", "Please enter Weight (KG).");
      return;
    }

    setSubmitting(true);
    try {
      await DataService.addWeightLossEntry({
        type: "WEIGHT_LOSS",
        subType: "WASTE",
        amount: parseFloat(wasteKg),
        unit: "KG",
        date: new Date().toISOString(),
        itemType: wasteType,
        details: `Waste: ${wasteType}`,
      });

      Alert.alert("Success", "Waste entry submitted successfully!");
      setWasteKg("");
      loadInitialData(); // Refresh history
    } catch (e) {
      Alert.alert("Error", "Failed to submit entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Weight Loss Entry</Text>

      {/* Driver Info Box */}
      <View style={styles.driverInfoBox}>
        <Text style={styles.driverLabel}>DRIVER:</Text>
        <Text style={styles.driverName}>{user?.name || "Unknown"}</Text>
        <Text style={styles.driverMobile}>{user?.mobile || ""}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === "mortality" && styles.activeTab]} onPress={() => setActiveTab("mortality")}>
          <Skull size={20} color={activeTab === "mortality" ? "#fff" : "#888"} />
          <Text style={[styles.tabText, activeTab === "mortality" && styles.activeTabText]}>Mortality</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "waste" && styles.activeTab]} onPress={() => setActiveTab("waste")}>
          <Trash2 size={20} color={activeTab === "waste" ? "#fff" : "#888"} />
          <Text style={[styles.tabText, activeTab === "waste" && styles.activeTabText]}>Waste</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMortalityForm = () => (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>Mortality Details</Text>

      {/* Input KG */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Weight (KG)</Text>
        <TextInput style={styles.input} value={mortalityKg} onChangeText={setMortalityKg} placeholder="e.g. 10.500" placeholderTextColor="#666" keyboardType="numeric" />
      </View>

      {/* Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity style={[styles.radioButton, mortalityType === "Boiler" && styles.radioButtonActive]} onPress={() => setMortalityType("Boiler")}>
            <Text style={[styles.radioText, mortalityType === "Boiler" && styles.textWhite]}>Boiler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.radioButton, mortalityType === "Chiller" && styles.radioButtonActive]} onPress={() => setMortalityType("Chiller")}>
            <Text style={[styles.radioText, mortalityType === "Chiller" && styles.textWhite]}>Chiller</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera & Location Capture */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Proof & Location</Text>

        {mortalityImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: mortalityImage }} style={styles.previewImage} />
            <View style={styles.overlayInfo}>
              <View style={styles.badge}>
                <MapPin size={12} color="#fff" />
                <Text style={styles.badgeText}>{mortalityLocation ? `${mortalityLocation.lat.toFixed(4)}, ${mortalityLocation.lng.toFixed(4)}` : "Locating..."}</Text>
              </View>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleCapture}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture} disabled={isCaptureLoading}>
            {isCaptureLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Camera size={32} color="#fff" />
                <Text style={styles.captureText}>Take Photo (GPS Auto)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={[styles.submitButton, submitting && styles.disabledBtn]} onPress={handleSubmitMortality} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Check size={20} color="#fff" />
            <Text style={styles.submitText}>SUBMIT MORTALITY</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderWasteForm = () => (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>Waste Details</Text>

      {/* Input KG */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Weight (KG)</Text>
        <TextInput style={styles.input} value={wasteKg} onChangeText={setWasteKg} placeholder="e.g. 5.200" placeholderTextColor="#666" keyboardType="numeric" />
      </View>

      {/* Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Chicken Type</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity style={[styles.radioButton, wasteType === "Boiler" && styles.radioButtonActive]} onPress={() => setWasteType("Boiler")}>
            <Text style={[styles.radioText, wasteType === "Boiler" && styles.textWhite]}>Boiler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.radioButton, wasteType === "Chiller" && styles.radioButtonActive]} onPress={() => setWasteType("Chiller")}>
            <Text style={[styles.radioText, wasteType === "Chiller" && styles.textWhite]}>Chiller</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={[styles.submitButton, { backgroundColor: "#FF9F0A" }, submitting && styles.disabledBtn]} onPress={handleSubmitWaste} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Check size={20} color="#fff" />
            <Text style={styles.submitText}>SUBMIT WASTE</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Last 7 Days History ({activeTab === "mortality" ? "Mortality" : "Waste"})</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No records found.</Text>
      ) : (
        history.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyMainText}>{item.amount} KG</Text>
              <Text style={styles.historySubText}>
                {new Date(item.date).toLocaleDateString()} • {item.itemType}
              </Text>
            </View>
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.historyThumb} />}
            <View style={styles.historyRight}>
              <Text style={styles.timeText}>{new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {renderHeader()}

          {activeTab === "mortality" ? renderMortalityForm() : renderWasteForm()}

          {renderHistory()}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  driverInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
    gap: 8,
  },
  driverLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  driverName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  driverMobile: {
    color: "#666",
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#333",
  },
  tabText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 16,
  },
  activeTabText: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  sectionHeader: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#2C2C2E",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  radioGroup: {
    flexDirection: "row",
    gap: 12,
  },
  radioButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
  },
  radioButtonActive: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  radioText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
  },
  textWhite: {
    color: "#fff",
  },
  captureButton: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#252527",
    gap: 8,
  },
  captureText: {
    color: "#aaa",
    fontSize: 14,
  },
  previewContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
  },
  overlayInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(50, 215, 75, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  retakeBtn: {
    backgroundColor: "rgba(255, 69, 58, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#FF375F", // Pinkish red for Mortality
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  historyContainer: {
    marginTop: 8,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  historyItem: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  historyThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginHorizontal: 12,
    backgroundColor: "#333",
  },
  historyLeft: {
    flex: 1,
  },
  historyMainText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  historySubText: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  timeText: {
    color: "#666",
    fontSize: 12,
  },
});
