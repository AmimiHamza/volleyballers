import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";
import { UserListSkeleton } from "../../components/Skeleton";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";
const avatarUrl = (pic) =>
  pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;

function getRatingColor(rating) {
  if (!rating) return "#bbb";
  if (rating >= 4) return "#27ae60";
  if (rating >= 3) return "#f39c12";
  return "#e74c3c";
}

export default function FriendsScreen({ navigation }) {
  const toast = useToast();
  const [tab, setTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestTab, setRequestTab] = useState("incoming");
  const debounceRef = useRef(null);
  const tabIndicator = useRef(new Animated.Value(0)).current;

  const fetchAll = useCallback(async () => {
    try {
      const [friendsRes, reqRes] = await Promise.all([
        apiClient.get("/friends"),
        apiClient.get("/friends/requests"),
      ]);
      setFriends(friendsRes.data.data);
      setIncoming(reqRes.data.data.incoming);
      setOutgoing(reqRes.data.data.outgoing);
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
      fetchAll();
    }, [fetchAll])
  );

  usePolling(fetchAll, 10000);

  const switchTab = (t) => {
    setTab(t);
    Animated.spring(tabIndicator, {
      toValue: t === "friends" ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  // Search
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get(`/auth/search?q=${encodeURIComponent(text.trim())}`);
        setSearchResults(res.data.data);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSendRequest = async (userId) => {
    try {
      await apiClient.post("/friends/request", { user_id: userId });
      toast.success("Friend request sent!");
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await apiClient.put(`/friends/requests/${requestId}`, { action });
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  const friendIds = new Set(friends.map((f) => f.id));
  const requestCount = incoming.length + outgoing.length;

  // ── Renderers ──────────────────────────────────────────────────────────────

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      activeOpacity={0.6}
      onPress={() => navigation.navigate("PublicProfile", { userId: item.id })}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatarUrl(item.profile_picture) }} style={styles.avatar} />
        <View style={[styles.ratingDot, { backgroundColor: getRatingColor(item.average_rating) }]} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userMeta}>
          {item.average_rating ? `★ ${item.average_rating.toFixed(1)}` : "No rating"}
          {item.total_matches ? `  ·  ${item.total_matches} matches` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => {
    const isFriend = friendIds.has(item.id);
    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userCardInner}
          activeOpacity={0.6}
          onPress={() => navigation.navigate("PublicProfile", { userId: item.id })}
        >
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUrl(item.profile_picture) }} style={styles.avatar} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.username}</Text>
            <Text style={styles.userMeta}>
              {item.average_rating ? `★ ${item.average_rating.toFixed(1)}` : "New player"}
            </Text>
          </View>
        </TouchableOpacity>
        {isFriend ? (
          <View style={styles.friendBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
            <Text style={styles.friendBadgeText}>Friends</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => handleSendRequest(item.id)}>
            <Ionicons name="person-add" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderIncoming = ({ item }) => (
    <View style={styles.requestCard}>
      <TouchableOpacity
        style={styles.userCardInner}
        activeOpacity={0.6}
        onPress={() => navigation.navigate("PublicProfile", { userId: item.user.id })}
      >
        <Image source={{ uri: avatarUrl(item.user.profile_picture) }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user.username}</Text>
          <Text style={styles.userMeta}>
            {item.user.average_rating ? `★ ${item.user.average_rating.toFixed(1)}` : "New player"}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleRequestAction(item.id, "accept")}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineBtn}
          onPress={() => handleRequestAction(item.id, "decline")}
        >
          <Ionicons name="close" size={20} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOutgoing = ({ item }) => (
    <View style={styles.requestCard}>
      <TouchableOpacity
        style={styles.userCardInner}
        activeOpacity={0.6}
        onPress={() => navigation.navigate("PublicProfile", { userId: item.user.id })}
      >
        <Image source={{ uri: avatarUrl(item.user.profile_picture) }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user.username}</Text>
          <Text style={styles.pendingLabel}>Pending...</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => handleRequestAction(item.id, "decline")}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Search overlay ────────────────────────────────────────────────────────

  const showingSearch = searchQuery.trim().length > 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Friends</Text>
        </View>
        <UserListSkeleton count={6} />
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  const tabTranslateX = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search results overlay */}
      {showingSearch ? (
        searching ? (
          <UserListSkeleton count={3} />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSearchResult}
            contentContainerStyle={searchResults.length === 0 ? styles.centered : styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, tab === "friends" && styles.tabActive]}
              onPress={() => switchTab("friends")}
            >
              <Text style={[styles.tabText, tab === "friends" && styles.tabTextActive]}>
                Friends
              </Text>
              <Text style={[styles.tabCount, tab === "friends" && styles.tabCountActive]}>
                {friends.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "requests" && styles.tabActive]}
              onPress={() => switchTab("requests")}
            >
              <Text style={[styles.tabText, tab === "requests" && styles.tabTextActive]}>
                Requests
              </Text>
              {requestCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          {tab === "friends" ? (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFriend}
              contentContainerStyle={friends.length === 0 ? styles.centered : styles.list}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-outline" size={48} color="#ddd" />
                  <Text style={styles.emptyText}>No friends yet</Text>
                  <Text style={styles.emptySubtext}>Search for users above to add friends</Text>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#FF6B35" />
              }
            />
          ) : (
            <View style={{ flex: 1 }}>
              {/* Request sub-tabs */}
              <View style={styles.subTabBar}>
                <TouchableOpacity
                  style={[styles.subTab, requestTab === "incoming" && styles.subTabActive]}
                  onPress={() => setRequestTab("incoming")}
                >
                  <Text style={[styles.subTabText, requestTab === "incoming" && styles.subTabTextActive]}>
                    Incoming ({incoming.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, requestTab === "outgoing" && styles.subTabActive]}
                  onPress={() => setRequestTab("outgoing")}
                >
                  <Text style={[styles.subTabText, requestTab === "outgoing" && styles.subTabTextActive]}>
                    Outgoing ({outgoing.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={requestTab === "incoming" ? incoming : outgoing}
                keyExtractor={(item) => item.id.toString()}
                renderItem={requestTab === "incoming" ? renderIncoming : renderOutgoing}
                contentContainerStyle={
                  (requestTab === "incoming" ? incoming : outgoing).length === 0
                    ? styles.centered
                    : styles.list
                }
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Ionicons name="mail-outline" size={48} color="#ddd" />
                    <Text style={styles.emptyText}>No {requestTab} requests</Text>
                  </View>
                }
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#FF6B35" />
                }
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  // Search
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    padding: 0,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#FF6B35",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#999",
  },
  tabTextActive: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  tabCount: {
    fontSize: 13,
    color: "#bbb",
    marginLeft: 6,
    fontWeight: "500",
  },
  tabCountActive: {
    color: "#999",
  },
  badge: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Sub-tabs (requests)
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  subTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f2f2f7",
  },
  subTabActive: {
    backgroundColor: "#FF6B35",
  },
  subTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  subTabTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  // Lists
  list: { paddingBottom: 20 },

  // User cards
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  userCardInner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
  },
  ratingDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  userMeta: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },

  // Friend badge (search results)
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  friendBadgeText: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "500",
  },

  // Add button
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },

  // Request cards
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#27ae60",
    justifyContent: "center",
    alignItems: "center",
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#f2f2f7",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#e74c3c",
  },
  pendingLabel: {
    fontSize: 13,
    color: "#f39c12",
    marginTop: 2,
  },

  // Empty states
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#ccc",
    marginTop: 4,
  },
});
