import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadows } from "../theme";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const TYPE_CONFIG = {
  success: { icon: "checkmark-circle", color: colors.success, bg: "#0e2818", border: colors.success },
  error: { icon: "alert-circle", color: colors.danger, bg: "#2a1010", border: colors.danger },
  info: { icon: "information-circle", color: colors.info, bg: "#0e1d2e", border: colors.info },
  warning: { icon: "warning", color: colors.warning, bg: "#2a200a", border: colors.warning },
};

function ToastItem({ toast, onDismiss }) {
  const translate = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translate, { toValue: 0, useNativeDriver: Platform.OS !== "web", friction: 8, tension: 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translate, { toValue: -80, duration: 220, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => onDismiss(toast.id));
  };

  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.error;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
        { transform: [{ translateY: translate }], opacity },
        shadows.lg,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + "30" }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <Text style={styles.text} numberOfLines={3}>{toast.message}</Text>
      <TouchableOpacity onPress={dismiss} hitSlop={10}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const show = useCallback((message, type = "error") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => dismiss(id), 3500);
    return id;
  }, [dismiss]);

  const success = useCallback((msg) => show(msg, "success"), [show]);
  const error = useCallback((msg) => show(msg, "error"), [show]);
  const info = useCallback((msg) => show(msg, "info"), [show]);
  const warning = useCallback((msg) => show(msg, "warning"), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning, dismiss }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    width: "100%",
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  text: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "500" },
});
