import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../api/client";
import usePolling from "../../hooks/usePolling";
import { showConfirm } from "../../utils/alert";
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";
import InviteFriendsModal from "../../components/InviteFriendsModal";
import { useAuth } from "../../contexts/AuthContext";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";

function avatarUrl(pic) {
  return pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;
}

// ── ManageRequestsPanel ──────────────────────────────────────────────────────

function ManageRequestsPanel({ requests, onAction }) {
  if (!requests || requests.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pending Requests ({requests.length})</Text>
      {requests.map((req) => (
        <View key={req.id} style={styles.requestCard}>
          <Image source={{ uri: avatarUrl(req.user?.profile_picture) }} style={styles.smallAvatar} />
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{req.user?.username}</Text>
            <Text style={styles.requestRating}>
              Rating: {req.user?.average_rating ? req.user.average_rating.toFixed(1) : "N/A"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onAction(req.id, "approve")}
          >
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onAction(req.id, "reject")}
          >
            <Text style={[styles.actionBtnText, { color: "#e74c3c" }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// ── MatchDetailScreen ────────────────────────────────────────────────────────

export default function MatchDetailScreen({ route, navigation }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const toast = useToast();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await apiClient.get(`/matches/${matchId}`);
      setMatch(res.data.data);
    } catch {
      toast.error("Failed to load match");
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMatch();
    }, [fetchMatch])
  );

  // Silent poll every 5s — this is the most time-sensitive screen
  usePolling(fetchMatch, 5000);

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/matches/${matchId}/join`);
      toast.success("Join request sent!");
      fetchMatch();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to join");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    setActionLoading(true);
    try {
      await apiClient.put(`/matches/${matchId}/requests/${requestId}`, { action });
      fetchMatch();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    showConfirm("Cancel Match", "This will cancel the match and notify all players. Continue?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Match",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiClient.post(`/matches/${matchId}/close`);
            fetchMatch();
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to cancel");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    showConfirm("Leave Match", "Are you sure you want to leave this match?", [
      { text: "No", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiClient.post(`/matches/${matchId}/leave`);
            fetchMatch();
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to leave");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    showConfirm("Complete Match", "Mark this match as completed? This enables player ratings.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiClient.post(`/matches/${matchId}/complete`);
            fetchMatch();
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to complete");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleRemovePlayer = (playerId, playerName) => {
    showConfirm("Remove Player", `Remove ${playerName} from this match?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiClient.delete(`/matches/${matchId}/players/${playerId}`);
            fetchMatch();
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!match) return null;

  const isOrganizer = match.user_status === "organizer";
  const statusColor =
    match.status === "open" ? "#27ae60" : match.status === "closed" ? "#f39c12" : match.status === "cancelled" ? "#e74c3c" : "#3498db";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMatch(); }} tintColor="#FF6B35" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{match.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{match.status}</Text>
          </View>
        </View>
        {match.description ? <Text style={styles.description}>{match.description}</Text> : null}
      </View>

      {/* Match info */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{match.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={styles.infoValue}>{match.time}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={styles.infoValue}>{match.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Players</Text>
          <Text style={[styles.infoValue, { color: "#FF6B35", fontWeight: "bold" }]}>
            {match.current_players}/{match.max_players}
          </Text>
        </View>
      </View>

      {/* Organizer card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Organizer</Text>
        <TouchableOpacity
          style={styles.organizerCard}
          onPress={() => {
            if (match.organizer?.id !== user?.id) {
              navigation.navigate("PublicProfile", { userId: match.organizer?.id });
            }
          }}
        >
          <Image source={{ uri: avatarUrl(match.organizer?.profile_picture) }} style={styles.smallAvatar} />
          <Text style={styles.organizerName}>{match.organizer?.username}</Text>
        </TouchableOpacity>
      </View>

      {/* Players list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players ({match.players?.length || 0})</Text>
        {match.players && match.players.length > 0 ? (
          match.players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <TouchableOpacity
                style={styles.playerInfo}
                onPress={() => {
                  if (p.id !== user?.id) {
                    navigation.navigate("PublicProfile", { userId: p.id });
                  }
                }}
              >
                <Image source={{ uri: avatarUrl(p.profile_picture) }} style={styles.smallAvatar} />
                <Text style={styles.playerName}>{p.username}</Text>
              </TouchableOpacity>
              {isOrganizer && match.status !== "completed" && p.id !== match.organizer?.id && (
                <TouchableOpacity onPress={() => handleRemovePlayer(p.id, p.username)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No players yet</Text>
        )}
      </View>

      {/* Organizer: manage requests */}
      {isOrganizer && (
        <ManageRequestsPanel
          requests={match.pending_requests}
          onAction={handleRequestAction}
        />
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Join button */}
        {match.user_status === "none" && match.status === "open" && (
          <TouchableOpacity
            style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={actionLoading}
          >
            <Text style={styles.primaryBtnText}>Request to Join</Text>
          </TouchableOpacity>
        )}

        {/* Pending — with cancel option */}
        {match.user_status === "pending" && (
          <View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Join request pending...</Text>
            </View>
            <TouchableOpacity
              style={[styles.dangerBtn, actionLoading && styles.btnDisabled]}
              onPress={() => {
                showConfirm("Cancel Request", "Withdraw your join request?", [
                  { text: "No", style: "cancel" },
                  {
                    text: "Cancel Request",
                    style: "destructive",
                    onPress: async () => {
                      setActionLoading(true);
                      try {
                        await apiClient.delete(`/matches/${matchId}/join`);
                        fetchMatch();
                      } catch (error) {
                        toast.error(error.response?.data?.message || "Failed to cancel");
                      } finally {
                        setActionLoading(false);
                      }
                    },
                  },
                ]);
              }}
              disabled={actionLoading}
            >
              <Text style={styles.dangerBtnText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Leave match — for non-organizer players */}
        {match.user_status === "player" && (match.status === "open" || match.status === "closed") && (
          <TouchableOpacity
            style={[styles.dangerBtn, actionLoading && styles.btnDisabled]}
            onPress={handleLeave}
            disabled={actionLoading}
          >
            <Text style={styles.dangerBtnText}>Leave Match</Text>
          </TouchableOpacity>
        )}

        {/* Organizer controls */}
        {isOrganizer && (match.status === "open" || match.status === "closed") && (
          <TouchableOpacity
            style={[styles.dangerBtn, actionLoading && styles.btnDisabled]}
            onPress={handleCancel}
            disabled={actionLoading}
          >
            <Text style={styles.dangerBtnText}>Cancel Match</Text>
          </TouchableOpacity>
        )}

        {isOrganizer && (match.status === "open" || match.status === "closed") && (
          <TouchableOpacity
            style={[styles.primaryBtn, actionLoading && styles.btnDisabled]}
            onPress={handleComplete}
            disabled={actionLoading}
          >
            <Text style={styles.primaryBtnText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        {/* Invite friends — visible to players and organizer when match is open */}
        {(isOrganizer || match.user_status === "player") && match.status === "open" && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setInviteModalVisible(true)}
          >
            <Text style={styles.secondaryBtnText}>Invite Friends</Text>
          </TouchableOpacity>
        )}

        {/* Rate players — visible to participants when match is completed */}
        {match.status === "completed" && (isOrganizer || match.user_status === "player") && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("RatePlayers", { matchId: match.id, matchTitle: match.title })}
          >
            <Text style={styles.primaryBtnText}>Rate Players</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />

      <InviteFriendsModal
        visible={inviteModalVisible}
        onClose={() => { setInviteModalVisible(false); fetchMatch(); }}
        matchId={matchId}
        playerIds={match.players?.map((p) => p.id) || []}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#fff", padding: 20, marginBottom: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", color: "#333", flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  description: { fontSize: 15, color: "#666", marginTop: 10, lineHeight: 22 },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 0,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: { fontSize: 15, color: "#888" },
  infoValue: { fontSize: 15, color: "#333" },
  organizerCard: { flexDirection: "row", alignItems: "center" },
  organizerName: { fontSize: 16, fontWeight: "600", color: "#333", marginLeft: 10 },
  smallAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ddd" },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  playerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  playerName: { fontSize: 15, color: "#333", marginLeft: 10 },
  removeText: { color: "#e74c3c", fontSize: 13, fontWeight: "600" },
  emptyText: { color: "#999", fontSize: 14 },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  requestInfo: { flex: 1, marginLeft: 10 },
  requestName: { fontSize: 15, fontWeight: "600", color: "#333" },
  requestRating: { fontSize: 12, color: "#888" },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  approveBtn: { backgroundColor: "#27ae60" },
  rejectBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e74c3c" },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  actions: { paddingHorizontal: 16, paddingTop: 8 },
  primaryBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B35",
    marginBottom: 10,
  },
  secondaryBtnText: { color: "#FF6B35", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.7 },
  dangerBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e74c3c",
    marginBottom: 10,
  },
  dangerBtnText: { color: "#e74c3c", fontSize: 16, fontWeight: "600" },
  pendingBadge: {
    backgroundColor: "#fef3e6",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  pendingText: { color: "#f39c12", fontSize: 15, fontWeight: "600" },
});
