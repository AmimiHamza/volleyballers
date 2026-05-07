import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showConfirm } from "../../utils/alert";
import LanguagePickerModal from "../../components/LanguagePickerModal";
import Avatar from "../../components/Avatar";
import PressableScale from "../../components/PressableScale";
import AnimatedEntry from "../../components/AnimatedEntry";
import { colors, radius, shadows } from "../../theme";

const LANGUAGE_NAMES = { en: "English", fr: "Français", ar: "العربية" };

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleLogout = () => {
    showConfirm(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("auth.logout"), style: "destructive", onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Gradient header */}
      <LinearGradient
        colors={[colors.primary + "30", colors.bg]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerBg}
      />

      <AnimatedEntry style={styles.header}>
        <Avatar uri={user.profile_picture} name={user.username} size={110} ring ringColor={colors.primary} />
        <Text style={styles.username}>{user.username}</Text>
        {user.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={colors.textMuted} />
            <Text style={styles.locationText}>{user.city}</Text>
          </View>
        )}
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </AnimatedEntry>

      <AnimatedEntry delay={120}>
        <View style={styles.statsRow}>
          <Stat label={t("profile.matches")} value={user.total_matches} icon="trophy" />
          <View style={styles.statSep} />
          <Stat label={t("profile.rating")} value={user.average_rating ? user.average_rating.toFixed(1) : "—"} icon="star" highlight />
          <View style={styles.statSep} />
          <Stat label={t("profile.reviews")} value={user.total_ratings} icon="chatbox" />
        </View>
      </AnimatedEntry>

      <AnimatedEntry delay={200}>
        <View style={styles.menuSection}>
          <MenuRow icon="person-outline" label={t("profile.editProfile")} onPress={() => navigation.navigate("EditProfile")} />
          <MenuRow icon="time-outline" label={t("profile.matchHistory")} onPress={() => navigation.navigate("MatchHistory")} />
          <MenuRow icon="globe-outline" label={t("language.language")} value={LANGUAGE_NAMES[language] || language} onPress={() => setLangModalVisible(true)} />
          <MenuRow icon="log-out-outline" label={t("auth.logout")} onPress={handleLogout} danger />
        </View>
      </AnimatedEntry>

      <LanguagePickerModal visible={langModalVisible} onDismiss={() => setLangModalVisible(false)} />
    </ScrollView>
  );
}

function Stat({ label, value, icon, highlight }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIconWrap, highlight && { backgroundColor: colors.primarySoftStrong }]}>
        <Ionicons name={icon} size={16} color={highlight ? colors.primary : colors.textMuted} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, value, onPress, danger }) {
  return (
    <PressableScale onPress={onPress} style={styles.menuRow}>
      <View style={[styles.menuIconWrap, danger && { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {!danger && <Ionicons name="chevron-forward" size={16} color={colors.textDim} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerBg: { position: "absolute", left: 0, right: 0, top: 0, height: 280 },
  header: { alignItems: "center", paddingTop: 36, paddingBottom: 20 },
  username: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locationText: { color: colors.textMuted, fontSize: 13 },
  bio: { fontSize: 14, color: colors.textMuted, marginTop: 8, paddingHorizontal: 40, textAlign: "center" },

  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: radius.lg,
    paddingVertical: 16,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  statSep: { width: 1, backgroundColor: colors.border, marginVertical: 8 },

  menuSection: { marginHorizontal: 16, marginTop: 18, gap: 8 },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  menuIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  menuLabel: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 },
  menuValue: { color: colors.textMuted, fontSize: 13, marginRight: 6 },
});
