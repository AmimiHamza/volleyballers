import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import apiClient from "../../api/client";
import { MatchListSkeleton } from "../../components/Skeleton";

const STATUS_COLORS = {
  open: "#27ae60",
  closed: "#f39c12",
  completed: "#3498db",
  cancelled: "#95a5a6",
};

const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "organizer", label: "Organized" },
  { key: "player", label: "Played" },
];

export default function MatchHistoryScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    setMatches([]);
    setPage(1);
    fetchHistory(1, false);
  }, [roleFilter]);

  const fetchHistory = async (p = 1, append = false) => {
    try {
      let url = `/auth/profile/history?page=${p}&per_page=20`;
      if (roleFilter !== "all") url += `&role=${roleFilter}`;
      const res = await apiClient.get(url);
      const data = res.data.data;
      if (append) {
        setMatches((prev) => [...prev, ...data.matches]);
      } else {
        setMatches(data.matches);
        setStats(data.stats);
      }
      setHasMore(data.page < data.pages);
      setPage(p);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchHistory(page + 1, true);
    }
  };

  const renderMatch = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] || "#95a5a6";
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("MatchesTab", {
          screen: "MatchDetail",
          params: { matchId: item.id },
        })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>{item.date} at {item.time}</Text>
        <Text style={styles.cardSub}>{item.location}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.playerCount}>{item.current_players}/{item.max_players} players</Text>
          <Text style={styles.roleTag}>{item.role === "organizer" ? "Organized" : "Played"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats banner */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.as_organizer}</Text>
            <Text style={styles.statLabel}>Organized</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.as_player}</Text>
            <Text style={styles.statLabel}>Played</Text>
          </View>
        </View>
      )}

      {/* Role filter tabs */}
      <View style={styles.filterRow}>
        {ROLE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, roleFilter === f.key && styles.filterTabActive]}
            onPress={() => setRoleFilter(f.key)}
          >
            <Text style={[styles.filterText, roleFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && matches.length === 0 ? (
        <MatchListSkeleton />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMatch}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(1); }}
              tintColor="#FF6B35"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No match history yet</Text>
            </View>
          }
          contentContainerStyle={matches.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#FF6B35" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  filterRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterTabActive: { backgroundColor: "#FF6B35" },
  filterText: { fontSize: 14, color: "#666", fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 16,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cardSub: { fontSize: 13, color: "#888", marginBottom: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  playerCount: { fontSize: 13, color: "#666" },
  roleTag: { fontSize: 13, color: "#FF6B35", fontWeight: "600" },
  emptyText: { fontSize: 16, color: "#999" },
});
