import { Alert, Platform } from "react-native";

/**
 * showConfirm — for confirmation dialogs only (destructive actions).
 * Still uses native Alert on mobile and window.confirm on web.
 */
export function showConfirm(title, message, buttons) {
  if (Platform.OS === "web") {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      const confirmBtn = buttons.find(
        (b) => b.style !== "cancel" && b.text !== "Cancel"
      );
      if (confirmBtn?.onPress) confirmBtn.onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}
