import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import apiClient from "../api/client";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and register the push token with the backend.
 * Returns the Expo push token string, or null if permissions denied / unavailable.
 */
export async function registerForPushNotifications() {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B35",
      sound: "default",
    });
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "volleyup",
  });
  const pushToken = tokenData.data;

  // Send token to backend
  try {
    await apiClient.post("/push-tokens", { expo_push_token: pushToken });
  } catch (err) {
    console.warn("Failed to register push token with backend:", err.message);
  }

  return pushToken;
}

/**
 * Unregister the push token from the backend (call on logout).
 */
export async function unregisterPushToken(pushToken) {
  if (!pushToken) return;
  try {
    await apiClient.delete("/push-tokens", {
      data: { expo_push_token: pushToken },
    });
  } catch (err) {
    console.warn("Failed to unregister push token:", err.message);
  }
}
