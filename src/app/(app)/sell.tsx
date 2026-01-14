import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { User, Plus, Search, FileText, Printer, Save, X, Check, AlertTriangle } from "lucide-react-native";
import { Colors } from "../../../constants/Colors";
import { AuthService, User as AuthUser } from "../../../services/authService";
import { DataService, Customer } from "../../../services/dataService";

export default function SellEntry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Stock State
  const [availableStock, setAvailableStock] = useState<number>(0);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [weight, setWeight] = useState("");
  const [weightInput, setWeightInput] = useState(""); // Temporary input before adding
  const [rate, setRate] = useState("");
  const [cash, setCash] = useState("");
  const [upi, setUpi] = useState("");

  // New Customer Form
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerBalance, setNewCustomerBalance] = useState("");

  // Date Time for Display
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadInitialData();
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadInitialData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      const customerList = await DataService.getCustomers();
      if (Array.isArray(customerList)) {
        setCustomers(customerList);
      }

      // Load live stock
      const stock = await DataService.getDriverStock();
      setAvailableStock(stock);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load data. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return [];
    return customers.filter((c) => (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (c.mobile || "").includes(searchQuery));
  }, [searchQuery, customers]);

  // Validation
  const isOverStock = useMemo(() => {
    const w = parseFloat(weight) || 0;
    // Float precision fix: 5000.0000001 > 5000
    return w > availableStock + 0.001;
  }, [weight, availableStock]);

  // Calculations
  const totalAmount = useMemo(() => {
    const w = parseFloat(weight) || 0;
    const r = parseFloat(rate) || 0;
    return w * r;
  }, [weight, rate]);

  const newBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    const prev = selectedCustomer.balance;
    const bill = totalAmount;
    const paidCash = parseFloat(cash) || 0;
    const paidUpi = parseFloat(upi) || 0;
    return +prev + bill - paidCash - paidUpi;
  }, [selectedCustomer, totalAmount, cash, upi]);

  const handleAddWeight = () => {
    const inputValue = parseFloat(weightInput) || 0;
    if (inputValue <= 0) return;

    const currentWeight = parseFloat(weight) || 0;
    const newWeight = currentWeight + inputValue;

    // Check if new weight would exceed available stock
    if (newWeight > availableStock + 0.001) {
      Alert.alert("Stock Limit", "Limit exceed ho gyi h");
      return;
    }

    setWeight(newWeight.toString());
    setWeightInput("");
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName || !newCustomerMobile) {
      Alert.alert("Validation", "Name and Mobile are required.");
      return;
    }

    try {
      await DataService.addCustomer({
        name: newCustomerName,
        mobile: newCustomerMobile,
        address: newCustomerAddress || "",
        balance: parseFloat(newCustomerBalance) || 0,
        vehicleId: user || "",
      });

      const updatedList = await DataService.getCustomers();
      setCustomers(updatedList);

      setNewCustomerName("");
      setNewCustomerMobile("");
      setNewCustomerAddress("");
      setNewCustomerBalance("");
      setShowAddCustomerModal(false);
    } catch (e) {
      Alert.alert("Error", "Failed to add customer");
    }
  };

  const generateInvoiceHtml = () => {
    const driverName = user?.name || "Driver";
    const driverMobile = user?.mobile || "N/A";
    const custName = selectedCustomer?.name || "Unknown";
    const custMobile = selectedCustomer?.mobile || "N/A";
    const custAddress = selectedCustomer?.address || "";
    const prevDue = selectedCustomer?.balance || 0;

    return `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                    .header p { margin: 5px 0; font-size: 14px; }
                    .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                    .section { margin-bottom: 15px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                    .bold { font-weight: bold; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; font-style: italic; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>*** EVERGREEN FOODS ***</h1>
                    <p>Customer Billing Invoice</p>
                    <p>Khetasri, jaunpur, Mob. 7897404065 9935283846</p>
                </div>
                <div class="divider"></div>
                <div class="section">
                    <div class="row"><span>Invoice No:</span> <span class="bold">INV-${Date.now()}</span></div>
                    <div class="row"><span>Date:</span> <span>${currentDate.toLocaleDateString()}</span></div>
                    <div class="row"><span>Time:</span> <span>${currentDate.toLocaleTimeString()}</span></div>
                </div>
                <div class="divider"></div>
                
                <div class="section">
                    <p class="bold" style="margin-bottom: 5px;">DRIVER:</p>
                    <div class="row"><span>Name:</span> <span>${driverName}</span></div>
                    <div class="row"><span>Mobile:</span> <span>${driverMobile}</span></div>
                </div>
                <div class="divider"></div>

                <div class="section">
                    <p class="bold" style="margin-bottom: 5px;">CUSTOMER:</p>
                    <div class="row"><span>Name:</span> <span>${custName}</span></div>
                    <div class="row"><span>Mobile:</span> <span>${custMobile}</span></div>
                    <div class="row"><span>Address:</span> <span>${custAddress}</span></div>
                </div>
                <div class="divider"></div>

                <div class="section">
                    <p class="bold" style="margin-bottom: 5px;">BILL DETAILS:</p>
                    <div class="row"><span>Previous Due:</span> <span>₹ ${Number(prevDue || 0).toFixed(2)}</span></div>
                    <div class="row"><span>Total Weight:</span> <span>${weight} KG</span></div>
                    <div class="row"><span>Rate per KG:</span> <span>₹ ${rate}</span></div>
                    <div class="row"><span class="bold">Total Amount:</span> <span class="bold">₹ ${totalAmount.toFixed(2)}</span></div>
                </div>
                <div class="divider"></div>

                <div class="section">
                    <p class="bold" style="margin-bottom: 5px;">PAYMENT:</p>
                    <div class="row"><span>Cash:</span> <span>₹ ${(parseFloat(cash) || 0).toFixed(2)}</span></div>
                    <div class="row"><span>UPI:</span> <span>₹ ${(parseFloat(upi) || 0).toFixed(2)}</span></div>
                </div>
                <div class="divider"></div>

                <div class="section">
                    <div class="row" style="font-size: 16px;">
                        <span class="bold">NEW CREDIT BALANCE:</span> 
                        <span class="bold">₹ ${newBalance.toFixed(2)}</span>
                    </div>
                </div>
                <div class="divider"></div>

                <div class="footer">
                    *System generated - No signature required*
                </div>
            </body>
            </html>
        `;
  };

  const handlePrint = async () => {
    try {
      const html = generateInvoiceHtml();

      // First try to print directly
      const result = await Print.printAsync({ html });

      // If print was cancelled or completed, result will be undefined but no error
      console.log("Print result:", result);
    } catch (e: any) {
      console.error("Print error:", e);

      // If direct print fails, offer to generate PDF instead
      Alert.alert("Print Not Available", "Direct printing failed. Would you like to generate a PDF instead?", [
        {
          text: "Generate PDF",
          onPress: handlePdf,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    }
  };

  const handlePdf = async () => {
    try {
      const html = generateInvoiceHtml();
      const { uri } = await Print.printToFileAsync({ html });
      // shareAsync returns void, just use await
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "PDF generation failed");
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert("Validation", "Please select a customer.");
      return;
    }
    if (!weight || !rate) {
      Alert.alert("Validation", "Please enter Weight and Rate.");
      return;
    }
    if (isOverStock) {
      Alert.alert("Stock Error", `You cannot sell more than available stock (${availableStock.toFixed(2)} KG).`);
      return;
    }

    setSubmitting(true);
    try {
      // Capture the invoice HTML BEFORE submitting (in case state changes)
      const invoiceHtml = generateInvoiceHtml();

      await DataService.addSellEntry({
        type: "SELL",
        amount: parseFloat(weight),
        unit: "KG",
        date: new Date().toISOString(),

        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        previousDue: selectedCustomer.balance,
        totalAmount: totalAmount,
        paymentCash: parseFloat(cash) || 0,
        paymentUpi: parseFloat(upi) || 0,
        newBalance: newBalance,

        details: `Bill for ${weight}KG @ ₹${rate}, Paid: ₹${(parseFloat(cash) || 0) + (parseFloat(upi) || 0)}`,
      });

      // Use captured HTML for printing
      const printInvoice = async () => {
        try {
          await Print.printAsync({ html: invoiceHtml });
        } catch (e: any) {
          console.error("Print error:", e);
          // Fallback to PDF if print fails
          try {
            const { uri } = await Print.printToFileAsync({ html: invoiceHtml });
            await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
          } catch (pdfError) {
            console.error("PDF error:", pdfError);
            Alert.alert("Error", "Could not print or generate PDF");
          }
        }
      };

      Alert.alert("Success", "Bill submitted successfully!", [
        {
          text: "Print Invoice",
          onPress: async () => {
            await printInvoice();
            router.replace("/(app)");
          },
        },
        {
          text: "Share as PDF",
          onPress: async () => {
            try {
              const { uri } = await Print.printToFileAsync({ html: invoiceHtml });
              await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
            } catch (e) {
              console.error("PDF error:", e);
            }
            router.replace("/(app)");
          },
        },
        {
          text: "Done",
          onPress: () => router.replace("/(app)"),
          style: "cancel",
        },
      ]);
    } catch (e) {
      Alert.alert("Error", "Failed to submit bill.");
      console.log("error", e);
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* Header: Driver Info (Locked) */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>EVERGREEN FOODS</Text>
            </View>
            <View style={styles.driverInfoBox}>
              <View style={styles.driverInfoRow}>
                <User size={16} color="#aaa" />
                <Text style={styles.driverResultText}>
                  {user?.name} ({user?.mobile})
                </Text>
              </View>
              <View style={styles.driverInfoRow}>
                <Text style={styles.driverDateText}>
                  {currentDate.toLocaleDateString()} • {currentDate.toLocaleTimeString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Customer Selection */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Customer Selection</Text>
            {!selectedCustomer ? (
              <>
                <View style={styles.searchContainer}>
                  <Search size={20} color="#888" style={{ marginRight: 8 }} />
                  <TextInput style={styles.searchInput} placeholder="Search Name or Mobile..." placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
                </View>

                {searchQuery.length > 0 && (
                  <View style={styles.searchResults}>
                    {filteredCustomers.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setSelectedCustomer(c);
                          setSearchQuery("");
                        }}>
                        <Text style={styles.resultName}>{c.name}</Text>
                        <Text style={styles.resultSub}>
                          {c.mobile} • Due: ₹{c.balance}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <View style={styles.noResult}>
                        <Text style={styles.noResultText}>No customer found</Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.addCustomerBtn} onPress={() => setShowAddCustomerModal(true)}>
                  <Plus size={20} color="#0A84FF" />
                  <Text style={styles.addCustomerText}>ADD NEW CUSTOMER</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.customerDetailsBox}>
                <View style={styles.customerHeader}>
                  <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                    <X size={20} color="#FF453A" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.customerInfo}>{selectedCustomer.mobile}</Text>
                <Text style={styles.customerInfo}>{selectedCustomer.address}</Text>
                <View style={styles.dueContainer}>
                  <Text style={styles.dueLabel}>Previous Due:</Text>
                  <Text style={styles.dueValue}>₹ {Number(selectedCustomer?.balance || 0).toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Bill Calculation */}
          {selectedCustomer && (
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Bill Calculation</Text>

              {/* Stock Display Section */}
              <View style={styles.stockContainer}>
                <Text style={styles.stockLabel}>AVAILABLE STOCK:</Text>
                <Text style={styles.stockValue}>{availableStock.toFixed(2)} KG</Text>
              </View>
              <View style={styles.divider} />

              {/* Weight Input with Add Button */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Add Weight (KG)</Text>
                <View style={styles.weightInputRow}>
                  <TouchableOpacity style={styles.addWeightBtn} onPress={handleAddWeight} disabled={!weightInput || parseFloat(weightInput) <= 0}>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addWeightBtnText}>ADD</Text>
                  </TouchableOpacity>
                  <TextInput style={styles.weightInputField} value={weightInput} onChangeText={setWeightInput} keyboardType="numeric" placeholder="Enter KG" placeholderTextColor="#666" />
                </View>
              </View>

              {/* Total Weight Display Box */}
              <View style={[styles.totalWeightBox, isOverStock && styles.totalWeightBoxError]}>
                <Text style={styles.totalWeightLabel}>TOTAL WEIGHT</Text>
                <Text style={[styles.totalWeightValue, isOverStock && styles.totalWeightValueError]}>{parseFloat(weight || "0").toFixed(2)} KG</Text>
                {parseFloat(weight || "0") > 0 && (
                  <TouchableOpacity style={styles.clearWeightBtn} onPress={() => setWeight("")}>
                    <X size={16} color="#FF453A" />
                  </TouchableOpacity>
                )}
              </View>
              {isOverStock && (
                <View style={styles.errorContainer}>
                  <AlertTriangle size={14} color="#FF453A" />
                  <Text style={styles.errorText}>Limit Exceeded! Available: {availableStock.toFixed(2)} KG</Text>
                </View>
              )}

              <View style={styles.rowInput}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Rate per KG (₹)</Text>
                  <TextInput style={styles.input} value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#666" />
                </View>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>TOTAL AMOUNT</Text>
                <Text style={styles.calcValue}>₹ {totalAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Payment Received</Text>
              <View style={styles.rowInput}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Cash (₹)</Text>
                  <TextInput style={styles.input} value={cash} onChangeText={setCash} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#666" />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>UPI (₹)</Text>
                  <TextInput style={styles.input} value={upi} onChangeText={setUpi} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#666" />
                </View>
              </View>

              <View style={styles.creditBox}>
                <Text style={styles.creditTitle}>CREDIT CALCULATION</Text>
                <View style={styles.creditRow}>
                  <Text style={styles.creditText}>Previous Due</Text>
                  <Text style={styles.creditText}>₹ {Number(selectedCustomer?.balance || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.creditRow}>
                  <Text style={styles.creditText}>+ Today's Bill</Text>
                  <Text style={styles.creditText}>₹ {totalAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.creditRow}>
                  <Text style={styles.creditText}>- Cash Received</Text>
                  <Text style={styles.creditText}>₹ {(parseFloat(cash) || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.creditRow}>
                  <Text style={styles.creditText}>- UPI Received</Text>
                  <Text style={styles.creditText}>₹ {(parseFloat(upi) || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.creditRow}>
                  <Text style={styles.balanceLabel}>NEW UDHAR BALANCE</Text>
                  <Text style={styles.balanceValue}>₹ {newBalance.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Actions */}
          {selectedCustomer && (
            <View style={[styles.card, styles.actionCard]}>
              <TouchableOpacity style={[styles.submitButton, isOverStock && styles.disabledBtn]} onPress={handleSubmit} disabled={submitting || isOverStock}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={20} color="#fff" />
                    <Text style={styles.submitText}>SUBMIT & LOCK</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrint} disabled={submitting}>
                  <Printer size={20} color="#fff" />
                  <Text style={styles.secondaryText}>PRINT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePdf} disabled={submitting}>
                  <FileText size={20} color="#fff" />
                  <Text style={styles.secondaryText}>PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />

          {/* Add Customer Modal */}
          <Modal visible={showAddCustomerModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Customer</Text>
                  <TouchableOpacity onPress={() => setShowAddCustomerModal(false)}>
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  <Text style={styles.label}>Customer Name</Text>
                  <TextInput style={styles.input} value={newCustomerName} onChangeText={setNewCustomerName} />

                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput style={styles.input} value={newCustomerMobile} onChangeText={setNewCustomerMobile} keyboardType="phone-pad" />

                  <Text style={styles.label}>Address</Text>
                  <TextInput style={styles.input} value={newCustomerAddress} onChangeText={setNewCustomerAddress} />

                  <Text style={styles.label}>Opening Balance (Udhar)</Text>
                  <TextInput style={styles.input} value={newCustomerBalance} onChangeText={setNewCustomerBalance} keyboardType="numeric" />

                  <TouchableOpacity style={styles.submitButton} onPress={handleAddCustomer}>
                    <Save size={20} color="#fff" />
                    <Text style={styles.submitText}>SAVE TO LIST</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfoBox: {
    backgroundColor: "#1C1C1E",
    padding: 12,
    borderRadius: 12,
    width: "100%",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  driverInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  driverResultText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  driverDateText: {
    color: "#888",
    fontSize: 14,
    marginLeft: 24,
  },
  card: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  sectionHeader: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 1,
  },
  stockContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#252527",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30D158", // Green border
    marginBottom: 8,
    gap: 8,
  },
  stockLabel: {
    color: "#30D158",
    fontWeight: "700",
    fontSize: 14,
  },
  stockValue: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    height: "100%",
  },
  searchResults: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    maxHeight: 200,
    marginBottom: 12,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  resultName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultSub: {
    color: "#aaa",
    fontSize: 12,
  },
  noResult: {
    padding: 16,
    alignItems: "center",
  },
  noResultText: {
    color: "#666",
    fontStyle: "italic",
  },
  addCustomerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  addCustomerText: {
    color: "#0A84FF",
    fontWeight: "700",
  },
  customerDetailsBox: {
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(10, 132, 255, 0.3)",
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  customerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  customerInfo: {
    color: "#ccc",
    fontSize: 14,
  },
  dueContainer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 69, 58, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  dueLabel: {
    color: "#FF453A",
    fontWeight: "600",
  },
  dueValue: {
    color: "#FF453A",
    fontWeight: "700",
  },
  rowInput: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputWrapper: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: "#888",
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
  inputError: {
    borderColor: "#FF453A",
    borderWidth: 2,
  },
  weightInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  addWeightBtn: {
    backgroundColor: "#30D158",
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addWeightBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  weightInputField: {
    flex: 1,
    backgroundColor: "#2C2C2E",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  totalWeightBox: {
    backgroundColor: "#252527",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#30D158",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalWeightBoxError: {
    borderColor: "#FF453A",
    backgroundColor: "rgba(255, 69, 58, 0.1)",
  },
  totalWeightLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  totalWeightValue: {
    color: "#30D158",
    fontSize: 24,
    fontWeight: "bold",
  },
  totalWeightValueError: {
    color: "#FF453A",
  },
  clearWeightBtn: {
    backgroundColor: "rgba(255, 69, 58, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    color: "#FF453A",
    fontSize: 12,
    fontWeight: "600",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#252527",
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  calcLabel: {
    color: "#aaa",
    fontWeight: "600",
  },
  calcValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#333",
  },
  creditBox: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  creditTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  creditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  creditText: {
    color: "#ccc",
    fontSize: 14,
  },
  balanceLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  balanceValue: {
    color: "#FF9F0A",
    fontWeight: "700",
    fontSize: 18,
  },
  actionCard: {
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: "#0A84FF",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#333",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalForm: {
    gap: 16,
  },
});
