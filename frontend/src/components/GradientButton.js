import React from "react";
import { Text, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import PressableScale from "./PressableScale";
import { colors, radius, shadows } from "../theme";

export default function GradientButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  small,
  variant = "primary",
  style,
  textStyle,
}) {
  const gradient = variant === "primary" ? colors.gradPrimary : variant === "accent" ? colors.gradAccent : colors.gradPrimary;
  const padding = small ? { paddingHorizontal: 14, paddingVertical: 10 } : { paddingVertical: 16 };

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.wrap, disabled && { opacity: 0.5 }, style]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, padding, shadows.glowSubtle]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text style={[styles.label, small && { fontSize: 14 }, textStyle]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
  },
  label: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});
