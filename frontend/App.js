import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ToastProvider } from "./src/components/Toast";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </ToastProvider>
  );
}
