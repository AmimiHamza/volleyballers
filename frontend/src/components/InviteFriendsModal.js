import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import apiClient from "../api/client";
import { useToast } from "./Toast";
import { API_BASE_URL } from "../config/server";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";
const avatarUrl = (pic) =>
  pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;

export default function InviteFriendsModal({ visible, onClose, matchId, playerIds }) {
  const toast = useToast();
  const [friends, setFriends] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const [friendsRes, invitesRes] = await Promise.all([
          apiClient.get("/friends"),
          apiClient.get(`/matches/${matchId}/invites`),
        ]);
        setFriends(friendsRes.data.data);
        const invited = new Set(invitesRes.data.data.map((inv) => inv.invitee_id));
        setInvitedIds(invited);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, matchId]);

  const handleInvite = async (userId) => {
    try {
      await apiClient.post(`/matches/${matchId}/invite`, { user_id: userId });
      setInvitedIds((prev) => new Set([...prev, userId]));
      toast.success("Invitation sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to invite");
    }
  };

  const playerIdSet = new Set(playerIds || []);

  const renderFriend = ({ item }) => {
    const isPlayer = playerIdSet.has(item.id);
    const isInvited = invitedIds.has(item.id);
    const disabled = isPlayer || isInvited;

    return (
      <View style={styles.row}>
        <Image source={{ uri: avatarUrl(item.profile_picture) }} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.username}</Text>
          <Text style={styles.sub}>
            {isPlayer ? "Already playing" : isInvited ? "Invited" : `Rating: ${item.average_rating ? item.average_rating.toFixed(1) : "N/A"}`}
          </Text>
        </View>
        {disabled ? (
          <Text style={styles.disabledText}>{isPlayer ? "Joined" : "Sent"}</Text>
        ) : (
          <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite(item.id)}>
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Invite Friends</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFriend}
              contentContainerStyle={friends.length === 0 ? styles.centered : undefined}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No friends to invite</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#333" },
  closeText: { color: "#FF6B35", fontSize: 16, fontWeight: "600" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ddd" },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: "600", color: "#333" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  disabledText: { color: "#aaa", fontSize: 13 },
  inviteBtn: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inviteBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  emptyText: { fontSize: 15, color: "#888" },
});
