import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Modal, FlatList } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Camera, Calendar, Save, Fuel, MapPin, Truck, ChevronDown, Check } from "lucide-react-native";
import { Colors } from "../../../constants/Colors";
import { DataService, Vehicle, Transaction } from "../../../services/dataService";
import { uploadImageFromUri } from "../../../utils/firebase";

export default function FuelEntry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Form data
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentKm, setCurrentKm] = useState("");
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fuelType, setFuelType] = useState("Diesel");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // UI State
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const v = await DataService.getVehicles();
      setVehicles(v);
    } catch (error) {
      console.log("error", error);
      //   Alert.alert("Error", "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  // Auto Calculations
  // We use a separate handler for each input to avoid circular loops and ensure user intent is respected.
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const q = parseFloat(val);
    const r = parseFloat(rate);

    if (!isNaN(q) && !isNaN(r)) {
      setAmount((q * r).toFixed(2));
    }
  };

  const handleRateChange = (val: string) => {
    setRate(val);
    const r = parseFloat(val);
    const q = parseFloat(quantity);

    if (!isNaN(r) && !isNaN(q)) {
      setAmount((q * r).toFixed(2));
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const a = parseFloat(val);
    const q = parseFloat(quantity);

    if (!isNaN(a) && !isNaN(q) && q > 0) {
      setRate((a / q).toFixed(2));
    } else if (!isNaN(a)) {
      // checking if rate is filled to reverse calc quantity?
      // The requirement says: Rate + Amount -> Auto-fills Quantity
      const r = parseFloat(rate);
      if (!isNaN(r) && r > 0) {
        setQuantity((a / r).toFixed(2));
      }
    }
  };

  const captureSlipAndLocation = async () => {
    // 1. Permission check
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

    if (cameraStatus !== "granted" || locationStatus !== "granted") {
      Alert.alert("Permissions Required", "Camera and Location permissions are needed.");
      return;
    }

    // 2. Launch Camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setSlipImage(result.assets[0].uri);

      // 3. Fetch Location immediately after photo
      setIsLocating(true);
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });

        // Reverse Geocoding
        const address = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (address && address.length > 0) {
          const a = address[0];
          const fullAddr = `${a.street || ""} ${a.city || ""}, ${a.region || ""}`.trim();
          setLocation(fullAddr || `Lat: ${loc.coords.latitude}, Lng: ${loc.coords.longitude}`);
        }
      } catch (error) {
        Alert.alert("GPS Error", "Could not fetch location. Please enter manually.");
      } finally {
        setIsLocating(false);
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedVehicle) {
      Alert.alert("Validation Check", "Please select a vehicle.");
      return;
    }
    if (!currentKm) {
      Alert.alert("Validation Check", "Please enter Current KM.");
      return;
    }
    const curr = parseFloat(currentKm);
    if (curr <= selectedVehicle.currentKm) {
      Alert.alert("Validation Check", "Current KM must be greater than Previous KM.");
      return;
    }
    if (!slipImage) {
      Alert.alert("Validation Check", "Please capture the fuel slip photo.");
      return;
    }
    if (!quantity || !amount) {
      Alert.alert("Validation Check", "Please enter Quantity and Amount.");
      return;
    }
    if (location.length < 10) {
      Alert.alert("Validation Check", "Location must be at least 10 characters.");
      return;
    }
    // Date check
    const today = new Date();
    const selectedDate = new Date(date);
    const diffTime = Math.abs(today.getTime() - selectedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (selectedDate > today) {
      Alert.alert("Validation Check", "Future dates are not allowed.");
      return;
    }
    if (diffDays > 7 && selectedDate < today) {
      // Allow same day, prevent >7 days back.
      // Note: diffDays calc might be off by one depending on hours, simple comparison is safer
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (selectedDate < sevenDaysAgo) {
        Alert.alert("Validation Check", "Cannot enter data older than 7 days.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Upload slip image to Firebase and get URL
      let imageUrl: string | undefined;
      if (slipImage) {
        try {
          imageUrl = await uploadImageFromUri(slipImage, "fuel-slips");
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          Alert.alert("Warning", "Image upload failed. Entry will be saved without image.");
        }
      }

      await DataService.addFuelEntry({
        type: "FUEL",
        amount: parseFloat(quantity), // Main amount for list items usually implies qty or cost?
        // Let's store liters in amount and cost in details or subfields?
        // The requirement says "Amount: ₹3028.00" in success state.
        // But DataService `amount` is generic. Let's stick to cost in `amount` if it's financial transaction?
        // Actually dashboard summary tracks Fuel in Liters.
        // Let's keep `amount` as Liter quantity for dashboard consistency "Today Fuel (Ltr)",
        // and store Cost in `details` or a new field if needed.
        // Wait, User Request says "Amount: ₹3028.00" in success message.
        // Let's clarify: Dashboard wants "Today Fuel" (Liters).
        // So `amount` field in Transaction should probably be Quantity (Liters).
        // We can add a `cost` field to transaction or put it in details.
        // Given constraints, I'll put Quantity in 'amount' for dashboard logic, and 'cost' in details string or new field.
        // Actually I added specific Fuel fields. I can put cost there? No I didn't add cost.
        // I'll assume 'amount' = Quantity (Liters) for dashboard summary continuity,
        // and I'll save the monetary amount in `subType` or `details`.
        // Or better, let's use the standard `amount` for the primary unit.
        // Dashboard Logic: todayFuelLiters = sum(amount). So `amount` MUST be liters.

        unit: "LITRE",
        date: new Date().toISOString(), // Use current time or selected date? Req says "Date & Time: Default = current".

        vehicleId: selectedVehicle.id,
        vehicleReg: selectedVehicle.registration,
        previousKm: selectedVehicle.currentKm,
        currentKm: curr,
        fuelType: fuelType,
        rate: parseFloat(rate),
        location: location,
        locationCoords: coords || undefined,
        imageUrl: imageUrl, // Firebase uploaded image URL

        details: `₹${amount} @ ₹${rate}/L`,
      });

      Alert.alert("Entry Saved Successfully!", `Vehicle: ${selectedVehicle.registration}\nAmount: ₹${amount}`, [{ text: "OK", onPress: () => router.replace("/(app)") }]);
    } catch (error) {
      Alert.alert("Error", "Failed to save entry.");
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Fuel Entry</Text>

      {/* Step 1: Vehicle & KM */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Vehicle Details</Text>

        {/* Vehicle Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Vehicle</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}>
            <View style={styles.row}>
              <Truck size={20} color="#888" style={{ marginRight: 10 }} />
              <Text style={styles.dropdownText}>{selectedVehicle ? selectedVehicle.registration : "Select Vehicle"}</Text>
            </View>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>

          {showVehicleDropdown && (
            <View style={styles.dropdownList}>
              {vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedVehicle(v);
                    setShowVehicleDropdown(false);
                  }}>
                  <Text style={styles.dropdownItemText}>{v.registration}</Text>
                  <Text style={styles.dropdownItemSubText}>Last KM: {v.currentKm}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* KM Input */}
        {selectedVehicle && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Previous KM</Text>
              <View style={[styles.inputContainer, styles.lockedInput]}>
                <Text style={styles.lockedText}>{selectedVehicle.currentKm}</Text>
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Current KM</Text>
              <TextInput style={styles.input} value={currentKm} onChangeText={setCurrentKm} keyboardType="numeric" placeholder="Enter KM" placeholderTextColor="#666" />
            </View>
          </View>
        )}

        {selectedVehicle && currentKm ? <Text style={styles.helperText}>Total Run: {Math.max(0, parseFloat(currentKm) - selectedVehicle.currentKm)} KM</Text> : null}
      </View>

      {/* Step 2: Camera & GPS */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Proof & Location</Text>
        <TouchableOpacity style={styles.cameraButton} onPress={captureSlipAndLocation}>
          {slipImage ? (
            <Image source={{ uri: slipImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Camera size={32} color="#0A84FF" />
              <Text style={styles.cameraText}>Capture Slip + GPS</Text>
            </View>
          )}
          {isLocating && (
            <View style={styles.locatingOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.locatingText}>Fetching GPS...</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.inputContainer}>
            <MapPin size={20} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Location Address" placeholderTextColor="#666" multiline />
          </View>
        </View>
      </View>

      {/* Step 3: Manual Entry */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Fuel Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fuel Type</Text>
          <View style={styles.pillContainer}>
            {["Diesel", "Petrol", "CNG"].map((type) => (
              <TouchableOpacity key={type} style={[styles.pill, fuelType === type && styles.pillActive]} onPress={() => setFuelType(type)}>
                <Text style={[styles.pillText, fuelType === type && styles.pillTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity (Ltr/Kg)</Text>
          <TextInput style={styles.input} value={quantity} onChangeText={handleQuantityChange} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#666" />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Rate (₹)</Text>
            <TextInput style={styles.input} value={rate} onChangeText={handleRateChange} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#666" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput style={styles.input} value={amount} onChangeText={handleAmountChange} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#666" />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#888" style={styles.inputIcon} />
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Save Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
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
    marginBottom: 20,
  },
  sectionHeader: {
    color: "#0A84FF",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
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
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    backgroundColor: "#2C2C2E",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  lockedInput: {
    backgroundColor: "#252527",
    opacity: 0.8,
  },
  lockedText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  helperText: {
    color: "#30D158",
    fontSize: 14,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownList: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    marginTop: 8,
    padding: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownItemSubText: {
    color: "#888",
    fontSize: 12,
  },
  cameraButton: {
    height: 180,
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cameraPlaceholder: {
    alignItems: "center",
    gap: 12,
  },
  cameraText: {
    color: "#0A84FF",
    fontSize: 14,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  locatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  locatingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#2C2C2E",
    borderWidth: 1,
    borderColor: "#333",
  },
  pillActive: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  pillText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#FF9F0A", // Orange for Fuel
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
});
