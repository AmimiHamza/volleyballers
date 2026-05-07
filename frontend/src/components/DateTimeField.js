import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme";

let DateTimePicker = null;
if (Platform.OS !== "web") {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
}

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function formatTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

/**
 * Cross-platform date/time picker.
 * On web → uses HTML <input type="date"|"time">
 * On native → uses @react-native-community/datetimepicker
 *
 * Props:
 *  - mode: "date" | "time"
 *  - value: Date object
 *  - chosen: bool (whether user actually picked something)
 *  - onChange: (date) => void
 *  - placeholder: string
 *  - icon: ionicon name
 */
export default function DateTimeField({ mode, value, chosen, onChange, placeholder, icon }) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === "web") {
    const inputType = mode === "date" ? "date" : "time";
    const inputValue = mode === "date" ? formatDate(value) : formatTime(value);

    const handleWebChange = (e) => {
      const v = e.target.value;
      if (!v) return;
      if (mode === "date") {
        const [y, m, d] = v.split("-").map(Number);
        const next = new Date(value);
        next.setFullYear(y, m - 1, d);
        onChange(next);
      } else {
        const [h, min] = v.split(":").map(Number);
        const next = new Date(value);
        next.setHours(h, min, 0, 0);
        onChange(next);
      }
    };

    return (
      <View style={styles.wrap}>
        <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        {/* Native HTML input with custom styling */}
        <input
          type={inputType}
          value={chosen ? inputValue : ""}
          onChange={handleWebChange}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: colors.text,
            fontSize: 16,
            paddingTop: 14,
            paddingBottom: 14,
            colorScheme: "dark",
            fontFamily: "inherit",
          }}
        />
      </View>
    );
  }

  // Native
  const onNativeChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) onChange(selectedDate);
  };

  const display = chosen ? (mode === "date" ? formatDate(value) : formatTime(value)) : placeholder;

  return (
    <>
      <TouchableOpacity style={styles.wrap} onPress={() => setShowPicker(true)}>
        <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <Text style={[styles.text, !chosen && { color: colors.textDim }]}>{display}</Text>
      </TouchableOpacity>
      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={mode === "date" ? new Date() : undefined}
          is24Hour={mode === "time"}
          onChange={onNativeChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 14,
  },
});
