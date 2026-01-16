import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Calendar, Save, Trash2, Upload, User as UserIcon } from "lucide-react-native";
import { Colors } from "../../../constants/Colors";
import { AuthService, User } from "../../../services/authService";
import { Company, DataService, Transaction } from "../../../services/dataService";
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

  // Companies Dropdown State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [companyDropdownVisible, setCompanyDropdownVisible] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyPage, setCompanyPage] = useState(1);
  const [companyTotalPages, setCompanyTotalPages] = useState(1);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!companyDropdownVisible) return;
    const timeout = setTimeout(() => {
      fetchCompanies(1, companySearch, false);
      setCompanyPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [companySearch, companyDropdownVisible]);

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

  const fetchCompanies = async (pageToLoad: number, search: string, append: boolean) => {
    setCompanyLoading(true);
    try {
      const response = await DataService.getCompanies({ page: pageToLoad, name: search || undefined });
      const list = response.companies || [];
      setCompanies((prev) => (append ? [...prev, ...list] : list));
      setCompanyTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error("Failed to load companies", error);
      if (!append) setCompanies([]);
    } finally {
      setCompanyLoading(false);
    }
  };

  const openCompanyDropdown = () => {
    setCompanySearch(companyName);
    setCompanyDropdownVisible(true);
    fetchCompanies(1, companyName, false);
    setCompanyPage(1);
  };

  const handleLoadMoreCompanies = async () => {
    if (companyLoading || companyPage >= companyTotalPages) return;
    const nextPage = companyPage + 1;
    await fetchCompanies(nextPage, companySearch, true);
    setCompanyPage(nextPage);
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
        <TouchableOpacity style={styles.selectInput} onPress={openCompanyDropdown}>
          <Text style={[styles.selectText, !companyName && styles.placeholderText]}>{companyName || "Select company"}</Text>
        </TouchableOpacity>
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

      <Modal transparent visible={companyDropdownVisible} animationType="fade" onRequestClose={() => setCompanyDropdownVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Company</Text>
              <TouchableOpacity onPress={() => setCompanyDropdownVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalSearchInput}
                value={companySearch}
                onChangeText={setCompanySearch}
                placeholder="Search company..."
                placeholderTextColor="#666"
              />
            </View>

            <ScrollView style={styles.modalList}>
              {companyLoading && companies.length === 0 ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator color="#0A84FF" />
                </View>
              ) : companies.length === 0 ? (
                <Text style={styles.modalEmptyText}>No companies found.</Text>
              ) : (
                companies.map((company) => (
                  <TouchableOpacity
                    key={company.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setCompanyName(company.name);
                      setCompanyDropdownVisible(false);
                    }}>
                    <Text style={styles.modalItemText}>{company.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleLoadMoreCompanies}
                disabled={companyPage >= companyTotalPages || companyLoading}
                style={[styles.modalLoadMoreBtn, (companyPage >= companyTotalPages || companyLoading) && styles.modalLoadMoreBtnDisabled]}>
                {companyLoading && companies.length > 0 ? <ActivityIndicator color="#0A84FF" /> : <Text style={styles.modalLoadMoreText}>Load More</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  selectInput: {
    backgroundColor: "#2C2C2E",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  selectText: {
    color: "#fff",
    fontSize: 16,
  },
  placeholderText: {
    color: "#666",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 20,
  },
  modalSearchRow: {
    marginBottom: 12,
  },
  modalSearchInput: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalList: {
    marginBottom: 12,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  modalItemText: {
    color: "#fff",
    fontSize: 15,
  },
  modalEmptyText: {
    color: "#888",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalLoading: {
    paddingVertical: 20,
    alignItems: "center",
  },
  modalFooter: {
    alignItems: "center",
  },
  modalLoadMoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#2C2C2E",
  },
  modalLoadMoreBtnDisabled: {
    opacity: 0.5,
  },
  modalLoadMoreText: {
    color: "#0A84FF",
    fontSize: 13,
    fontWeight: "600",
  },
});
