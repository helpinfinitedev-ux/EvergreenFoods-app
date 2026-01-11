import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { DataService, Customer, Transaction } from "../../../../services/dataService";
import { Colors } from "../../../../constants/Colors";
import { Calendar, TrendingUp, ArrowDownCircle, ArrowUpCircle } from "lucide-react-native";

export default function CustomerDetailPage() {
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [financialNotes, setFinancialNotes] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const customerData = await DataService.getCustomerById(id as string);
      if (!customerData) {
        Alert.alert("Error", "Customer not found");
        return;
      }
      setCustomer(customerData);

      const historyData = await DataService.getCustomerHistory(id as string);

      // Filter last 7 days for financial notes (DEBIT_NOTE and CREDIT_NOTE)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const notes = historyData.filter((t: Transaction) => (t.type === "DEBIT_NOTE" || t.type === "CREDIT_NOTE") && new Date(t.date) >= sevenDaysAgo);
      setFinancialNotes(notes);

      // Filter SELL transactions for the regular history table
      const sellHistory = historyData.filter((t: Transaction) => t.type === "SELL");
      setHistory(sellHistory);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalKg = history.reduce((sum, item) => sum + (+item.amount || 0), 0);
    const totalAmount = history.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    return { totalKg, totalAmount };
  };

  const summary = calculateSummary();

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  if (!customer) return null;

  const renderHistoryItem = ({ item }: { item: Transaction }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.dateCell]}>{new Date(item.date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}</Text>
      <Text style={styles.tableCell}>{item.amount}</Text>
      <Text style={styles.tableCell}>₹{item.rate}</Text>
      <Text style={styles.tableCell}>₹{item.totalAmount}</Text>
      <Text style={[styles.tableCell, styles.paymentCell]}>₹{(item.paymentCash || 0) + (item.paymentUpi || 0)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: customer.name,
          headerShown: true,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: "#fff",
        }}
      />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerMobile}>{customer.mobile}</Text>
            <Text style={styles.customerAddress}>{customer.address}</Text>
          </View>
          <View style={styles.dueBox}>
            <Text style={styles.dueLabel}>TOTAL DUE</Text>
            <Text style={styles.dueAmount}>₹ {customer.balance.toLocaleString()}</Text>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Last 7 Days Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total KG</Text>
              <Text style={styles.summaryValue}>{Number(summary.totalKg || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>₹ {summary.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Financial Notes Section */}
        <View style={styles.financialNotesContainer}>
          <Text style={styles.sectionTitle}>Financial Notes (Last 7 Days)</Text>
          {financialNotes.length === 0 ? (
            <Text style={styles.emptyText}>No debit/credit notes in last 7 days.</Text>
          ) : (
            financialNotes.map((note) => (
              <View key={note.id} style={[styles.noteCard, note.type === "DEBIT_NOTE" ? styles.debitNote : styles.creditNote]}>
                <View style={styles.noteIconContainer}>{note.type === "DEBIT_NOTE" ? <ArrowUpCircle size={28} color="#FF453A" /> : <ArrowDownCircle size={28} color="#30D158" />}</View>
                <View style={styles.noteContent}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteType}>{note.type === "DEBIT_NOTE" ? "Debit Note" : "Credit Note"}</Text>
                    <Text style={[styles.noteAmount, note.type === "DEBIT_NOTE" ? styles.debitAmount : styles.creditAmount]}>
                      {note.type === "DEBIT_NOTE" ? "+" : "-"} ₹{Number(note.totalAmount || note.amount).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.noteReason}>{note.details || "No reason specified"}</Text>
                  <Text style={styles.noteDate}>
                    {new Date(note.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Transaction Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
            <Text style={styles.headerCell}>KG</Text>
            <Text style={styles.headerCell}>Rate</Text>
            <Text style={styles.headerCell}>Amt</Text>
            <Text style={[styles.headerCell, styles.paymentCell]}>Paid</Text>
          </View>

          {/* Table Rows */}
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No transactions in last 7 days.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id}>
                {renderHistoryItem({ item })}
                <View style={styles.rowDivider} />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#333",
  },
  customerName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  customerMobile: {
    color: "#888",
    fontSize: 14,
    marginBottom: 2,
  },
  customerAddress: {
    color: "#666",
    fontSize: 12,
  },
  dueBox: {
    alignItems: "flex-end",
  },
  dueLabel: {
    color: "#FF453A",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  dueAmount: {
    color: "#FF453A",
    fontSize: 22,
    fontWeight: "bold",
  },
  summaryCard: {
    backgroundColor: "#252527",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#444",
  },
  tableContainer: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  dateCell: {
    flex: 1.5,
    textAlign: "left",
  },
  paymentCell: {
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  tableCell: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#2C2C2E",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  // Financial Notes Styles
  financialNotesContainer: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  debitNote: {
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    borderColor: "rgba(255, 69, 58, 0.3)",
  },
  creditNote: {
    backgroundColor: "rgba(48, 209, 88, 0.1)",
    borderColor: "rgba(48, 209, 88, 0.3)",
  },
  noteIconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  noteContent: {
    flex: 1,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noteType: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  noteAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  debitAmount: {
    color: "#FF453A",
  },
  creditAmount: {
    color: "#30D158",
  },
  noteReason: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 4,
  },
  noteDate: {
    color: "#666",
    fontSize: 11,
  },
});
