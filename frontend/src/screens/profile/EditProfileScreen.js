import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import apiClient from "../../api/client";
import { API_BASE_URL } from "../../config/server";
import CityAutocomplete from "../../components/CityAutocomplete";
import GradientButton from "../../components/GradientButton";
import Avatar from "../../components/Avatar";
import AnimatedEntry from "../../components/AnimatedEntry";
import { colors, radius, spacing, shadows } from "../../theme";

export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [city, setCity] = useState(user?.city || "");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { toast.error(t("profile.photoPermission")); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("phone_number", phoneNumber);
      formData.append("bio", bio);
      formData.append("city", city);
      if (imageUri) {
        if (Platform.OS === "web") {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const ext = blob.type === "image/png" ? "png" : "jpg";
          formData.append("profile_picture", blob, `profile.${ext}`);
        } else {
          const filename = imageUri.split("/").pop();
          const ext = filename.split(".").pop().toLowerCase();
          formData.append("profile_picture", { uri: Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""), name: filename, type: ext === "png" ? "image/png" : "image/jpeg" });
        }
      }
      await apiClient.put("/auth/profile", formData, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshProfile();
      navigation.goBack();
    } catch (error) {
      toast.error(error.response?.data?.message || t("profile.updateFailed"));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <LinearGradient colors={[colors.primary + "30", colors.bg]} style={styles.headerBg} />

      <AnimatedEntry style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
          <Avatar uri={imageUri || user?.profile_picture} name={user?.username} size={110} ring ringColor={colors.primary} />
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.changePhotoText}>{t("profile.changePhoto")}</Text>
      </AnimatedEntry>

      <AnimatedEntry delay={120} style={styles.form}>
        <Field label={t("profile.phone")} icon="call-outline">
          <TextInput style={styles.input} placeholder={t("profile.phonePlaceholder")} placeholderTextColor={colors.textDim} keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
        </Field>

        <View>
          <View style={styles.labelRow}>
            <Ionicons name="location-outline" size={13} color={colors.primary} />
            <Text style={styles.label}>{t("city.label")}</Text>
          </View>
          <CityAutocomplete value={city} onChange={setCity} placeholder={t("city.placeholder")} />
        </View>

        <Field label={t("profile.bio")} icon="document-text-outline">
          <TextInput style={[styles.input, styles.bioInput]} placeholder={t("profile.bioPlaceholder")} placeholderTextColor={colors.textDim} multiline maxLength={500} value={bio} onChangeText={setBio} />
        </Field>
        <Text style={styles.charCount}>{bio.length}/500</Text>
      </AnimatedEntry>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <GradientButton
          label={t("profile.saveChanges")}
          onPress={handleSave}
          loading={loading}
          icon={<Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
        />
      </View>
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
  headerBg: { position: "absolute", left: 0, right: 0, top: 0, height: 240 },
  avatarSection: { alignItems: "center", paddingTop: 30, paddingBottom: 20 },
  cameraIcon: {
    position: "absolute", bottom: 4, right: 4,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.bg,
    ...shadows.glowSubtle,
  },
  changePhotoText: { color: colors.primary, fontSize: 13, fontWeight: "700", marginTop: 10 },
  form: { paddingHorizontal: 20, gap: 14 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldWrap: { backgroundColor: colors.input, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  input: { color: colors.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 14 },
  bioInput: { height: 100, textAlignVertical: "top", paddingTop: 14 },
  charCount: { fontSize: 11, color: colors.textDim, textAlign: "right", marginTop: -8, paddingRight: 4 },
});
