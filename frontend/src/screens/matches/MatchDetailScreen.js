import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { showConfirm } from "../../utils/alert";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/Avatar";
import GradientButton from "../../components/GradientButton";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";
import { MatchDetailSkeleton } from "../../components/Skeleton";
import { colors, radius, shadows } from "../../theme";

export default function MatchDetailScreen({ route, navigation }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await apiClient.get(`/matches/${matchId}`);
      setMatch(res.data.data);
    } catch {
      toast.error(t("matches.loadFailed"));
      navigation.goBack();
    } finally { setLoading(false); setRefreshing(false); }
  }, [matchId]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchMatch(); }, [fetchMatch]));
  usePolling(fetchMatch, 5000);

  const handleJoin = async () => {
    setActionLoading(true);
    try { await apiClient.post(`/matches/${matchId}/join`); toast.success(t("matches.joinSuccess")); fetchMatch(); }
    catch (e) { toast.error(e.response?.data?.message || t("matches.joinFailed")); }
    finally { setActionLoading(false); }
  };

  const handleRequestAction = async (requestId, action) => {
    setActionLoading(true);
    try { await apiClient.put(`/matches/${matchId}/requests/${requestId}`, { action }); fetchMatch(); }
    catch (e) { toast.error(e.response?.data?.message || t("matches.actionFailed")); }
    finally { setActionLoading(false); }
  };

  const confirmAction = (title, msg, primaryLabel, run, danger = true) => {
    showConfirm(title, msg, [
      { text: t("common.cancel"), style: "cancel" },
      { text: primaryLabel, style: danger ? "destructive" : "default", onPress: run },
    ]);
  };

  const handleCancel = () => confirmAction(t("matches.cancelMatch"), t("matches.cancelMatchConfirm"), t("matches.cancelMatch"), async () => {
    setActionLoading(true);
    try { await apiClient.post(`/matches/${matchId}/close`); fetchMatch(); }
    catch (e) { toast.error(e.response?.data?.message || t("matches.cancelFailed")); }
    finally { setActionLoading(false); }
  });

  const handleLeave = () => confirmAction(t("matches.leaveMatch"), t("matches.leaveMatchConfirm"), t("common.leave"), async () => {
    setActionLoading(true);
    try { await apiClient.post(`/matches/${matchId}/leave`); fetchMatch(); }
    catch (e) { toast.error(e.response?.data?.message || t("matches.leaveFailed")); }
    finally { setActionLoading(false); }
  });

  const handleComplete = () => confirmAction(t("matches.completeMatch"), t("matches.completeMatchConfirm"), t("common.complete"), async () => {
    setActionLoading(true);
    try { await apiClient.post(`/matches/${matchId}/complete`); fetchMatch(); }
    catch (e) { toast.error(e.response?.data?.message || t("matches.completeFailed")); }
    finally { setActionLoading(false); }
  }, false);

  const handleRemovePlayer = (playerId, playerName) => confirmAction(t("matches.removePlayer"), t("matches.removePlayerConfirm", { name: playerName }), t("common.remove"), async () => {
    setActionLoading(true);
    try { await apiClient.delete(`/matches/${matchId}/players/${playerId}`); fetchMatch(); }
    catch (e) { toast.error(e.response?.data?.message || t("matches.removeFailed")); }
    finally { setActionLoading(false); }
  });

  if (loading) return <MatchDetailSkeleton />;
  if (!match) return null;

  const isOrganizer = match.user_status === "organizer";
  const statusColor =
    match.status === "open" ? colors.success :
    match.status === "closed" ? colors.warning :
    match.status === "cancelled" ? colors.danger : colors.info;
  const progress = (match.current_players / match.max_players) * 100;
  const stage = progress >= 90 ? colors.danger : progress >= 70 ? colors.warning : colors.success;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMatch(); }} tintColor={colors.primary} />}
    >
      <AnimatedEntry>
        <LinearGradient
          colors={[statusColor + "20", colors.bg]}
          style={styles.headerBg}
        />
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>{match.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "26", borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{t(`matches.${match.status}`) || match.status}</Text>
            </View>
          </View>
          {match.description ? <Text style={styles.description}>{match.description}</Text> : null}

          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stage }]} />
            </View>
            <Text style={[styles.progressText, { color: stage }]}>{match.current_players}/{match.max_players}</Text>
          </View>
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={80}>
        <View style={styles.section}>
          <InfoRow icon="calendar-outline" label={t("matches.date")} value={match.date} />
          <InfoRow icon="time-outline" label={t("matches.time")} value={match.time} />
          <InfoRow icon="location-outline" label={t("matches.location")} value={match.location} last />
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={140}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("matches.organizer")}</Text>
          <PressableScale
            onPress={() => { if (match.organizer?.id !== user?.id) navigation.getParent()?.navigate("PublicProfile", { userId: match.organizer?.id }); }}
            style={styles.userRow}
          >
            <Avatar uri={match.organizer?.profile_picture} name={match.organizer?.username} size={42} />
            <Text style={styles.userName}>{match.organizer?.username}</Text>
            <View style={styles.crownBadge}>
              <Ionicons name="star" size={12} color={colors.warning} />
            </View>
          </PressableScale>
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={200}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("matches.players")} ({match.players?.length || 0})</Text>
          {match.players && match.players.length > 0 ? match.players.map((p, i) => (
            <View key={p.id} style={[styles.playerRow, i === match.players.length - 1 && { borderBottomWidth: 0 }]}>
              <PressableScale
                onPress={() => { if (p.id !== user?.id) navigation.getParent()?.navigate("PublicProfile", { userId: p.id }); }}
                style={styles.userRow}
              >
                <Avatar uri={p.profile_picture} name={p.username} size={36} />
                <Text style={styles.userNameSmall}>{p.username}</Text>
              </PressableScale>
              {isOrganizer && match.status !== "completed" && p.id !== match.organizer?.id && (
                <PressableScale onPress={() => handleRemovePlayer(p.id, p.username)} scaleTo={0.85}>
                  <View style={styles.removeBtn}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </View>
                </PressableScale>
              )}
            </View>
          )) : <Text style={styles.emptyText}>{t("matches.noPlayers")}</Text>}
        </View>
      </AnimatedEntry>

      {isOrganizer && match.pending_requests?.length > 0 && (
        <AnimatedEntry delay={260}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("matches.pendingRequests", { count: match.pending_requests.length })}</Text>
            {match.pending_requests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <Avatar uri={req.user?.profile_picture} name={req.user?.username} size={40} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.userNameSmall}>{req.user?.username}</Text>
                  <Text style={styles.metaText}>★ {req.user?.average_rating ? req.user.average_rating.toFixed(1) : "—"}</Text>
                </View>
                <PressableScale onPress={() => handleRequestAction(req.id, "approve")} scaleTo={0.85}>
                  <LinearGradient colors={[colors.success, "#10b981"]} style={styles.iconBtn}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </LinearGradient>
                </PressableScale>
                <PressableScale onPress={() => handleRequestAction(req.id, "reject")} scaleTo={0.85}>
                  <View style={[styles.iconBtn, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.danger }]}>
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </View>
                </PressableScale>
              </View>
            ))}
          </View>
        </AnimatedEntry>
      )}

      <AnimatedEntry delay={320}>
        <View style={styles.actions}>
          {match.user_status === "none" && match.status === "open" && (
            <GradientButton label={t("matches.requestToJoin")} onPress={handleJoin} loading={actionLoading} icon={<Ionicons name="enter-outline" size={20} color="#fff" />} />
          )}
          {match.user_status === "pending" && (
            <View style={styles.pendingBadge}>
              <Ionicons name="hourglass-outline" size={18} color={colors.warning} />
              <Text style={styles.pendingText}>{t("matches.requestPending")}</Text>
            </View>
          )}
          {match.user_status === "player" && (match.status === "open" || match.status === "closed") && (
            <DangerBtn onPress={handleLeave} label={t("matches.leaveMatch")} loading={actionLoading} />
          )}
          {isOrganizer && (match.status === "open" || match.status === "closed") && (
            <>
              <GradientButton label={t("matches.markCompleted")} onPress={handleComplete} loading={actionLoading} icon={<Ionicons name="checkmark-done" size={20} color="#fff" />} />
              <DangerBtn onPress={handleCancel} label={t("matches.cancelMatch")} loading={actionLoading} />
            </>
          )}
          {match.status === "completed" && (isOrganizer || match.user_status === "player") && (
            <GradientButton label={t("matches.ratePlayers")} onPress={() => navigation.navigate("RatePlayers", { matchId: match.id, matchTitle: match.title })} icon={<Ionicons name="star-outline" size={20} color="#fff" />} />
          )}
        </View>
      </AnimatedEntry>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function DangerBtn({ onPress, label, loading }) {
  return (
    <PressableScale onPress={onPress} disabled={loading}>
      <View style={[styles.dangerBtn, loading && { opacity: 0.6 }]}>
        {loading ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.dangerBtnText}>{label}</Text>}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  headerCard: { padding: 18, marginHorizontal: 12, marginTop: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, ...shadows.sm },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, flex: 1, marginRight: 10, letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  description: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: "800" },

  section: { backgroundColor: colors.card, padding: 16, marginTop: 12, marginHorizontal: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  infoIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 13, color: colors.textMuted, flex: 1 },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: "600" },

  userRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  userName: { fontSize: 15, color: colors.text, fontWeight: "700" },
  userNameSmall: { fontSize: 14, color: colors.text, fontWeight: "600" },
  crownBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.warningSoft, alignItems: "center", justifyContent: "center" },
  metaText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  emptyText: { color: colors.textDim, fontSize: 13 },

  playerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" },

  requestCard: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  actions: { padding: 12, gap: 10, marginTop: 4 },
  pendingBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning, padding: 14, borderRadius: radius.md },
  pendingText: { color: colors.warning, fontSize: 14, fontWeight: "700" },
  dangerBtn: { backgroundColor: "transparent", borderRadius: radius.md, padding: 16, alignItems: "center", borderWidth: 1.5, borderColor: colors.danger },
  dangerBtnText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
});
