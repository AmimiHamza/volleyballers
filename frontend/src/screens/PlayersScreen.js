import React, { useState, useCallback, useRef, memo, useMemo } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import apiClient from "../api/client";
import { colors, radius, shadows } from "../theme";
import InviteToMatchModal from "../components/InviteToMatchModal";
import Avatar from "../components/Avatar";
import PressableScale from "../components/PressableScale";
import { UserListSkeleton } from "../components/Skeleton";

const SORTS = [
  { key: "top", labelKey: "players.sortTop", icon: "trophy" },
  { key: "new", labelKey: "players.sortNew", icon: "star" },
  { key: "recent", labelKey: "players.sortRecent", icon: "time" },
];

const ITEM_HEIGHT = 86; // card height (74 content + 12 gap) — used for getItemLayout

function ratingRingColor(rating) {
  if (!rating) return colors.borderStrong;
  if (rating >= 4) return colors.success;
  if (rating >= 3) return colors.warning;
  return colors.danger;
}

const PlayerCard = memo(function PlayerCard({ item, onPressProfile, onInvite, t }) {
  return (
    <View style={styles.card}>
      <PressableScale
        onPress={onPressProfile}
        onLongPress={onInvite}
        style={styles.cardInner}
      >
        <Avatar uri={item.profile_picture} name={item.username} size={48} ring ringColor={ratingRingColor(item.average_rating)} />
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.username}</Text>
          {item.city ? (
            <View style={styles.metaRow}>
              <Ionicons name="location" size={11} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.city}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>★ {item.average_rating ? item.average_rating.toFixed(1) : "—"}</Text>
            </View>
            <Text style={styles.metaText}>{item.total_matches} {t("players.matches")}</Text>
          </View>
        </View>
      </PressableScale>
      <PressableScale onPress={onInvite} scaleTo={0.9}>
        <LinearGradient colors={colors.gradPrimary} style={styles.inviteBtn}>
          <Ionicons name="add" size={18} color="#fff" />
        </LinearGradient>
      </PressableScale>
    </View>
  );
});

export default function PlayersScreen({ navigation }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true); // only true the first time
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("top");
  const [inviteUser, setInviteUser] = useState(null);
  const debounceRef = useRef(null);
  const fetchSeqRef = useRef(0); // race-condition guard

  const fetchUsers = useCallback(async (p = 1, append = false) => {
    const seq = ++fetchSeqRef.current;
    try {
      const params = { page: p, per_page: 24, sort };
      if (search.trim()) params.q = search.trim();
      const res = await apiClient.get("/users", { params });
      if (seq !== fetchSeqRef.current) return; // stale response — ignore
      const data = res.data.data;
      if (append) setUsers((prev) => [...prev, ...data.users]);
      else setUsers(data.users);
      setHasMore(data.page < data.pages);
      setPage(p);
    } catch { } finally {
      if (seq === fetchSeqRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [search, sort]);

  useFocusEffect(useCallback(() => { fetchUsers(1); }, [fetchUsers]));

  const handleSearchChange = (text) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(1), 350);
  };

  const handleSortChange = useCallback((s) => setSort(s), []);

  const renderUser = useCallback(({ item }) => (
    <PlayerCard
      item={item}
      onPressProfile={() => navigation.getParent()?.getParent()?.navigate("PublicProfile", { userId: item.id })}
      onInvite={() => setInviteUser(item)}
      t={t}
    />
  ), [navigation, t]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("players.title")}</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("players.searchPlaceholder")}
            placeholderTextColor={colors.textDim}
            value={search}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(""); fetchUsers(1); }}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.sortRow}>
        {SORTS.map((s) => {
          const active = sort === s.key;
          return (
            <PressableScale key={s.key} onPress={() => handleSortChange(s.key)} style={{ flex: 1 }}>
              <View style={[styles.sortChip, active && styles.sortChipActive]}>
                <Ionicons name={s.icon} size={13} color={active ? "#fff" : colors.textMuted} />
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {t(s.labelKey)}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {initialLoading ? (
        <UserListSkeleton count={8} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={keyExtractor}
          renderItem={renderUser}
          getItemLayout={getItemLayout}
          contentContainerStyle={users.length === 0 ? styles.centered : { padding: 16, gap: 10, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={colors.textDim} />
              <Text style={styles.emptyText}>{t("players.noPlayers")}</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(1); }} tintColor={colors.primary} />}
          onEndReached={() => { if (hasMore) fetchUsers(page + 1, true); }}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      )}

      <InviteToMatchModal
        visible={!!inviteUser}
        user={inviteUser}
        onClose={() => setInviteUser(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },

  sortRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginVertical: 8 },
  sortChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  sortChipTextActive: { color: "#fff" },

  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1, borderColor: colors.border,
    height: 74,
  },
  cardInner: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  userInfo: { flex: 1, gap: 3 },
  userName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  metaText: { color: colors.textMuted, fontSize: 12 },
  statBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statBadgeText: { color: colors.primary, fontSize: 11, fontWeight: "800" },

  inviteBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    ...shadows.glowSubtle,
  },

  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
