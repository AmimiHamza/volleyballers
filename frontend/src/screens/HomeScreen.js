import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius, shadows } from "../theme";
import Avatar from "../components/Avatar";
import PressableScale from "../components/PressableScale";
import AnimatedEntry from "../components/AnimatedEntry";

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [potm, setPotm] = useState(null);
  const [matches, setMatches] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [potmRes, matchesRes, alertsRes] = await Promise.all([
        apiClient.get("/users/player-of-month"),
        apiClient.get("/matches/nearby?per_page=8"),
        apiClient.get("/notifications?page=1&per_page=1"),
      ]);
      setPotm(potmRes.data.data);
      setMatches(matchesRes.data.data.matches || []);
      setUnreadAlerts(alertsRes.data.data.unread_count || 0);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const goProfile = () => navigation.getParent()?.navigate("ProfileTab");
  const goMatches = () => navigation.getParent()?.navigate("MatchesTab");
  const goPlayers = () => navigation.getParent()?.navigate("PlayersTab");
  const goAlerts = () => navigation.navigate("Notifications");
  const goCreate = () => navigation.getParent()?.navigate("MatchesTab", { screen: "CreateMatch" });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <AnimatedEntry style={styles.topBar} delay={0}>
          <PressableScale onPress={goProfile}>
            <Avatar uri={user?.profile_picture} name={user?.username} size={44} ring ringColor={colors.primary} />
          </PressableScale>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.greeting}>{t("home.greeting", { name: user?.username || "" })}</Text>
            {user?.city ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={11} color={colors.textMuted} />
                <Text style={styles.locationText}>{user.city}</Text>
              </View>
            ) : (
              <Text style={styles.locationText}>{t("home.setCityPrompt")}</Text>
            )}
          </View>
          <PressableScale onPress={goAlerts}>
            <View style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unreadAlerts > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadAlerts > 9 ? "9+" : unreadAlerts}</Text>
                </View>
              )}
            </View>
          </PressableScale>
        </AnimatedEntry>

        {/* Hero — what are you looking for */}
        <AnimatedEntry delay={80}>
          <Text style={styles.sectionTitle}>{t("home.lookingFor")}</Text>
          <View style={styles.heroRow}>
            <PressableScale onPress={goMatches} style={{ flex: 1 }}>
              <LinearGradient
                colors={colors.gradHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, shadows.glow]}
              >
                <View style={styles.heroIconWrap}>
                  <MaterialCommunityIcons name="volleyball" size={28} color="#fff" />
                </View>
                <View style={styles.heroDecor} />
                <View>
                  <Text style={styles.heroTitle}>{t("home.browseMatches")}</Text>
                  <Text style={styles.heroDesc}>{t("home.browseMatchesDesc")}</Text>
                </View>
              </LinearGradient>
            </PressableScale>
            <PressableScale onPress={goPlayers} style={{ flex: 1 }}>
              <View style={[styles.heroCard, styles.heroSecondary]}>
                <View style={[styles.heroIconWrap, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="people" size={26} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>{t("home.browsePlayers")}</Text>
                  <Text style={[styles.heroDesc, { color: colors.textMuted }]}>{t("home.browsePlayersDesc")}</Text>
                </View>
              </View>
            </PressableScale>
          </View>
        </AnimatedEntry>

        {/* Player of the month */}
        {potm && (
          <AnimatedEntry delay={160}>
            <PressableScale onPress={() => navigation.getParent()?.getParent()?.navigate("PublicProfile", { userId: potm.id })}>
              <LinearGradient
                colors={colors.gradPotm}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.potmCard, shadows.glowSubtle]}
              >
                <View style={styles.potmTrophy}>
                  <Ionicons name="trophy" size={22} color="#fff" />
                </View>
                <View style={styles.potmContent}>
                  <Text style={styles.potmLabel}>{t("home.playerOfMonth")}</Text>
                  <View style={styles.potmRow}>
                    <Avatar uri={potm.profile_picture} name={potm.username} size={40} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.potmName}>{potm.username}</Text>
                      <Text style={styles.potmStats}>
                        ★ {potm.average_rating?.toFixed(1) || "—"} · {potm.match_count} {t("players.matches")}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
              </LinearGradient>
            </PressableScale>
          </AnimatedEntry>
        )}

        {/* Matches near you */}
        <AnimatedEntry delay={240}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("home.matchesNearYou")}</Text>
            <TouchableOpacity onPress={goMatches}>
              <Text style={styles.viewAll}>{t("home.viewAll")} →</Text>
            </TouchableOpacity>
          </View>
        </AnimatedEntry>

        {!user?.city ? (
          <AnimatedEntry delay={300}>
            <View style={styles.emptyCard}>
              <Ionicons name="location-outline" size={40} color={colors.textDim} />
              <Text style={styles.emptyText}>{t("home.setCityPrompt")}</Text>
              <PressableScale
                onPress={() => navigation.getParent()?.navigate("ProfileTab", { screen: "EditProfile" })}
                style={{ marginTop: 8 }}
              >
                <LinearGradient colors={colors.gradPrimary} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>{t("home.setCityBtn")}</Text>
                </LinearGradient>
              </PressableScale>
            </View>
          </AnimatedEntry>
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : matches.length === 0 ? (
          <AnimatedEntry delay={300}>
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="volleyball" size={40} color={colors.textDim} />
              <Text style={styles.emptyText}>{t("home.noNearbyMatches")}</Text>
              <PressableScale onPress={goCreate} style={{ marginTop: 8 }}>
                <LinearGradient colors={colors.gradPrimary} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>{t("matches.createMatchBtn")}</Text>
                </LinearGradient>
              </PressableScale>
            </View>
          </AnimatedEntry>
        ) : (
          matches.map((m, i) => (
            <AnimatedEntry key={m.id} delay={300 + i * 50}>
              <MatchRow match={m} navigation={navigation} t={t} />
            </AnimatedEntry>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function MatchRow({ match, navigation, t }) {
  const progress = (match.current_players / match.max_players) * 100;
  const stage = progress >= 90 ? colors.danger : progress >= 70 ? colors.warning : colors.success;
  const statusColor =
    match.status === "open" ? colors.success :
    match.status === "closed" ? colors.warning : colors.info;
  return (
    <PressableScale
      onPress={() => navigation.getParent()?.navigate("MatchesTab", { screen: "MatchDetail", params: { matchId: match.id } })}
      style={styles.matchCard}
    >
      <View style={[styles.matchStripe, { backgroundColor: statusColor }]} />
      <View style={styles.matchInner}>
        <View style={styles.matchTop}>
          <Text style={styles.matchTitle} numberOfLines={1}>{match.title}</Text>
          <View style={[styles.matchStatusBadge, { backgroundColor: statusColor + "26" }]}>
            <Text style={[styles.matchStatusText, { color: statusColor }]}>{match.status}</Text>
          </View>
        </View>
        <View style={styles.matchInfoRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={styles.matchInfoText}>{match.date} · {match.time}</Text>
        </View>
        <View style={styles.matchInfoRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.matchInfoText} numberOfLines={1}>{match.location}</Text>
        </View>
        <View style={styles.matchProgressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stage }]} />
          </View>
          <Text style={[styles.progressText, { color: stage }]}>
            {match.current_players}/{match.max_players}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: 50, paddingHorizontal: 16 },

  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 26 },
  greeting: { color: colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  locationText: { color: colors.textMuted, fontSize: 12 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  bellBadge: {
    position: "absolute", top: 4, right: 4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: colors.bg,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12, letterSpacing: -0.2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 12 },
  viewAll: { color: colors.primary, fontSize: 13, fontWeight: "700" },

  // Hero cards
  heroRow: { flexDirection: "row", gap: 12 },
  heroCard: {
    borderRadius: radius.xl,
    padding: 18,
    minHeight: 150,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  heroIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  heroDecor: {
    position: "absolute",
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: -30, bottom: -30,
  },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },

  // POTM
  potmCard: {
    flexDirection: "row",
    borderRadius: radius.xl,
    padding: 14, gap: 12, marginTop: 18,
    overflow: "hidden",
  },
  potmTrophy: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  potmContent: { flex: 1, justifyContent: "center" },
  potmLabel: { color: "rgba(255,255,255,0.95)", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  potmRow: { flexDirection: "row", alignItems: "center" },
  potmName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  potmStats: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  // Match cards
  matchCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  matchStripe: { width: 4 },
  matchInner: { flex: 1, padding: 14 },
  matchTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  matchTitle: { color: colors.text, fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  matchStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  matchStatusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  matchInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  matchInfoText: { color: colors.textMuted, fontSize: 12 },
  matchProgressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  progressBar: { flex: 1, height: 5, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: "800" },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 30,
    alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
    gap: 10,
  },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: radius.pill },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
