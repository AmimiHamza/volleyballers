import React from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "../contexts/LanguageContext";
import PressableScale from "./PressableScale";
import { colors, radius, shadows } from "../theme";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
];

export default function LanguagePickerModal({ visible, onDismiss }) {
  const { language, setLanguage } = useLanguage();

  const handleSelect = (code) => {
    setLanguage(code);
    if (onDismiss) onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={colors.gradPrimary} style={[styles.iconWrap, shadows.glow]}>
            <Ionicons name="globe-outline" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Choose Your Language</Text>
          <Text style={styles.subtitle}>
            Choisissez votre langue {"•"} اختر لغتك
          </Text>

          {LANGUAGES.map((lang) => {
            const active = language === lang.code;
            return (
              <PressableScale
                key={lang.code}
                onPress={() => handleSelect(lang.code)}
                style={{ width: "100%" }}
              >
                <View style={[styles.langBtn, active && styles.langBtnActive]}>
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <Text style={[styles.langText, active && styles.langTextActive]}>
                    {lang.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
    gap: 10,
    ...shadows.lg,
  },
  iconWrap: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 16, textAlign: "center" },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 12,
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  flag: { fontSize: 24 },
  langText: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  langTextActive: { color: colors.primary },
});
