import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";
import { UserListSkeleton } from "../../components/Skeleton";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";
const avatarUrl = (pic) =>
  pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;

export default function FriendRequestsScreen({ navigation }) {
  const toast = useToast();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("incoming");

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiClient.get("/friends/requests");
      setIncoming(res.data.data.incoming);
      setOutgoing(res.data.data.outgoing);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRequests();
    }, [fetchRequests])
  );

  // Silent poll every 8s
  usePolling(fetchRequests, 8000);

  const handleAction = async (requestId, action) => {
    try {
      await apiClient.put(`/friends/requests/${requestId}`, { action });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  const handleCancel = async (requestId) => {
    // Cancel outgoing = decline it (we need a different approach — delete or decline)
    // The spec doesn't have a cancel endpoint, but we can decline from the other side.
    // For outgoing, we'll unfriend (which deletes the record) since it's still pending.
    try {
      // Find the addressee user_id from the outgoing request
      const req = outgoing.find((r) => r.id === requestId);
      if (req) {
        // Delete the friendship record directly via the unfriend endpoint won't work
        // since status is pending. Let's use a direct approach.
        await apiClient.put(`/friends/requests/${requestId}`, { action: "decline" });
      }
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel");
    }
  };

  const renderIncoming = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => navigation.navigate("PublicProfile", { userId: item.user.id })}
      >
        <Image source={{ uri: avatarUrl(item.user.profile_picture) }} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.user.username}</Text>
          <Text style={styles.sub}>
            Rating: {item.user.average_rating ? item.user.average_rating.toFixed(1) : "N/A"}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => handleAction(item.id, "accept")}
        >
          <Text style={styles.actionBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.declineBtn]}
          onPress={() => handleAction(item.id, "decline")}
        >
          <Text style={[styles.actionBtnText, { color: "#e74c3c" }]}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOutgoing = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => navigation.navigate("PublicProfile", { userId: item.user.id })}
      >
        <Image source={{ uri: avatarUrl(item.user.profile_picture) }} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.user.username}</Text>
          <Text style={styles.sub}>Pending...</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, styles.declineBtn]}
        onPress={() => handleCancel(item.id)}
      >
        <Text style={[styles.actionBtnText, { color: "#e74c3c" }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <View style={[styles.tab, styles.tabActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Incoming</Text>
          </View>
          <View style={styles.tab}>
            <Text style={styles.tabText}>Outgoing</Text>
          </View>
        </View>
        <UserListSkeleton count={4} />
      </View>
    );
  }

  const data = tab === "incoming" ? incoming : outgoing;

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === "incoming" && styles.tabActive]}
          onPress={() => setTab("incoming")}
        >
          <Text style={[styles.tabText, tab === "incoming" && styles.tabTextActive]}>
            Incoming ({incoming.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "outgoing" && styles.tabActive]}
          onPress={() => setTab("outgoing")}
        >
          <Text style={[styles.tabText, tab === "outgoing" && styles.tabTextActive]}>
            Outgoing ({outgoing.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={tab === "incoming" ? renderIncoming : renderOutgoing}
        contentContainerStyle={data.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No {tab} requests
          </Text>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor="#FF6B35" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#FF6B35" },
  tabText: { fontSize: 15, color: "#888" },
  tabTextActive: { color: "#FF6B35", fontWeight: "600" },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  cardInner: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ddd" },
  info: { marginLeft: 12, flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#333" },
  sub: { fontSize: 13, color: "#888", marginTop: 2 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  acceptBtn: { backgroundColor: "#27ae60" },
  declineBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e74c3c" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  emptyText: { fontSize: 15, color: "#888" },
});
