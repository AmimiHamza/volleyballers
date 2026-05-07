import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./src/i18n";
import { LanguageProvider, useLanguage } from "./src/contexts/LanguageContext";
import { AuthProvider } from "./src/contexts/AuthContext";
import { SocketProvider } from "./src/contexts/SocketContext";
import { ToastProvider } from "./src/components/Toast";
import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from "./src/screens/SplashScreen";
import LanguagePickerModal from "./src/components/LanguagePickerModal";

function AppContent() {
  const [splashDone, setSplashDone] = useState(false);
  const { isReady, showPicker } = useLanguage();

  if (!isReady) return null;
  if (showPicker) return <LanguagePickerModal visible />;
  if (!splashDone) return <SplashScreen onFinish={() => setSplashDone(true)} />;

  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
