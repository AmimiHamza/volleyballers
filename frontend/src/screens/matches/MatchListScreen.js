import React, { useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, RefreshControl, Animated, Easing,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { colors, radius, shadows } from "../../theme";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";

export default function MatchListScreen({ navigation }) {
  const { t } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CreateMatch")} style={{ marginRight: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

  // Pulse animation for FAB
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const fetchMatches = useCallback(async (pageNum = 1, append = false) => {
    try {
      const params = { page: pageNum, per_page: 15, status: statusFilter };
      if (locationFilter.trim()) params.location = locationFilter.trim();
      const res = await apiClient.get("/matches", { params });
      const data = res.data.data;
      if (append) setMatches((prev) => [...prev, ...data.matches]);
      else setMatches(data.matches);
      setTotalPages(data.pages);
      setPage(pageNum);
    } catch { } finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [locationFilter, statusFilter]);

  useFocusEffect(useCallback(() => { fetchMatches(1); }, [fetchMatches]));
  usePolling(() => fetchMatches(1), 8000);

  const statusOptions = ["open", "closed", "completed"];
  const statusLabels = { open: t("matches.open"), closed: t("matches.closed"), completed: t("matches.completed") };

  const renderMatch = ({ item, index }) => {
    const progress = (item.current_players / item.max_players) * 100;
    const stage = progress >= 90 ? colors.danger : progress >= 70 ? colors.warning : colors.success;
    const statusColor = item.status === "open" ? colors.success : item.status === "closed" ? colors.warning : colors.info;
    return (
      <AnimatedEntry delay={index * 40}>
        <PressableScale
          onPress={() => navigation.navigate("MatchDetail", { matchId: item.id })}
          style={styles.card}
        >
          <View style={[styles.cardStripe, { backgroundColor: statusColor }]} />
          <View style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "26" }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabels[item.status] || item.status}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.date} · {item.time}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: stage }]} />
              </View>
              <Text style={[styles.progressText, { color: stage }]}>{item.current_players}/{item.max_players}</Text>
            </View>
          </View>
        </PressableScale>
      </AnimatedEntry>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("matches.filterPlaceholder")}
            placeholderTextColor={colors.textDim}
            value={locationFilter}
            onChangeText={setLocationFilter}
            onSubmitEditing={() => { setLoading(true); fetchMatches(1); }}
            returnKeyType="search"
          />
          {locationFilter.length > 0 && (
            <TouchableOpacity onPress={() => { setLocationFilter(""); setLoading(true); fetchMatches(1); }}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.statusBar}>
        {statusOptions.map((s) => (
          <PressableScale key={s} onPress={() => { setStatusFilter(s); setLoading(true); }} style={{ flex: 1 }}>
            <View style={[styles.statusChip, statusFilter === s && styles.statusChipActive]}>
              <Text style={[styles.statusChipText, statusFilter === s && styles.statusChipTextActive]}>
                {statusLabels[s]}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMatch}
          contentContainerStyle={matches.length === 0 ? styles.centered : { padding: 16, paddingBottom: 120, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="volleyball" size={56} color={colors.textDim} />
              <Text style={styles.emptyText}>{t("matches.noMatches")}</Text>
              <PressableScale onPress={() => navigation.navigate("CreateMatch")} style={{ marginTop: 8 }}>
                <LinearGradient colors={colors.gradPrimary} style={styles.emptyBtn}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>{t("matches.createMatchBtn")}</Text>
                </LinearGradient>
              </PressableScale>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMatches(1); }} tintColor={colors.primary} />}
          onEndReached={() => { if (page < totalPages && !loadingMore) { setLoadingMore(true); fetchMatches(page + 1, true); } }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
        />
      )}

      <Animated.View style={[styles.fabWrap, { transform: [{ scale: pulse }] }]}>
        <PressableScale onPress={() => navigation.navigate("CreateMatch")} scaleTo={0.9}>
          <LinearGradient
            colors={colors.gradPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, shadows.glow]}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterBar: { paddingHorizontal: 16, paddingTop: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  statusBar: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  statusChip: {
    paddingVertical: 9, alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 13, color: colors.textMuted, fontWeight: "700" },
  statusChipTextActive: { color: "#fff" },

  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  metaText: { fontSize: 12, color: colors.textMuted },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  progressBar: { flex: 1, height: 5, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: "800" },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  empty: { alignItems: "center", gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.pill },
  emptyBtnText: { color: "#fff", fontWeight: "700" },

  fabWrap: { position: "absolute", bottom: 24, right: 20 },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
  },
});
