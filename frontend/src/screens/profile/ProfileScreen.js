import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { showConfirm } from "../../utils/alert";

import { API_BASE_URL } from "../../config/server";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=128";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    showConfirm("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (!user) return null;

  const avatarUri = user.profile_picture
    ? `${API_BASE_URL.replace("/api", "")}${user.profile_picture}`
    : DEFAULT_AVATAR;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <Text style={styles.username}>{user.username}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.total_matches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {user.average_rating ? user.average_rating.toFixed(1) : "N/A"}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.total_ratings}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        {user.phone_number ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user.phone_number}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Joined</Text>
          <Text style={styles.infoValue}>
            {user.created_at
              ? new Date(user.created_at).toLocaleDateString()
              : "—"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => navigation.navigate("MatchHistory")}
      >
        <Text style={styles.historyButtonText}>Match History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
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
    marginBottom: 20,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "bold", color: "#FF6B35" },
  statLabel: { fontSize: 13, color: "#888", marginTop: 4 },
  infoSection: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: { fontSize: 15, color: "#888" },
  infoValue: { fontSize: 15, color: "#333" },
  editButton: {
    backgroundColor: "#FF6B35",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  editButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  historyButton: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B35",
    marginBottom: 12,
  },
  historyButtonText: { color: "#FF6B35", fontSize: 16, fontWeight: "600" },
  logoutButton: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e74c3c",
    marginBottom: 40,
  },
  logoutButtonText: { color: "#e74c3c", fontSize: 16, fontWeight: "600" },
});
