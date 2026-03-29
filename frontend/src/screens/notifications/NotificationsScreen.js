import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { API_BASE_URL } from "../../config/server";
import { NotificationListSkeleton } from "../../components/Skeleton";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";

function avatarUrl(pic) {
  return pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;
}

const TYPE_LABELS = {
  join_request: "Join Request",
  join_approved: "Approved",
  join_rejected: "Rejected",
  player_removed: "Removed",
  player_left: "Player Left",
  match_invite: "Invitation",
  match_closed: "Match Closed",
  match_cancelled: "Cancelled",
  match_completed: "Completed",
  friend_request: "Friend Request",
  friend_accepted: "Friend Accepted",
  new_rating: "New Rating",
};

const TYPE_COLORS = {
  join_approved: "#27ae60",
  friend_accepted: "#27ae60",
  join_rejected: "#e74c3c",
  player_removed: "#e74c3c",
  match_cancelled: "#e74c3c",
  match_completed: "#3498db",
  new_rating: "#f39c12",
};

function NotificationItem({ item, onPress }) {
  const color = TYPE_COLORS[item.type] || "#FF6B35";
  const actor = item.actor;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: actor ? avatarUrl(actor.profile_picture) : DEFAULT_AVATAR }}
        style={styles.avatar}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.typeLabel, { color }]}>{TYPE_LABELS[item.type] || item.type}</Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (p = 1, append = false) => {
    try {
      const res = await apiClient.get(`/notifications?page=${p}&per_page=20`);
      const data = res.data.data;
      if (append) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setHasMore(data.page < data.pages);
      setPage(p);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Mark all as read + fetch when screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      // Mark all read silently, then fetch
      apiClient.put("/notifications/read-all").catch(() => {});
      fetchNotifications(1);
    }, [fetchNotifications])
  );

  // Silent poll every 10s
  usePolling(() => fetchNotifications(1), 10000);

  const handlePress = (item) => {
    if (item.reference_type === "match" && item.reference_id) {
      navigation.navigate("MatchesTab", {
        screen: "MatchDetail",
        params: { matchId: item.reference_id },
      });
    } else if (item.reference_type === "user" && item.reference_id) {
      navigation.navigate("PublicProfile", { userId: item.reference_id });
    } else if (item.reference_type === "friend_request") {
      navigation.navigate("FriendsTab", { screen: "FriendRequests" });
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchNotifications(page + 1, true);
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <NotificationListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(1); }}
            tintColor="#FF6B35"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ddd",
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  typeLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  time: { fontSize: 12, color: "#aaa" },
  message: { fontSize: 14, color: "#333", lineHeight: 20 },
  emptyText: { fontSize: 16, color: "#999" },
});
