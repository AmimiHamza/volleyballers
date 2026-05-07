// VolleyConnect dark theme — futuristic, Discord-inspired
export const colors = {
  bg: "#0a0d12",
  bgElevated: "#13161d",
  card: "#1c2029",
  cardHover: "#252a35",
  input: "#1a1e26",
  border: "#2a2f3a",
  borderStrong: "#3a4050",
  borderSubtle: "#1f2330",

  text: "#ffffff",
  textMuted: "#a0a4ad",
  textDim: "#6b7280",

  primary: "#FF6B35",
  primaryDim: "#ff8a5b",
  primaryDark: "#cc4a17",
  primaryGlow: "#ff6b3580",
  primarySoft: "rgba(255, 107, 53, 0.12)",
  primarySoftStrong: "rgba(255, 107, 53, 0.25)",

  accent: "#7c3aed",
  accentSoft: "rgba(124, 58, 237, 0.15)",

  success: "#22d97e",
  successSoft: "rgba(34, 217, 126, 0.12)",
  danger: "#ff5a5f",
  dangerSoft: "rgba(255, 90, 95, 0.12)",
  warning: "#ffb627",
  warningSoft: "rgba(255, 182, 39, 0.12)",
  info: "#5fa8ff",
  infoSoft: "rgba(95, 168, 255, 0.12)",

  online: "#22d97e",
  offline: "#6b7280",

  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.65)",
  overlayLight: "rgba(0, 0, 0, 0.35)",

  // Gradients (used with expo-linear-gradient)
  gradPrimary: ["#FF6B35", "#ff4f1f"],
  gradPrimaryGlow: ["#FF8A5B", "#FF6B35", "#cc4a17"],
  gradAccent: ["#7c3aed", "#5b21b6"],
  gradCard: ["#1c2029", "#13161d"],
  gradCardElevated: ["#252a35", "#1a1e26"],
  gradHero: ["#FF6B35", "#FF4520", "#cc3a14"],
  gradPotm: ["#ffb627", "#ff6b35"],
  gradGlass: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"],
  gradDarken: ["transparent", "rgba(0,0,0,0.6)"],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
};

export const typography = {
  display: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "700" },
  h3: { fontSize: 17, fontWeight: "700" },
  body: { fontSize: 15, fontWeight: "400" },
  caption: { fontSize: 13, fontWeight: "500" },
  small: { fontSize: 11, fontWeight: "600" },
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },
  glow: {
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glowSubtle: {
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
};

export default { colors, spacing, radius, typography, shadows };
