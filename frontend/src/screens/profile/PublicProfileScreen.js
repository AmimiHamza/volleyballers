import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import apiClient from "../../api/client";
import { showConfirm } from "../../utils/alert";
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileSkeleton } from "../../components/Skeleton";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=128";

export default function PublicProfileScreen({ route }) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null); // null | "none" | "pending_sent" | "pending_received" | "accepted"
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [profileRes, friendsRes, requestsRes] = await Promise.all([
        apiClient.get(`/auth/users/${userId}`),
        apiClient.get("/friends"),
        apiClient.get("/friends/requests"),
      ]);
      setProfile(profileRes.data.data);

      // Determine friend status
      const friends = friendsRes.data.data;
      const isFriend = friends.some((f) => f.id === userId);
      if (isFriend) {
        setFriendStatus("accepted");
      } else {
        const { incoming, outgoing } = requestsRes.data.data;
        const sentToThisUser = outgoing.some((r) => r.user.id === userId);
        const receivedFromThisUser = incoming.some((r) => r.user.id === userId);
        if (sentToThisUser) {
          setFriendStatus("pending_sent");
        } else if (receivedFromThisUser) {
          setFriendStatus("pending_received");
        } else {
          setFriendStatus("none");
        }
      }
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      await apiClient.post("/friends/request", { user_id: userId });
      setFriendStatus("pending_sent");
      toast.success("Friend request sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setActionLoading(true);
    try {
      const reqRes = await apiClient.get("/friends/requests");
      const incoming = reqRes.data.data.incoming;
      const req = incoming.find((r) => r.user.id === userId);
      if (req) {
        await apiClient.put(`/friends/requests/${req.id}`, { action: "accept" });
        setFriendStatus("accepted");
        toast.success("Friend request accepted!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    showConfirm("Unfriend", `Remove ${profile?.username} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unfriend",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiClient.delete(`/friends/${userId}`);
            setFriendStatus("none");
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to unfriend");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }


  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const avatarUri = profile.profile_picture
    ? `${API_BASE_URL.replace("/api", "")}${profile.profile_picture}`
    : DEFAULT_AVATAR;

  const isOwnProfile = currentUser?.id === userId;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <Text style={styles.username}>{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.total_matches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile.average_rating ? profile.average_rating.toFixed(1) : "N/A"}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Friend action button */}
      {!isOwnProfile && friendStatus && (
        <View style={styles.actionSection}>
          {friendStatus === "none" && (
            <TouchableOpacity
              style={[styles.addBtn, actionLoading && styles.btnDisabled]}
              onPress={handleAddFriend}
              disabled={actionLoading}
            >
              <Text style={styles.addBtnText}>Add Friend</Text>
            </TouchableOpacity>
          )}
          {friendStatus === "pending_sent" && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Friend request sent</Text>
            </View>
          )}
          {friendStatus === "pending_received" && (
            <TouchableOpacity
              style={[styles.acceptBtn, actionLoading && styles.btnDisabled]}
              onPress={handleAcceptRequest}
              disabled={actionLoading}
            >
              <Text style={styles.acceptBtnText}>Accept Friend Request</Text>
            </TouchableOpacity>
          )}
          {friendStatus === "accepted" && (
            <TouchableOpacity
              style={[styles.unfriendBtn, actionLoading && styles.btnDisabled]}
              onPress={handleUnfriend}
              disabled={actionLoading}
            >
              <Text style={styles.unfriendBtnText}>Unfriend</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#888" },
  header: { alignItems: "center", paddingTop: 30, paddingBottom: 20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ddd",
    marginBottom: 12,
  },
  username: { fontSize: 24, fontWeight: "bold", color: "#333" },
  bio: { fontSize: 14, color: "#666", marginTop: 6, paddingHorizontal: 40, textAlign: "center" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "bold", color: "#FF6B35" },
  statLabel: { fontSize: 13, color: "#888", marginTop: 4 },
  actionSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  addBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  pendingBadge: {
    backgroundColor: "#fef3e6",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  pendingText: { color: "#f39c12", fontSize: 15, fontWeight: "600" },
  acceptBtn: {
    backgroundColor: "#27ae60",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  unfriendBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  unfriendBtnText: { color: "#e74c3c", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
});
