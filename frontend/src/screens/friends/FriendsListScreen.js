import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";
const avatarUrl = (pic) =>
  pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;

export default function FriendsListScreen({ navigation }) {
  const toast = useToast();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      const [friendsRes, reqRes] = await Promise.all([
        apiClient.get("/friends"),
        apiClient.get("/friends/requests"),
      ]);
      setFriends(friendsRes.data.data);
      setRequestCount(reqRes.data.data.incoming.length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFriends();
    }, [fetchFriends])
  );

  // Silent poll every 10s
  usePolling(fetchFriends, 10000);

  const debounceRef = useRef(null);

  const handleSearch = useCallback(async (q) => {
    if (q === undefined) q = searchQuery.trim();
    else q = q.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get(`/auth/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.data);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Auto-search with debounce as user types
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(text);
    }, 400);
  };

  const handleSendRequest = async (userId) => {
    try {
      await apiClient.post("/friends/request", { user_id: userId });
      toast.success("Friend request sent!");
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
  };

  const friendIds = new Set(friends.map((f) => f.id));

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.friendRow}
      onPress={() => navigation.navigate("PublicProfile", { userId: item.id })}
    >
      <Image source={{ uri: avatarUrl(item.profile_picture) }} style={styles.avatar} />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendRating}>
          Rating: {item.average_rating ? item.average_rating.toFixed(1) : "N/A"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => {
    const isFriend = friendIds.has(item.id);
    return (
      <View style={styles.friendRow}>
        <TouchableOpacity
          style={styles.friendRowInner}
          onPress={() => navigation.navigate("PublicProfile", { userId: item.id })}
        >
          <Image source={{ uri: avatarUrl(item.profile_picture) }} style={styles.avatar} />
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{item.username}</Text>
            <Text style={styles.friendRating}>
              Rating: {item.average_rating ? item.average_rating.toFixed(1) : "N/A"}
            </Text>
          </View>
        </TouchableOpacity>
        {isFriend ? (
          <Text style={styles.friendBadge}>Friends</Text>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => handleSendRequest(item.id)}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const showingSearch = searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by username..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch()}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Friend requests badge */}
      {requestCount > 0 && (
        <TouchableOpacity
          style={styles.requestsBanner}
          onPress={() => navigation.navigate("FriendRequests")}
        >
          <Text style={styles.requestsBannerText}>
            You have {requestCount} pending friend request{requestCount !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : showingSearch ? (
        searching ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSearchResult}
            contentContainerStyle={searchResults.length === 0 ? styles.centered : styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFriends(); handleSearch(); }} tintColor="#FF6B35" />}
          />
        )
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFriend}
          contentContainerStyle={friends.length === 0 ? styles.centered : styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No friends yet — search for users above!</Text>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFriends(); }} tintColor="#FF6B35" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#333",
  },
  searchBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "600" },
  requestsBanner: {
    backgroundColor: "#fef3e6",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  requestsBannerText: { color: "#FF6B35", fontWeight: "600", fontSize: 14 },
  list: { padding: 16 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  friendRowInner: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ddd" },
  friendInfo: { marginLeft: 12, flex: 1 },
  friendName: { fontSize: 16, fontWeight: "600", color: "#333" },
  friendRating: { fontSize: 13, color: "#888", marginTop: 2 },
  friendBadge: { color: "#27ae60", fontSize: 13, fontWeight: "600" },
  addBtn: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center" },
});
