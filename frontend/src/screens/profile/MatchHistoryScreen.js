import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import { colors, radius } from "../../theme";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";
import { MatchListSkeleton } from "../../components/Skeleton";

const STATUS_COLORS = { open: colors.success, closed: colors.warning, completed: colors.info, cancelled: colors.danger };

export default function MatchHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  const ROLE_FILTERS = [
    { key: "all", label: t("history.all"), icon: "apps" },
    { key: "organizer", label: t("history.organized"), icon: "construct" },
    { key: "player", label: t("history.played"), icon: "play" },
  ];

  useEffect(() => { setLoading(true); setMatches([]); setPage(1); fetchHistory(1, false); }, [roleFilter]);

  const fetchHistory = async (p = 1, append = false) => {
    try {
      let url = `/auth/profile/history?page=${p}&per_page=20`;
      if (roleFilter !== "all") url += `&role=${roleFilter}`;
      const res = await apiClient.get(url);
      const data = res.data.data;
      if (append) setMatches((prev) => [...prev, ...data.matches]);
      else { setMatches(data.matches); setStats(data.stats); }
      setHasMore(data.page < data.pages);
      setPage(p);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  };

  const renderMatch = ({ item, index }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.textMuted;
    const statusLabel = t(`matches.${item.status}`) || item.status;
    return (
      <AnimatedEntry delay={index * 30}>
        <PressableScale
          onPress={() => navigation.getParent()?.navigate("MatchesTab", { screen: "MatchDetail", params: { matchId: item.id } })}
          style={styles.card}
        >
          <View style={[styles.stripe, { backgroundColor: statusColor }]} />
          <View style={styles.inner}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor + "26" }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={styles.cardSub}>{item.date} · {item.time}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.cardSub} numberOfLines={1}>{item.location}</Text>
            </View>
            <View style={styles.cardFooter}>
              <View style={[styles.roleBadge, item.role === "organizer" ? styles.roleOrganizer : styles.rolePlayer]}>
                <Ionicons name={item.role === "organizer" ? "construct" : "play"} size={11} color={item.role === "organizer" ? colors.warning : colors.info} />
                <Text style={[styles.roleText, { color: item.role === "organizer" ? colors.warning : colors.info }]}>
                  {item.role === "organizer" ? t("history.organized") : t("history.played")}
                </Text>
              </View>
            </View>
          </View>
        </PressableScale>
      </AnimatedEntry>
    );
  };

  return (
    <View style={styles.container}>
      {stats && (
        <AnimatedEntry>
          <View style={styles.statsRow}>
            <Stat value={stats.total_matches ?? stats.total} label={t("history.total")} icon="layers" highlight />
            <View style={styles.statSep} />
            <Stat value={stats.as_organizer} label={t("history.organized")} icon="construct" />
            <View style={styles.statSep} />
            <Stat value={stats.as_player} label={t("history.played")} icon="play" />
          </View>
        </AnimatedEntry>
      )}
      <View style={styles.filterRow}>
        {ROLE_FILTERS.map((f) => (
          <PressableScale key={f.key} onPress={() => setRoleFilter(f.key)} style={{ flex: 1 }}>
            <View style={[styles.filterTab, roleFilter === f.key && styles.filterTabActive]}>
              <Ionicons name={f.icon} size={13} color={roleFilter === f.key ? "#fff" : colors.textMuted} />
              <Text style={[styles.filterText, roleFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </View>
          </PressableScale>
        ))}
      </View>
      {loading && matches.length === 0 ? <MatchListSkeleton count={4} /> : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMatch}
          contentContainerStyle={matches.length === 0 ? { flex: 1, justifyContent: "center", alignItems: "center" } : { padding: 12, gap: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(1); }} tintColor={colors.primary} />}
          onEndReached={() => { if (hasMore && !loading) fetchHistory(page + 1, true); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={styles.emptyIcon}><MaterialCommunityIcons name="volleyball" size={36} color={colors.primary} /></View>
              <Text style={styles.emptyText}>{t("history.noHistory")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function Stat({ value, label, icon, highlight }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIconWrap, highlight && { backgroundColor: colors.primarySoftStrong }]}>
        <Ionicons name={icon} size={14} color={highlight ? colors.primary : colors.textMuted} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statsRow: { flexDirection: "row", backgroundColor: colors.card, marginHorizontal: 12, marginTop: 12, borderRadius: radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  statSep: { width: 1, backgroundColor: colors.border, marginVertical: 6 },

  filterRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  filterTab: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 9, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textMuted, fontWeight: "700" },
  filterTextActive: { color: "#fff" },

  card: { flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  stripe: { width: 4 },
  inner: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  cardSub: { fontSize: 12, color: colors.textMuted },
  cardFooter: { flexDirection: "row", marginTop: 10 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleOrganizer: { backgroundColor: colors.warningSoft },
  rolePlayer: { backgroundColor: colors.infoSoft },
  roleText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },

  emptyIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
