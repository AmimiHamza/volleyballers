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
import ErrorBoundary, { reportCrash } from "./src/components/ErrorBoundary";

// Diagnostic: reports when a stage mounts, so a native crash (which no JS error
// boundary can catch) still tells us how far startup got.
function Breadcrumb({ at }) {
  React.useEffect(() => {
    reportCrash({ kind: "breadcrumb", at });
  }, [at]);
  return null;
}

function AppContent() {
  const [splashDone, setSplashDone] = useState(false);
  const { isReady, showPicker } = useLanguage();

  if (!isReady) return null;
  if (showPicker) {
    return (
      <>
        <Breadcrumb at="language-picker" />
        <LanguagePickerModal visible />
      </>
    );
  }
  if (!splashDone) {
    return (
      <>
        <Breadcrumb at="splash" />
        <SplashScreen
          onFinish={() => {
            reportCrash({ kind: "breadcrumb", at: "splash-finished" });
            setSplashDone(true);
          }}
        />
      </>
    );
  }

  return (
    <ToastProvider>
      <Breadcrumb at="toast-mounted" />
      <AuthProvider>
        <Breadcrumb at="auth-mounted" />
        <SocketProvider>
          <Breadcrumb at="socket-mounted" />
          <StatusBar style="light" />
          <AppNavigator />
          <Breadcrumb at="navigator-mounted" />
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Breadcrumb at="root" />
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
