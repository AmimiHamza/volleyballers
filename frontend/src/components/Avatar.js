import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { API_BASE_URL } from "../config/server";
import { colors } from "../theme";

const PALETTE = ["#FF6B35", "#7c3aed", "#22d97e", "#5fa8ff", "#ffb627", "#ff5a5f", "#06b6d4", "#ec4899"];

function colorFromName(name = "?") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name = "?") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function Avatar({
  uri,
  name = "",
  size = 44,
  online,
  ring,
  ringColor,
  style,
}) {
  const fullUri = uri && uri.startsWith("/") ? `${API_BASE_URL.replace("/api", "")}${uri}` : uri;
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const bg = colorFromName(name);
  const ringWidth = ring ? 2 : 0;
  const totalSize = size + ringWidth * 2;

  return (
    <View style={[{ width: totalSize, height: totalSize }, style]}>
      {ring && (
        <View
          style={{
            position: "absolute",
            width: totalSize,
            height: totalSize,
            borderRadius: totalSize / 2,
            borderWidth: ringWidth,
            borderColor: ringColor || colors.primary,
          }}
        />
      )}
      <View style={{ position: "absolute", left: ringWidth, top: ringWidth }}>
        {fullUri ? (
          <Image
            source={{ uri: fullUri }}
            style={[dim, styles.avatar]}
            cachePolicy="memory-disk"
            transition={150}
            placeholder={{
              blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
            }}
            contentFit="cover"
          />
        ) : (
          <View style={[dim, styles.avatar, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: "#fff", fontSize: size * 0.4, fontWeight: "700" }}>{initials(name)}</Text>
          </View>
        )}
      </View>
      {online !== undefined && (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: online ? colors.online : colors.offline,
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.bgElevated },
});

export default memo(Avatar);
