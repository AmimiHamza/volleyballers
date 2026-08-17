/**
 * Push notifications are disabled in this build.
 *
 * expo-notifications pulls Firebase into the Android manifest, including
 * FirebaseInitProvider — a ContentProvider that runs at process start and
 * calls FirebaseApp.initializeApp(). Without a google-services.json there is
 * no google_app_id resource, so it throws and Android kills the app before
 * any JavaScript runs.
 *
 * The module is therefore removed until a Firebase project exists. To restore
 * push: create the Firebase project, add the GOOGLE_SERVICES_JSON repo secret
 * (the CI workflow already uses it when present), reinstate "expo-notifications"
 * in package.json + app.json plugins, and restore the real implementations
 * below along with the response listener in navigation/AppNavigator.js.
 */

export async function registerForPushNotifications() {
  return null;
}

export async function unregisterPushToken() {
  // no-op
}
