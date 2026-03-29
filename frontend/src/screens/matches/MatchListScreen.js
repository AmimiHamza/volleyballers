import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { MatchListSkeleton } from "../../components/Skeleton";

export default function MatchListScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const isFirstLoad = useRef(true);

  const fetchMatches = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const params = { page: pageNum, per_page: 15, status: statusFilter };
        if (locationFilter.trim()) params.location = locationFilter.trim();

        const res = await apiClient.get("/matches", { params });
        const data = res.data.data;

        if (append) {
          setMatches((prev) => [...prev, ...data.matches]);
        } else {
          setMatches(data.matches);
        }
        setTotalPages(data.pages);
        setPage(pageNum);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        isFirstLoad.current = false;
      }
    },
    [locationFilter, statusFilter]
  );

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      fetchMatches(1);
    }, [fetchMatches])
  );

  // Silent poll every 8s while screen is focused
  usePolling(() => fetchMatches(1), 8000);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches(1);
  };

  const onEndReached = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      fetchMatches(page + 1, true);
    }
  };

  const statusOptions = ["open", "closed", "completed"];

  const renderMatch = ({ item }) => {
    const statusColor =
      item.status === "open" ? "#27ae60" : item.status === "closed" ? "#f39c12" : "#95a5a6";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("MatchDetail", { matchId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardDate}>
          {item.date} at {item.time}
        </Text>
        <Text style={styles.cardLocation} numberOfLines={1}>
          {item.location}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.playerCount}>
            {item.current_players}/{item.max_players} players
          </Text>
          <Text style={styles.organizer}>by {item.organizer?.username}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by location..."
          placeholderTextColor="#999"
          value={locationFilter}
          onChangeText={setLocationFilter}
          onSubmitEditing={() => { setLoading(true); fetchMatches(1); }}
          returnKeyType="search"
        />
      </View>
      <View style={styles.statusBar}>
        {statusOptions.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusChip, statusFilter === s && styles.statusChipActive]}
            onPress={() => {
              setStatusFilter(s);
              setLoading(true);
            }}
          >
            <Text style={[styles.statusChipText, statusFilter === s && styles.statusChipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <MatchListSkeleton />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMatch}
          contentContainerStyle={matches.length === 0 ? styles.centered : styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No matches found</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#FF6B35" style={{ margin: 16 }} /> : null}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateMatch")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterBar: { paddingHorizontal: 16, paddingTop: 12 },
  filterInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#333",
  },
  statusBar: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  statusChipActive: { backgroundColor: "#FF6B35" },
  statusChipText: { fontSize: 13, color: "#555" },
  statusChipTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: "bold", color: "#333", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardDate: { fontSize: 14, color: "#555", marginBottom: 4 },
  cardLocation: { fontSize: 14, color: "#888", marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  playerCount: { fontSize: 13, color: "#FF6B35", fontWeight: "600" },
  organizer: { fontSize: 13, color: "#aaa" },
  emptyText: { fontSize: 16, color: "#888" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
