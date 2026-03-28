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
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=64";

function avatarUrl(pic) {
  return pic ? `${API_BASE_URL.replace("/api", "")}${pic}` : DEFAULT_AVATAR;
}

function StarRow({ score, onSelect }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onSelect(s)} style={styles.starBtn}>
          <Text style={[styles.star, s <= score && styles.starFilled]}>
            {s <= score ? "\u2605" : "\u2606"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RatePlayersScreen({ route, navigation }) {
  const { matchId, matchTitle } = route.params;
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [unrated, setUnrated] = useState([]);
  const [given, setGiven] = useState([]);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState({});

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      const res = await apiClient.get(`/ratings/match/${matchId}`);
      setUnrated(res.data.data.unrated_players);
      setGiven(res.data.data.given);
    } catch {
      toast.error("Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (rateeId) => {
    const score = scores[rateeId];
    if (!score) {
      toast.error("Please select a star rating first");
      return;
    }
    setSubmitting((prev) => ({ ...prev, [rateeId]: true }));
    try {
      await apiClient.post("/ratings", { match_id: matchId, ratee_id: rateeId, score });
      toast.success("Rating submitted!");
      fetchRatings();
      setScores((prev) => {
        const next = { ...prev };
        delete next[rateeId];
        return next;
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit rating");
    } finally {
      setSubmitting((prev) => ({ ...prev, [rateeId]: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Rate Players — {matchTitle}</Text>

      {/* Unrated players */}
      {unrated.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players to Rate</Text>
          {unrated.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <Image source={{ uri: avatarUrl(player.profile_picture) }} style={styles.avatar} />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.username}</Text>
                <Text style={styles.playerRating}>
                  Avg: {player.average_rating ? player.average_rating.toFixed(1) : "N/A"}
                </Text>
              </View>
              <View style={styles.rateSection}>
                <StarRow
                  score={scores[player.id] || 0}
                  onSelect={(s) => setScores((prev) => ({ ...prev, [player.id]: s }))}
                />
                <TouchableOpacity
                  style={[styles.rateBtn, submitting[player.id] && styles.btnDisabled]}
                  onPress={() => handleRate(player.id)}
                  disabled={submitting[player.id]}
                >
                  <Text style={styles.rateBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.emptyText}>You've rated all players in this match!</Text>
        </View>
      )}

      {/* Already rated */}
      {given.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Ratings</Text>
          {given.map((r, i) => (
            <View key={i} style={styles.ratedRow}>
              <Image source={{ uri: avatarUrl(r.ratee?.profile_picture) }} style={styles.avatar} />
              <Text style={styles.ratedName}>{r.ratee?.username}</Text>
              <Text style={styles.ratedScore}>{"\u2605".repeat(r.score)}{"\u2606".repeat(5 - r.score)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    padding: 16,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 12 },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ddd" },
  playerInfo: { flex: 1, marginLeft: 10 },
  playerName: { fontSize: 15, fontWeight: "600", color: "#333" },
  playerRating: { fontSize: 12, color: "#888" },
  rateSection: { alignItems: "center" },
  starRow: { flexDirection: "row", marginBottom: 6 },
  starBtn: { paddingHorizontal: 2 },
  star: { fontSize: 24, color: "#ccc" },
  starFilled: { color: "#f39c12" },
  rateBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rateBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center", paddingVertical: 20 },
  ratedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  ratedName: { flex: 1, marginLeft: 10, fontSize: 15, color: "#333" },
  ratedScore: { fontSize: 18, color: "#f39c12" },
});
