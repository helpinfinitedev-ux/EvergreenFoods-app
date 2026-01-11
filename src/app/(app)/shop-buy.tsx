import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ShoppingCart, User, Check, AlertCircle } from "lucide-react-native";
import { Colors } from "../../../constants/Colors";
import { AuthService, User as AuthUser } from "../../../services/authService";
import { DataService, Transaction } from "../../../services/dataService";

export default function ShopBuyEntry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  console.log(user);

  // Form State
  const [shopName, setShopName] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [itemType, setItemType] = useState<"Boiler" | "Chiller" | null>(null);

  // History State
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      const historyData = await DataService.getShopBuyHistory();
      setHistory(historyData);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate Total Amount
  const totalAmount = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const p = parseFloat(price) || 0;
    return w * p;
  }, [weight, price]);

  const handleSubmit = async () => {
    // Validation Rules
    if (!shopName || shopName.length < 2) {
      Alert.alert("Validation", "Please enter a valid Shop Name (min 2 chars).");
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Validation", "Please enter a valid Weight (KG).");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert("Validation", "Please enter a valid Price per KG.");
      return;
    }
    if (!itemType) {
      Alert.alert("Validation", "Please select a Type (Boiler or Chiller).");
      return;
    }

    setSubmitting(true);
    try {
      await DataService.addShopBuyEntry({
        type: "SHOP_BUY",
        amount: parseFloat(weight),
        unit: "KG",
        date: new Date().toISOString(),
        companyName: shopName, // Reusing companyName for shop name
        itemType: itemType,
        rate: parseFloat(price),
        totalAmount: totalAmount,
        details: `Shop: ${shopName} - ${itemType}`,
      });

      Alert.alert("Success", "Shop Purchase submitted successfully!");

      // Reset Form but keep Driver info
      setShopName("");
      setWeight("");
      setPrice("");
      setItemType(null);

      // Refresh History
      const updatedHistory = await DataService.getShopBuyHistory();
      setHistory(updatedHistory);
    } catch (e) {
      Alert.alert("Error", "Failed to submit entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Shop Purchase Entry</Text>

      {/* Driver Info Box */}
      <View style={styles.driverInfoBox}>
        <View style={styles.driverRow}>
          <User size={16} color="#aaa" />
          <Text style={styles.driverLabel}>DRIVER:</Text>
          <Text style={styles.driverName}>{user?.name || "Unknown"}</Text>
        </View>
        <Text style={styles.driverMobile}>{user?.mobile || ""}</Text>
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.card}>
      {/* Shop Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Shop Name <Text style={styles.req}>*</Text>
        </Text>
        <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="Enter shop name" placeholderTextColor="#666" />
      </View>

      {/* Weight and Price Row */}
      <View style={styles.rowInput}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>
            Weight (KG) <Text style={styles.req}>*</Text>
          </Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="0.00" placeholderTextColor="#666" keyboardType="numeric" />
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>
            Price / KG <Text style={styles.req}>*</Text>
          </Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor="#666" keyboardType="numeric" />
        </View>
      </View>

      {/* Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Chicken Type <Text style={styles.req}>*</Text>
        </Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity style={[styles.radioButton, itemType === "Boiler" && styles.radioButtonActive]} onPress={() => setItemType("Boiler")}>
            <Text style={[styles.radioText, itemType === "Boiler" && styles.textWhite]}>Boiler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.radioButton, itemType === "Chiller" && styles.radioButtonActive]} onPress={() => setItemType("Chiller")}>
            <Text style={[styles.radioText, itemType === "Chiller" && styles.textWhite]}>Chiller</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Total Amount Display */}
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
        <Text style={styles.totalValue}>₹ {totalAmount?.toFixed(2)}</Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={[styles.submitButton, submitting && styles.disabledBtn]} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <ShoppingCart size={20} color="#fff" />
            <Text style={styles.submitText}>SUBMIT PURCHASE ENTRY</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Last 7 Days History</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No shop purchases found.</Text>
      ) : (
        history.map((item) => {
          console.log(item);
          const details = item?.details;

          const companyName = details?.replace("Shop:", "")?.split("-")[0]?.trim();
          const itemType = details?.replace("Shop:", "")?.split("-")[1]?.trim();
          return (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyMainText}>{user?.name}</Text>
                <Text style={styles.historyMainText}>{companyName}</Text>
                <Text style={styles.historySubText}>
                  {new Date(item.date).toLocaleDateString()} • {itemType}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.amountText}>{item.amount} KG</Text>
                <Text style={styles.priceText}>@ ₹{Number(item?.rate || 0).toFixed(2)}/kg</Text>
                <Text style={styles.totalText}>₹ {Number(item?.totalAmount || 0).toFixed(2)}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {renderHeader()}
          {renderForm()}
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
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  driverInfoBox: {
    backgroundColor: "#1C1C1E",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 8,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  driverLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
  },
  driverName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  driverMobile: {
    color: "#666",
    fontSize: 14,
    marginLeft: 24, // Align with name
  },
  card: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  inputGroup: {
    gap: 8,
  },
  rowInput: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },
  req: {
    color: "#FF453A",
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
    backgroundColor: "#30D158",
    borderColor: "#30D158",
  },
  radioText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
  },
  textWhite: {
    color: "#fff",
  },
  totalBox: {
    backgroundColor: "#252527",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  totalLabel: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "700",
  },
  totalValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#0A84FF", // Blue for Purchase
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  historyLeft: {
    flex: 1,
  },
  historyMainText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  historySubText: {
    color: "#888",
    fontSize: 12,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  amountText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  priceText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
  },
  totalText: {
    color: "#30D158",
    fontSize: 14,
    fontWeight: "600",
  },
});
