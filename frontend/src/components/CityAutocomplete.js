import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MOROCCO_CITIES } from "../data/moroccoCities";
import { colors, radius, spacing } from "../theme";

export default function CityAutocomplete({ value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = query.trim()
    ? MOROCCO_CITIES.filter((c) =>
        c.toLowerCase().startsWith(query.trim().toLowerCase())
      ).slice(0, 6)
    : [];

  const handleChange = (text) => {
    setQuery(text);
    onChange(text);
    setShowSuggestions(true);
  };

  const handleSelect = (city) => {
    setQuery(city);
    onChange(city);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Ionicons name="location-outline" size={20} color={colors.textMuted} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder || "City"}
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={handleChange}
          onFocus={() => setShowSuggestions(true)}
          autoCapitalize="words"
        />
      </View>
      {showSuggestions && filtered.length > 0 && (
        <View style={styles.suggestions}>
          {filtered.map((city) => (
            <TouchableOpacity
              key={city}
              style={styles.suggestionItem}
              onPress={() => handleSelect(city)}
            >
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.suggestionText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  suggestions: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 15,
  },
});
