import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store doesn't work on web — fall back to localStorage
const isWeb = Platform.OS === "web";

export async function getItem(key) {
  if (isWeb) {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

export async function setItem(key, value) {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key) {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
