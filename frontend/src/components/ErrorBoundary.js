import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { API_BASE_URL } from "../config/server";

/**
 * Diagnostic crash reporter.
 *
 * A release build has no debugger attached, so a fatal JS error just closes the
 * app with nothing to inspect. This renders the error on screen and POSTs it to
 * the backend, where it lands in journalctl.
 */
export function reportCrash(payload) {
  try {
    fetch(`${API_BASE_URL}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // reporting must never itself throw
  }
}

/** Install a global handler for errors thrown outside React rendering. */
export function installGlobalErrorHandler() {
  const eu = global.ErrorUtils;
  if (!eu || !eu.setGlobalHandler) return;
  const previous = eu.getGlobalHandler && eu.getGlobalHandler();
  eu.setGlobalHandler((error, isFatal) => {
    reportCrash({
      kind: "global",
      fatal: !!isFatal,
      name: error && error.name,
      message: error && error.message,
      stack: error && error.stack,
    });
    if (previous) previous(error, isFatal);
  });
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    reportCrash({
      kind: "render",
      name: error && error.name,
      message: error && error.message,
      stack: error && error.stack,
      componentStack: info && info.componentStack,
    });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <Text style={styles.title}>App crashed</Text>
        <Text style={styles.label}>Message</Text>
        <Text style={styles.mono}>{String(error.message || error)}</Text>
        {!!error.stack && (
          <>
            <Text style={styles.label}>Stack</Text>
            <Text style={styles.mono}>{String(error.stack).slice(0, 2000)}</Text>
          </>
        )}
        {!!(info && info.componentStack) && (
          <>
            <Text style={styles.label}>Component stack</Text>
            <Text style={styles.mono}>{String(info.componentStack).slice(0, 2000)}</Text>
          </>
        )}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0a0d12" },
  content: { padding: 20, paddingTop: 60 },
  title: { color: "#ff5a5f", fontSize: 22, fontWeight: "800", marginBottom: 16 },
  label: { color: "#a0a4ad", fontSize: 12, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  mono: { color: "#ffffff", fontSize: 11, fontFamily: "monospace" },
});
