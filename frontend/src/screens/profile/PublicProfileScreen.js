import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import InviteToMatchModal from "../../components/InviteToMatchModal";
import Avatar from "../../components/Avatar";
import GradientButton from "../../components/GradientButton";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";
import { colors, radius, spacing, shadows } from "../../theme";

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteVisible, setInviteVisible] = useState(false);

  useEffect(() => { fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get(`/auth/users/${userId}`);
      setProfile(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  const goChat = () => {
    navigation.getParent()?.navigate("Main", {
      screen: "ChatTab",
      params: { screen: "ChatConversation", params: { userId, username: profile?.username } },
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!profile) return <View style={styles.center}><Text style={styles.errorText}>{t("profile.userNotFound")}</Text></View>;

  const isOwn = currentUser?.id === userId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <LinearGradient colors={[colors.primary + "30", colors.bg]} style={styles.headerBg} />

      <AnimatedEntry style={styles.header}>
        <Avatar uri={profile.profile_picture} name={profile.username} size={110} ring ringColor={colors.primary} />
        <Text style={styles.username}>{profile.username}</Text>
        {profile.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={colors.textMuted} />
            <Text style={styles.locationText}>{profile.city}</Text>
          </View>
        )}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </AnimatedEntry>

      <AnimatedEntry delay={120}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}>
              <Ionicons name="trophy" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.statValue}>{profile.total_matches}</Text>
            <Text style={styles.statLabel}>{t("profile.matches")}</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.stat}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.primarySoftStrong }]}>
              <Ionicons name="star" size={16} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{profile.average_rating ? profile.average_rating.toFixed(1) : "—"}</Text>
            <Text style={styles.statLabel}>{t("profile.rating")}</Text>
          </View>
        </View>
      </AnimatedEntry>

      {!isOwn && (
        <AnimatedEntry delay={200} style={styles.actions}>
          <GradientButton
            label={t("players.invite")}
            onPress={() => setInviteVisible(true)}
            icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
            style={{ flex: 1 }}
          />
          <PressableScale onPress={goChat} style={{ flex: 1 }}>
            <View style={styles.secondaryBtn}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>{t("nav.chat")}</Text>
            </View>
          </PressableScale>
        </AnimatedEntry>
      )}

      <InviteToMatchModal
        visible={inviteVisible}
        user={profile}
        onClose={() => setInviteVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  errorText: { color: colors.textMuted, fontSize: 16 },
  headerBg: { position: "absolute", left: 0, right: 0, top: 0, height: 280 },

  header: { alignItems: "center", paddingTop: 36, paddingBottom: 20 },
  username: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locationText: { color: colors.textMuted, fontSize: 13 },
  bio: { fontSize: 14, color: colors.textMuted, marginTop: 8, paddingHorizontal: 40, textAlign: "center" },

  statsRow: { flexDirection: "row", backgroundColor: colors.card, marginHorizontal: 16, borderRadius: radius.lg, paddingVertical: 16, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  statSep: { width: 1, backgroundColor: colors.border, marginVertical: 8 },

  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 18 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "transparent", borderRadius: radius.md, padding: 16, borderWidth: 1.5, borderColor: colors.primary },
  secondaryBtnText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
});
