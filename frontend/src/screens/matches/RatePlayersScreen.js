import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import GradientButton from "../../components/GradientButton";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";
import { colors, radius } from "../../theme";

function StarBtn({ filled, onPress, size = 28 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handle = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, friction: 4, tension: 200 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    onPress();
  };
  return (
    <PressableScale onPress={handle} scaleTo={0.9} style={{ paddingHorizontal: 3 }}>
      <Animated.Text style={[{ transform: [{ scale }] }, { fontSize: size, color: filled ? colors.warning : colors.borderStrong }]}>
        {filled ? "★" : "☆"}
      </Animated.Text>
    </PressableScale>
  );
}

function StarRow({ score, onSelect }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <StarBtn key={s} filled={s <= score} onPress={() => onSelect(s)} />
      ))}
    </View>
  );
}

export default function RatePlayersScreen({ route }) {
  const { matchId, matchTitle } = route.params;
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [unrated, setUnrated] = useState([]);
  const [given, setGiven] = useState([]);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState({});

  useEffect(() => { fetchRatings(); }, []);

  const fetchRatings = async () => {
    try {
      const res = await apiClient.get(`/ratings/match/${matchId}`);
      setUnrated(res.data.data.unrated_players);
      setGiven(res.data.data.given);
    } catch { toast.error(t("rate.loadFailed")); } finally { setLoading(false); }
  };

  const handleRate = async (rateeId) => {
    const score = scores[rateeId];
    if (!score) { toast.error(t("rate.selectRating")); return; }
    setSubmitting((prev) => ({ ...prev, [rateeId]: true }));
    try {
      await apiClient.post("/ratings", { match_id: matchId, ratee_id: rateeId, score });
      toast.success(t("rate.ratingSubmitted"));
      fetchRatings();
      setScores((prev) => { const next = { ...prev }; delete next[rateeId]; return next; });
    } catch (e) { toast.error(e.response?.data?.message || t("rate.ratingFailed")); }
    finally { setSubmitting((prev) => ({ ...prev, [rateeId]: false })); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 60 }}>
      <AnimatedEntry>
        <Text style={styles.heading}>{matchTitle}</Text>
        <Text style={styles.subheading}>{t("matches.ratePlayers")}</Text>
      </AnimatedEntry>

      {unrated.length > 0 ? (
        <AnimatedEntry delay={80}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("rate.playersToRate")}</Text>
            {unrated.map((player, i) => (
              <View key={player.id} style={[styles.playerCard, i === unrated.length - 1 && { borderBottomWidth: 0 }]}>
                <Avatar uri={player.profile_picture} name={player.username} size={48} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.username}</Text>
                  <Text style={styles.playerRating}>{t("rate.avg", { rating: player.average_rating ? player.average_rating.toFixed(1) : "—" })}</Text>
                  <StarRow score={scores[player.id] || 0} onSelect={(s) => setScores((prev) => ({ ...prev, [player.id]: s }))} />
                </View>
                <GradientButton
                  label={t("common.submit")}
                  onPress={() => handleRate(player.id)}
                  loading={submitting[player.id]}
                  small
                  style={{ width: 90 }}
                />
              </View>
            ))}
          </View>
        </AnimatedEntry>
      ) : (
        <AnimatedEntry delay={80}>
          <View style={[styles.section, { alignItems: "center", paddingVertical: 30 }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            </View>
            <Text style={styles.allRatedText}>{t("rate.allRated")}</Text>
          </View>
        </AnimatedEntry>
      )}

      {given.length > 0 && (
        <AnimatedEntry delay={140}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("rate.yourRatings")}</Text>
            {given.map((r, i) => (
              <View key={i} style={[styles.ratedRow, i === given.length - 1 && { borderBottomWidth: 0 }]}>
                <Avatar uri={r.ratee?.profile_picture} name={r.ratee?.username} size={36} />
                <Text style={styles.ratedName}>{r.ratee?.username}</Text>
                <Text style={styles.ratedScore}>{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</Text>
              </View>
            ))}
          </View>
        </AnimatedEntry>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  heading: { fontSize: 22, fontWeight: "800", color: colors.text, padding: 4, letterSpacing: -0.3 },
  subheading: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 4, marginTop: -2, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  section: { backgroundColor: colors.card, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  playerCard: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 15, fontWeight: "700", color: colors.text },
  playerRating: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  starRow: { flexDirection: "row", marginTop: 6 },
  successIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  allRatedText: { fontSize: 15, color: colors.text, textAlign: "center", fontWeight: "700" },
  ratedRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ratedName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "600" },
  ratedScore: { fontSize: 16, color: colors.warning },
});
