import React, { useState, useEffect } from "react";
import { View, Text, Modal, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client";
import { useToast } from "./Toast";
import Avatar from "./Avatar";
import PressableScale from "./PressableScale";
import { colors, radius, shadows } from "../theme";

export default function InviteToMatchModal({ visible, user, onClose }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(null);

  useEffect(() => {
    if (visible && user) fetchMyOpenMatches();
  }, [visible, user]);

  const fetchMyOpenMatches = async () => {
    setLoading(true);
    try {
      const me = await apiClient.get("/auth/profile");
      const myId = me.data.data.id;
      const res = await apiClient.get("/matches", { params: { status: "open", organizer_id: myId, per_page: 50 } });
      setMatches(res.data.data.matches || []);
    } catch { } finally { setLoading(false); }
  };

  const handleInvite = async (matchId) => {
    setInviting(matchId);
    try {
      await apiClient.post(`/matches/${matchId}/invite`, { user_id: user.id });
      toast.success(t("invite.invited"));
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || t("invite.inviteFailed"));
    } finally {
      setInviting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t("invite.title")}</Text>
            <PressableScale onPress={onClose} scaleTo={0.85}>
              <View style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </View>
            </PressableScale>
          </View>

          {user && (
            <View style={styles.userBanner}>
              <Avatar uri={user.profile_picture} name={user.username} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{user.username}</Text>
                {user.city && <Text style={styles.userCity}>{user.city}</Text>}
              </View>
            </View>
          )}

          <Text style={styles.subtitle}>{t("invite.selectMatch")}</Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : matches.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>{t("invite.noOpenMatches")}</Text>
              <Text style={styles.emptyHint}>{t("invite.createMatchFirst")}</Text>
            </View>
          ) : (
            <FlatList
              data={matches}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
              renderItem={({ item }) => {
                const progress = (item.current_players / item.max_players) * 100;
                const stage = progress >= 90 ? colors.danger : progress >= 70 ? colors.warning : colors.success;
                return (
                  <View style={styles.matchCard}>
                    <View style={[styles.stripe, { backgroundColor: stage }]} />
                    <View style={styles.matchContent}>
                      <Text style={styles.matchTitle}>{item.title}</Text>
                      <View style={styles.matchMetaRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.matchMeta}>{item.date}</Text>
                        <View style={styles.dot} />
                        <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.matchMeta} numberOfLines={1}>{item.location}</Text>
                      </View>
                      <View style={styles.progressRow}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stage }]} />
                        </View>
                        <Text style={[styles.progressText, { color: stage }]}>{item.current_players}/{item.max_players}</Text>
                      </View>
                    </View>
                    <PressableScale onPress={() => handleInvite(item.id)} disabled={inviting === item.id} scaleTo={0.9}>
                      <LinearGradient
                        colors={colors.gradPrimary}
                        style={[styles.inviteBtn, inviting === item.id && { opacity: 0.5 }]}
                      >
                        {inviting === item.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Ionicons name="paper-plane" size={16} color="#fff" />
                        )}
                      </LinearGradient>
                    </PressableScale>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: 8,
    minHeight: "55%",
    maxHeight: "90%",
    borderTopWidth: 1, borderColor: colors.border,
    ...shadows.lg,
  },
  handle: { width: 44, height: 4, backgroundColor: colors.borderStrong, alignSelf: "center", borderRadius: 2, marginBottom: 8 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  userBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.primarySoft,
    marginHorizontal: 16, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primarySoftStrong,
  },
  userName: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  userCity: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  subtitle: {
    color: colors.textMuted, fontSize: 11, fontWeight: "800",
    textTransform: "uppercase", letterSpacing: 0.5,
    paddingHorizontal: 20, marginTop: 16, marginBottom: 6,
  },
  matchCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  stripe: { width: 4, alignSelf: "stretch" },
  matchContent: { flex: 1, padding: 12, gap: 4 },
  matchTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  matchMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  matchMeta: { color: colors.textMuted, fontSize: 11, flexShrink: 1 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textDim, marginHorizontal: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.bgElevated, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 10, fontWeight: "800" },
  inviteBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
    ...shadows.glowSubtle,
  },
  empty: { alignItems: "center", paddingTop: 50, gap: 6 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyHint: { color: colors.textMuted, fontSize: 13 },
});
