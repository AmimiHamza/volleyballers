import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const show = useCallback((message, type = "error") => {
    const id = ++counter.current;
    const opacity = new Animated.Value(0);

    setToasts((prev) => [...prev, { id, message, type, opacity }]);

    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: Platform.OS !== "web",
    }).start();

    setTimeout(() => dismiss(id), 3000);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (!toast) return prev;
      Animated.timing(toast.opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      });
      return prev;
    });
  }, []);

  const success = useCallback((msg) => show(msg, "success"), [show]);
  const error = useCallback((msg) => show(msg, "error"), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, dismiss }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            style={[
              styles.toast,
              t.type === "success" ? styles.successBg : styles.errorBg,
              { opacity: t.opacity },
            ]}
          >
            <Ionicons
              name={t.type === "success" ? "checkmark-circle" : "alert-circle"}
              size={20}
              color="#fff"
              style={styles.icon}
            />
            <Text style={styles.text} numberOfLines={3}>{t.message}</Text>
            <TouchableOpacity onPress={() => dismiss(t.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
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
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successBg: { backgroundColor: "#27ae60" },
  errorBg: { backgroundColor: "#e74c3c" },
  icon: { marginRight: 10 },
  text: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "500" },
});
