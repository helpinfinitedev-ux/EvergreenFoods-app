import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Calendar, Save, Trash2, Upload, User as UserIcon } from "lucide-react-native";
import { Colors } from "../../../constants/Colors";
import { AuthService, User } from "../../../services/authService";
import { DataService, Transaction } from "../../../services/dataService";
import { uploadImageFromUri } from "../../../utils/firebase";

export default function BuyEntry() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [kg, setKg] = useState("");
  const [itemType, setItemType] = useState<"Boiler" | "Chiller">("Boiler");
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // YYYY-MM-DD

  // History State
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      console.log(currentUser);
      setUser(currentUser);

      const historyData = await DataService.getBuyHistory();
      setHistory(historyData);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCameraLaunch = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setSlipImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!companyName || !kg || !slipImage) {
      Alert.alert("Missing Fields", "Please fill all fields and upload a slip photo.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload slip image to Firebase and get URL
      let imageUrl: string | undefined;
      if (slipImage) {
        try {
          imageUrl = await uploadImageFromUri(slipImage, "buy-slips");
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          Alert.alert("Warning", "Image upload failed. Entry will be saved without image.");
        }
      }

      const newEntry = await DataService.addBuyEntry({
        type: "BUY",
        amount: parseFloat(kg),
        unit: "KG",
        date: new Date().toISOString(), // Use current timestamp for precision
        companyName: companyName,
        itemType: itemType,
        imageUrl: imageUrl, // Firebase uploaded image URL
        details: `${itemType} from ${companyName}`,
      });

      // Refresh history and reset form
      const updatedHistory = await DataService.getBuyHistory();
      setHistory(updatedHistory);

      setCompanyName("");
      setKg("");
      setSlipImage(null);
      setItemType("Boiler");

      Alert.alert("Success", "Entry submitted successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to submit entry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }
  console.log(user);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Buy Entry</Text>

      {/* Form Section */}
      <View style={styles.card}>
        {/* Driver Name (Locked) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Driver Name</Text>
          <View style={[styles.inputContainer, styles.lockedInput]}>
            <UserIcon size={20} color="#666" style={styles.inputIcon} />
            <Text style={styles.lockedText}>{user?.name || "Unknown Driver"}</Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
          </View>
        </View>

        {/* Company Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Company Name</Text>
          <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Enter company name" placeholderTextColor="#666" />
        </View>

        {/* KG */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (KG)</Text>
          <TextInput style={styles.input} value={kg} onChangeText={setKg} placeholder="e.g. 1000.700" placeholderTextColor="#666" keyboardType="numeric" />
        </View>

        {/* Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={[styles.radioButton, itemType === "Boiler" && styles.radioButtonActive]} onPress={() => setItemType("Boiler")}>
              <Text style={[styles.radioText, itemType === "Boiler" && styles.radioTextActive]}>Boiler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.radioButton, itemType === "Chiller" && styles.radioButtonActive]} onPress={() => setItemType("Chiller")}>
              <Text style={[styles.radioText, itemType === "Chiller" && styles.radioTextActive]}>Chiller</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Slip Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Slip Upload</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleCameraLaunch}>
            {slipImage ? (
              <Image source={{ uri: slipImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Camera size={32} color="#0A84FF" />
                <Text style={styles.uploadText}>Take Photo (Camera Only)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Submit Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* History Section */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Last 7 Days History</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No recent entries.</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyCompany}>{item.companyName || "Unknown Company"}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.date).toLocaleDateString()} • {item.itemType || "N/A"}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>
                  {item.amount} {item.unit}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
  },
  lockedInput: {
    backgroundColor: "#252527",
    opacity: 0.8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    backgroundColor: "#2C2C2E",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  lockedText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "500",
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
  radioTextActive: {
    color: "#fff",
  },
  uploadButton: {
    height: 160,
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  uploadPlaceholder: {
    alignItems: "center",
    gap: 12,
  },
  uploadText: {
    color: "#0A84FF",
    fontSize: 14,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  submitButton: {
    backgroundColor: "#30D158",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  historyContainer: {
    marginTop: 32,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  historyItem: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyLeft: {
    flex: 1,
  },
  historyCompany: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  historyDate: {
    color: "#666",
    fontSize: 12,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyAmount: {
    color: "#30D158",
    fontSize: 16,
    fontWeight: "700",
  },
});
