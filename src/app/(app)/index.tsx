import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../../constants/Colors";
import { DataService, Transaction, Notification } from "../../../services/dataService";
import { AuthService } from "../../../services/authService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../context/UserContext";

const NOTIFICATION_POLL_INTERVAL = 15000; // 15 seconds

export default function Dashboard() {
  const router = useRouter(); // Router hook
  const { user, setUser } = useUser();
  const [summary, setSummary] = useState<any>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AuthService.logout();
          setUser(null);
          router.replace("/login");
        },
      },
    ]);
  };

  const loadData = async () => {
    // Only show loading spinner on initial load or manual refresh
    // For focus updates, we can update seamlessly
    if (!summary) setLoading(true);

    try {
      const s = await DataService.getDashboardSummary();
      const r = await DataService.getRecentActivity();
      const notifs = await DataService.getNotifications();
      setSummary(s);
      setRecent(r);
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await DataService.markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await DataService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  // Poll notifications every 15 seconds (silently, without loading indicator)
  const pollNotifications = async () => {
    try {
      const notifs = await DataService.getNotifications();
      setNotifications(notifs);
    } catch (e) {
      // Silent fail for polling - don't disrupt user experience
      console.error("Notification poll failed:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Initial load
      loadData();

      // Set up polling interval for notifications
      const intervalId = setInterval(pollNotifications, NOTIFICATION_POLL_INTERVAL);

      // Cleanup on unfocus
      return () => {
        clearInterval(intervalId);
      };
    }, [])
  );

  const menuItems = [
    { label: "Buy Entry", icon: "trending-up", route: "/buy", color: Colors.dark.success },
    { label: "Sell Entry", icon: "trending-down", route: "/sell", color: Colors.dark.error },
    { label: "Fuel Entry", icon: "gas-station", route: "/fuel", color: "#FF9F0A" },
    { label: "Palti Entry", icon: "autorenew", route: "/palti", color: "#BF5AF2" },
    { label: "Weight Loss", icon: "scale", route: "/weight-loss", color: "#FF375F" },
    { label: "Shop Buy", icon: "cart", route: "/shop-buy", color: "#30D158" },
    { label: "Customers", icon: "account-group", route: "/customers", color: "#64D2FF" },
  ];

  const renderSummaryCard = (label: string, value: string, subLabel: string) => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summarySub}>{subLabel}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#fff" />}>
      {/* Dashboard Header with Notifications and Logout */}
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.dashboardTitle}>{user?.name || "Driver"}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.notificationButton} onPress={handleOpenNotifications}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#64D2FF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={22} color="#FF453A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} animationType="slide" transparent={true} onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <View style={styles.modalHeaderButtons}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.notificationList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="bell-off-outline" size={48} color="#666" />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity key={notification.id} style={[styles.notificationItem, !notification.isRead && styles.unreadNotification]} onPress={() => handleMarkAsRead(notification.id)}>
                    <View style={styles.notificationDot}>{!notification.isRead && <View style={styles.unreadDot} />}</View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationDate}>
                        {new Date(notification.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Top Summary Section */}
      <View style={styles.summaryContainer}>
        {renderSummaryCard("Today Buy", `${summary?.todayBuyKg || 0}`, "KG")}
        {renderSummaryCard("Today Stock", `${(summary?.todayStock || 0).toFixed(1)}`, "KG")}
        {renderSummaryCard("Today Sell", `${summary?.todaySellKg || 0}`, "KG")}
      </View>

      {/* Secondary Summary Row */}
      <View style={[styles.summaryContainer, { marginTop: -12 }]}>
        {renderSummaryCard("Today Fuel", `${summary?.todayFuelLiters || 0}`, "Ltr")}
        {/* Placeholders for visual balance or future metrics */}
        <View style={[styles.summaryCard, { opacity: 0 }]} />
        <View style={[styles.summaryCard, { opacity: 0 }]} />
      </View>

      {/* Quick Navigation Grid */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.gridItem} onPress={() => router.push(item.route as any)}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
              <MaterialCommunityIcons name={item.icon as any} size={32} color={item.color} />
            </View>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recent.map((tx) => (
          <View key={tx.id} style={styles.activityCard}>
            <View style={styles.activityIcon}>
              {tx.type === "BUY" && <MaterialCommunityIcons name="trending-up" size={24} color={Colors.dark.success} />}
              {tx.type === "SELL" && <MaterialCommunityIcons name="trending-down" size={24} color={Colors.dark.error} />}
              {tx.type === "FUEL" && <MaterialCommunityIcons name="gas-station" size={24} color="#FF9F0A" />}
              {!["BUY", "SELL", "FUEL"].includes(tx.type) && <MaterialCommunityIcons name="file-document-outline" size={24} color="#fff" />}
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{tx.type}</Text>
              <Text style={styles.activityDate}>{new Date(tx.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={styles.activityAmount}>
                {tx.amount} {tx.unit}
              </Text>
              <Text style={styles.activityDetail}>{tx.details}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    padding: 16,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(100, 210, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(100, 210, 255, 0.3)",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF453A",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  welcomeText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "500",
  },
  dashboardTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 69, 58, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 69, 58, 0.3)",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    paddingVertical: 16, // More vertical padding
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    color: "#888",
    fontSize: 10, // Slightly smaller for fit
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800", // Heavier font
  },
  summarySub: {
    color: Colors.dark.primary, // Pop color
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  gridItem: {
    width: "31%", // roughly 3 items per row
    aspectRatio: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  iconContainer: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  gridLabel: {
    color: "#E0E0E0",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  recentSection: {
    gap: 12,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  seeAll: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#252525",
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#252525",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityDate: {
    color: "#666",
    fontSize: 12,
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityAmount: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"], // Better for numbers
  },
  activityDetail: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  modalHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(100, 210, 255, 0.15)",
    borderRadius: 8,
  },
  markAllText: {
    color: "#64D2FF",
    fontSize: 13,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  notificationList: {
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#252525",
  },
  unreadNotification: {
    backgroundColor: "rgba(100, 210, 255, 0.05)",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  notificationDot: {
    width: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#64D2FF",
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
    marginBottom: 6,
  },
  notificationDate: {
    color: "#888",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
    marginTop: 12,
  },
});
