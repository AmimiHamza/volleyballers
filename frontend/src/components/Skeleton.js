import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { colors, radius } from "../theme";

export function SkeletonBlock({ width, height, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: colors.card, borderRadius: 8, opacity },
        style,
      ]}
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <View style={styles.matchCard}>
      <SkeletonBlock width={4} height="100%" style={{ borderRadius: 0 }} />
      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        <SkeletonBlock width="70%" height={16} />
        <SkeletonBlock width="50%" height={12} />
        <SkeletonBlock width="60%" height={12} />
        <SkeletonBlock width="100%" height={5} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function MatchListSkeleton({ count = 5 }) {
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => <MatchCardSkeleton key={i} />)}
    </View>
  );
}

export function UserRowSkeleton() {
  return (
    <View style={styles.userRow}>
      <SkeletonBlock width={48} height={48} style={{ borderRadius: 24 }} />
      <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="35%" height={11} />
      </View>
      <SkeletonBlock width={40} height={40} style={{ borderRadius: 20 }} />
    </View>
  );
}

export function UserListSkeleton({ count = 6 }) {
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => <UserRowSkeleton key={i} />)}
    </View>
  );
}

export function NotificationSkeleton() {
  return (
    <View style={styles.notifRow}>
      <SkeletonBlock width={44} height={44} style={{ borderRadius: 22 }} />
      <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
        <SkeletonBlock width="40%" height={11} />
        <SkeletonBlock width="90%" height={13} />
      </View>
    </View>
  );
}

export function NotificationListSkeleton({ count = 6 }) {
  return (
    <View style={{ padding: 12, gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => <NotificationSkeleton key={i} />)}
    </View>
  );
}

export function MatchDetailSkeleton() {
  return (
    <View style={{ padding: 12, gap: 12 }}>
      <View style={[styles.section, { gap: 10 }]}>
        <SkeletonBlock width="80%" height={22} />
        <SkeletonBlock width="100%" height={14} />
      </View>
      <View style={[styles.section, { gap: 10 }]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} width="100%" height={20} />
        ))}
      </View>
      <View style={[styles.section, { gap: 10 }]}>
        <SkeletonBlock width="50%" height={14} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <SkeletonBlock width={36} height={36} style={{ borderRadius: 18 }} />
            <SkeletonBlock width="50%" height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={{ padding: 20, gap: 16, alignItems: "center" }}>
      <SkeletonBlock width={110} height={110} style={{ borderRadius: 55, marginTop: 20 }} />
      <SkeletonBlock width={140} height={20} />
      <SkeletonBlock width={90} height={13} />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12, width: "100%" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ flex: 1, gap: 6, alignItems: "center", padding: 12, backgroundColor: colors.card, borderRadius: radius.md }}>
            <SkeletonBlock width={32} height={32} style={{ borderRadius: 16 }} />
            <SkeletonBlock width={32} height={20} />
            <SkeletonBlock width={50} height={11} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: "hidden",
    minHeight: 110,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
});
