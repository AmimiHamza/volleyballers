import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import { API_BASE_URL } from "../../config/server";
import GradientButton from "../../components/GradientButton";
import AnimatedEntry from "../../components/AnimatedEntry";
import { colors, radius, spacing, shadows } from "../../theme";

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      toast.error(t("auth.usernamePasswordRequired"));
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (error) {
      const serverMsg = error.response?.data?.message;
      const status = error.response?.status;
      let msg;
      if (serverMsg) msg = `${serverMsg} (${status})`;
      else if (error.code === "ECONNABORTED") msg = t("auth.timeoutError");
      else if (error.code === "ERR_NETWORK") msg = t("auth.networkError", { url: API_BASE_URL.replace("/api", "") });
      else msg = t("auth.genericError", { message: error.message });
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient
        colors={[colors.primary + "20", colors.bg, colors.bg]}
        style={styles.bgGradient}
      />
      <View style={styles.inner}>
        <AnimatedEntry>
          <LinearGradient colors={colors.gradPrimary} style={[styles.logoCircle, shadows.glow]}>
            <MaterialCommunityIcons name="volleyball" size={40} color="#fff" />
          </LinearGradient>
        </AnimatedEntry>
        <AnimatedEntry delay={80}>
          <Text style={styles.title}>{t("splash.appName")}</Text>
          <Text style={styles.subtitle}>{t("auth.signIn")}</Text>
        </AnimatedEntry>

        <AnimatedEntry delay={140} style={styles.form}>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder={t("auth.username")}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder={t("auth.password")}
              placeholderTextColor={colors.textDim}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <GradientButton
            label={t("auth.login")}
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          <TouchableOpacity onPress={() => navigation.navigate("Register")} style={{ marginTop: 16 }}>
            <Text style={styles.link}>{t("auth.noAccount")}</Text>
          </TouchableOpacity>
        </AnimatedEntry>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  bgGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 400 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: spacing.md,
  },
  title: { fontSize: 36, fontWeight: "800", color: colors.text, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: spacing.xl, marginTop: 4 },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  link: { color: colors.primary, textAlign: "center", fontSize: 14, fontWeight: "600" },
});
