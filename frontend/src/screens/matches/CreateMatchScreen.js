import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import apiClient from "../../api/client";
import { useToast } from "../../components/Toast";

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateMatchScreen({ navigation }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [dateChosen, setDateChosen] = useState(false);
  const [timeChosen, setTimeChosen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) {
      setDate(selectedDate);
      setDateChosen(true);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed") return;
    if (selectedTime) {
      setTime(selectedTime);
      setTimeChosen(true);
    }
  };

  const handleCreate = async () => {
    setError("");

    if (!title.trim() || !dateChosen || !timeChosen || !location.trim()) {
      setError("Title, date, time, and location are required");
      return;
    }

    const maxP = parseInt(maxPlayers, 10);
    if (isNaN(maxP) || maxP < 6) {
      setError("Max players must be at least 6");
      return;
    }

    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        date: formatDate(date),
        time: formatTime(time),
        location: location.trim(),
        max_players: maxP,
      };
      if (description.trim()) body.description = description.trim();

      const res = await apiClient.post("/matches", body);
      navigation.replace("MatchDetail", { matchId: res.data.data.id });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create match";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Create a Match</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Sunday Beach Volleyball"
        placeholderTextColor="#999"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Match details..."
        placeholderTextColor="#999"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Date *</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
        <Text style={[styles.pickerBtnText, !dateChosen && styles.pickerPlaceholder]}>
          {dateChosen ? formatDate(date) : "Select date..."}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      <Text style={styles.label}>Time *</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
        <Text style={[styles.pickerBtnText, !timeChosen && styles.pickerPlaceholder]}>
          {timeChosen ? formatTime(time) : "Select time..."}
        </Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true}
          onChange={onTimeChange}
        />
      )}

      <Text style={styles.label}>Location *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Venice Beach Courts"
        placeholderTextColor="#999"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Max Players (min 6)</Text>
      <TextInput
        style={styles.input}
        placeholder="12"
        placeholderTextColor="#999"
        value={maxPlayers}
        onChangeText={setMaxPlayers}
        keyboardType="number-pad"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Match</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#333",
  },
  textArea: { height: 80, textAlignVertical: "top" },
  pickerBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pickerBtnText: {
    fontSize: 16,
    color: "#333",
  },
  pickerPlaceholder: {
    color: "#999",
  },
  errorText: {
    backgroundColor: "#fdecea",
    color: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  button: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
