import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import { useToast } from "../../components/Toast";
import GradientButton from "../../components/GradientButton";
import AnimatedEntry from "../../components/AnimatedEntry";
import DateTimeField from "../../components/DateTimeField";
import { colors, radius, spacing } from "../../theme";

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function formatTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

export default function CreateMatchScreen({ navigation }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [dateChosen, setDateChosen] = useState(false);
  const [timeChosen, setTimeChosen] = useState(false);
  const [location, setLocation] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !dateChosen || !timeChosen || !location.trim()) {
      toast.error(t("matches.requiredFields")); return;
    }
    const maxP = parseInt(maxPlayers, 10);
    if (isNaN(maxP) || maxP < 6) { toast.error(t("matches.maxPlayersError")); return; }
    setLoading(true);
    try {
      const body = { title: title.trim(), date: formatDate(date), time: formatTime(time), location: location.trim(), max_players: maxP };
      if (description.trim()) body.description = description.trim();
      const res = await apiClient.post("/matches", body);
      navigation.replace("MatchDetail", { matchId: res.data.data.id });
    } catch (err) {
      toast.error(err.response?.data?.message || t("matches.createFailed"));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: spacing.md, paddingBottom: 40 }}>
      <AnimatedEntry style={{ gap: spacing.md }}>
        <Field label={t("matches.titleLabel")} icon="trophy-outline">
          <TextInput style={styles.input} placeholder={t("matches.titlePlaceholder")} placeholderTextColor={colors.textDim} value={title} onChangeText={setTitle} maxLength={100} />
        </Field>

        <Field label={t("matches.descriptionLabel")} icon="document-text-outline">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("matches.descriptionPlaceholder")}
            placeholderTextColor={colors.textDim}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </Field>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.primary} />
              <Text style={styles.label}>{t("matches.dateLabel")}</Text>
            </View>
            <DateTimeField
              mode="date"
              value={date}
              chosen={dateChosen}
              onChange={(d) => { setDate(d); setDateChosen(true); }}
              placeholder={t("matches.datePlaceholder")}
              icon="calendar-outline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Ionicons name="time-outline" size={13} color={colors.primary} />
              <Text style={styles.label}>{t("matches.timeLabel")}</Text>
            </View>
            <DateTimeField
              mode="time"
              value={time}
              chosen={timeChosen}
              onChange={(d) => { setTime(d); setTimeChosen(true); }}
              placeholder={t("matches.timePlaceholder")}
              icon="time-outline"
            />
          </View>
        </View>

        <Field label={t("matches.locationLabel")} icon="location-outline">
          <TextInput style={styles.input} placeholder={t("matches.locationPlaceholder")} placeholderTextColor={colors.textDim} value={location} onChangeText={setLocation} />
        </Field>

        <Field label={t("matches.maxPlayersLabel")} icon="people-outline">
          <TextInput style={styles.input} placeholder="12" placeholderTextColor={colors.textDim} value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
        </Field>

        <GradientButton
          label={t("matches.createMatchBtn")}
          onPress={handleCreate}
          loading={loading}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={{ marginTop: spacing.lg }}
        />
      </AnimatedEntry>
    </ScrollView>
  );
}

function Field({ label, icon, children }) {
  return (
    <View>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={13} color={colors.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.fieldWrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldWrap: {
    backgroundColor: colors.input,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { color: colors.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 14 },
  textArea: { height: 90, textAlignVertical: "top", paddingTop: 14 },
});
