import React, { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { colors, radius } from "../../theme";
import Avatar from "../../components/Avatar";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";

function formatTime(iso, t) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return t("notifications.justNow");
  if (diff < 3600) return t("notifications.minutesAgo", { count: Math.floor(diff / 60) });
  if (diff < 86400) return t("notifications.hoursAgo", { count: Math.floor(diff / 3600) });
  if (now.toDateString() === d.toDateString()) return t("chat.today");
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return t("chat.yesterday");
  return d.toLocaleDateString();
}

export default function ChatListScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { onMessage, connected } = useSocket() || {};
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get("/messages/conversations");
      setConversations(res.data.data);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchConversations(); }, [fetchConversations]));

  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage(() => { fetchConversations(); });
    return unsub;
  }, [onMessage, fetchConversations]);

  const renderItem = ({ item, index }) => (
    <AnimatedEntry delay={index * 30}>
      <PressableScale
        onPress={() => navigation.navigate("ChatConversation", { userId: item.user.id, username: item.user.username })}
        style={styles.row}
      >
        <Avatar uri={item.user.profile_picture} name={item.user.username} size={52} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{item.user.username}</Text>
            <Text style={styles.time}>{formatTime(item.last_message?.created_at, t)}</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.preview, item.unread_count > 0 && styles.previewUnread]} numberOfLines={1}>
              {item.last_message?.sender_id === user?.id ? "You: " : ""}{item.last_message?.content || ""}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count > 9 ? "9+" : item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </PressableScale>
    </AnimatedEntry>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("chat.title")}</Text>
        <View style={styles.connWrap}>
          <View style={[styles.connDot, { backgroundColor: connected ? colors.online : colors.offline }]} />
          <Text style={styles.connText}>{connected ? t("chat.online") : "Offline"}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.user.id)}
          renderItem={renderItem}
          contentContainerStyle={conversations.length === 0 ? styles.empty : { padding: 8, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>{t("chat.noConversations")}</Text>
              <Text style={styles.emptyHint}>{t("chat.startChatHint")}</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  connWrap: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderRadius: radius.md },
  content: { flex: 1, gap: 4 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  time: { color: colors.textDim, fontSize: 12 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  preview: { color: colors.textMuted, fontSize: 13, flex: 1 },
  previewUnread: { color: colors.text, fontWeight: "600" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyState: { alignItems: "center", gap: 8 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyText: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 4 },
  emptyHint: { color: colors.textMuted, fontSize: 13 },
});
