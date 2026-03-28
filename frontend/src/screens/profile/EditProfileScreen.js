import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import apiClient from "../../api/client";
import { API_BASE_URL } from "../../config/server";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=V&background=FF6B35&color=fff&size=128";

export default function EditProfileScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentAvatar = user?.profile_picture
    ? `${API_BASE_URL.replace("/api", "")}${user.profile_picture}`
    : DEFAULT_AVATAR;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Camera roll permission is needed to select a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("phone_number", phoneNumber);
      formData.append("bio", bio);

      if (imageUri) {
        if (Platform.OS === "web") {
          // On web, fetch the blob from the data URI / object URL
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const ext = blob.type === "image/png" ? "png" : "jpg";
          formData.append("profile_picture", blob, `profile.${ext}`);
        } else {
          const filename = imageUri.split("/").pop();
          const ext = filename.split(".").pop().toLowerCase();
          const mimeType = ext === "png" ? "image/png" : "image/jpeg";
          formData.append("profile_picture", {
            uri: Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""),
            name: filename,
            type: mimeType,
          });
        }
      }

      await apiClient.put("/auth/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await refreshProfile();
      navigation.goBack();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to update profile.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{ uri: imageUri || currentAvatar }}
            style={styles.avatar}
          />
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell us about yourself"
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          value={bio}
          onChangeText={setBio}
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  avatarSection: { alignItems: "center", paddingTop: 30, paddingBottom: 20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ddd",
  },
  changePhotoText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "#333",
  },
  bioInput: { height: 100, textAlignVertical: "top" },
  charCount: { fontSize: 12, color: "#999", textAlign: "right", marginTop: 4 },
  saveButton: {
    backgroundColor: "#FF6B35",
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  buttonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
