import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

/**
 * Animated skeleton placeholder with shimmer effect.
 *
 * Props:
 *  - width (number|string)  default "100%"
 *  - height (number)        default 16
 *  - borderRadius (number)  default 6
 *  - style (object)         extra styles
 */
export function SkeletonBlock({ width = "100%", height = 16, borderRadius = 6, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: "#e0e0e0", opacity }, style]}
    />
  );
}

/** Skeleton for a match card in the list */
export function MatchCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.cardHeader}>
        <SkeletonBlock width="60%" height={18} />
        <SkeletonBlock width={60} height={22} borderRadius={12} />
      </View>
      <SkeletonBlock width="40%" height={14} style={{ marginTop: 10 }} />
      <SkeletonBlock width="55%" height={14} style={{ marginTop: 8 }} />
      <View style={skeletonStyles.cardFooter}>
        <SkeletonBlock width={80} height={14} />
        <SkeletonBlock width={70} height={14} />
      </View>
    </View>
  );
}

/** Skeleton for the match list screen */
export function MatchListSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Skeleton for a user row (friends, requests, notifications) */
export function UserRowSkeleton() {
  return (
    <View style={skeletonStyles.userRow}>
      <SkeletonBlock width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBlock width="50%" height={16} />
        <SkeletonBlock width="30%" height={13} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** Skeleton for friends / requests list */
export function UserListSkeleton({ count = 5 }) {
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <UserRowSkeleton key={i} />
      ))}
    </View>
  );
}

/** Skeleton for notification items */
export function NotificationListSkeleton() {
  return (
    <View>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={skeletonStyles.notifRow}>
          <SkeletonBlock width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <SkeletonBlock width={80} height={12} />
              <SkeletonBlock width={40} height={12} />
            </View>
            <SkeletonBlock width="80%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Skeleton for match detail screen */
export function MatchDetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={skeletonStyles.detailSection}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <SkeletonBlock width="60%" height={22} />
          <SkeletonBlock width={70} height={24} borderRadius={12} />
        </View>
        <SkeletonBlock width="90%" height={15} style={{ marginTop: 12 }} />
      </View>
      {/* Info */}
      <View style={skeletonStyles.detailSection}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={skeletonStyles.infoRow}>
            <SkeletonBlock width={60} height={15} />
            <SkeletonBlock width={100} height={15} />
          </View>
        ))}
      </View>
      {/* Organizer */}
      <View style={skeletonStyles.detailSection}>
        <SkeletonBlock width={80} height={16} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <SkeletonBlock width={40} height={40} borderRadius={20} />
          <SkeletonBlock width={100} height={16} style={{ marginLeft: 10 }} />
        </View>
      </View>
      {/* Players */}
      <View style={skeletonStyles.detailSection}>
        <SkeletonBlock width={90} height={16} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <SkeletonBlock width={40} height={40} borderRadius={20} />
            <SkeletonBlock width={120} height={15} style={{ marginLeft: 10 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Skeleton for profile screen */
export function ProfileSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={{ alignItems: "center", paddingTop: 30, paddingBottom: 20 }}>
        <SkeletonBlock width={100} height={100} borderRadius={50} />
        <SkeletonBlock width={140} height={24} style={{ marginTop: 12 }} />
        <SkeletonBlock width={200} height={14} style={{ marginTop: 8 }} />
      </View>
      <View style={skeletonStyles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: "center" }}>
            <SkeletonBlock width={40} height={22} />
            <SkeletonBlock width={50} height={13} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
      <View style={skeletonStyles.infoSection}>
        <View style={skeletonStyles.infoRow}>
          <SkeletonBlock width={50} height={15} />
          <SkeletonBlock width={120} height={15} />
        </View>
        <View style={skeletonStyles.infoRow}>
          <SkeletonBlock width={50} height={15} />
          <SkeletonBlock width={100} height={15} />
        </View>
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  notifRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  detailSection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoSection: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
});
