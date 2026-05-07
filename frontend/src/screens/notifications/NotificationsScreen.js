import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { colors, radius } from "../../theme";
import Avatar from "../../components/Avatar";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";
import { NotificationListSkeleton } from "../../components/Skeleton";

const TYPE_META = {
  join_request:    { color: colors.primary, icon: "person-add" },
  join_approved:   { color: colors.success, icon: "checkmark-circle" },
  join_rejected:   { color: colors.danger,  icon: "close-circle" },
  player_removed:  { color: colors.danger,  icon: "remove-circle" },
  player_left:     { color: colors.warning, icon: "exit-outline" },
  match_invite:    { color: colors.accent,  icon: "mail-outline" },
  match_closed:    { color: colors.warning, icon: "lock-closed" },
  match_cancelled: { color: colors.danger,  icon: "ban" },
  match_completed: { color: colors.info,    icon: "trophy" },
  friend_request:  { color: colors.primary, icon: "person-add-outline" },
  friend_accepted: { color: colors.success, icon: "people" },
  new_rating:      { color: colors.warning, icon: "star" },
};

function NotificationItem({ item, onPress, t, index }) {
  const meta = TYPE_META[item.type] || { color: colors.primary, icon: "notifications" };
  const typeLabel = t(`notifications.types.${item.type}`, { defaultValue: item.type });
  return (
    <AnimatedEntry delay={index * 30}>
      <PressableScale onPress={() => onPress(item)} style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: meta.color + "26" }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={[styles.typeLabel, { color: meta.color }]}>{typeLabel}</Text>
            <Text style={styles.time}>{formatTime(item.created_at, t)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        </View>
        {item.actor && <Avatar uri={item.actor.profile_picture} name={item.actor.username || "?"} size={32} />}
      </PressableScale>
    </AnimatedEntry>
  );
}

function formatTime(iso, t) {
  if (!iso) return "";
  const diff = (new Date() - new Date(iso)) / 1000;
  if (diff < 60) return t("notifications.justNow");
  if (diff < 3600) return t("notifications.minutesAgo", { count: Math.floor(diff / 60) });
  if (diff < 86400) return t("notifications.hoursAgo", { count: Math.floor(diff / 3600) });
  if (diff < 604800) return t("notifications.daysAgo", { count: Math.floor(diff / 86400) });
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen({ navigation }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (p = 1, append = false) => {
    try {
      const res = await apiClient.get(`/notifications?page=${p}&per_page=20`);
      const data = res.data.data;
      if (append) setNotifications((prev) => [...prev, ...data.notifications]);
      else setNotifications(data.notifications);
      setHasMore(data.page < data.pages);
      setPage(p);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    apiClient.put("/notifications/read-all").catch(() => {});
    fetchNotifications(1);
  }, [fetchNotifications]));

  usePolling(() => fetchNotifications(1), 10000);

  const handlePress = (item) => {
    if (item.reference_type === "match" && item.reference_id) {
      navigation.getParent()?.navigate("MatchesTab", { screen: "MatchDetail", params: { matchId: item.reference_id } });
    } else if (item.reference_type === "user" && item.reference_id) {
      navigation.getParent()?.getParent()?.navigate("PublicProfile", { userId: item.reference_id });
    }
  };

  return (
    <View style={styles.container}>
      {loading && notifications.length === 0 ? (
        <NotificationListSkeleton />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => <NotificationItem item={item} onPress={handlePress} t={t} index={index} />}
          contentContainerStyle={notifications.length === 0 ? styles.empty : { padding: 12, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(1); }} tintColor={colors.primary} />}
          onEndReached={() => { if (hasMore && !loading) fetchNotifications(page + 1, true); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>{t("notifications.noNotifications")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    flexDirection: "row", gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center",
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  typeLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { fontSize: 11, color: colors.textDim },
  message: { fontSize: 13, color: colors.text, lineHeight: 18 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
