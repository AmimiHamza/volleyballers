import { useEffect, useRef, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { AppState } from "react-native";

/**
 * Polls a callback while the screen is focused and the app is in the foreground.
 * Stops polling when the screen loses focus or the app goes to background.
 *
 * @param {Function} callback  – async function to call on each tick
 * @param {number}   interval  – milliseconds between polls (default 8000 = 8s)
 */
export default function usePolling(callback, interval = 8000) {
  const timerRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const isFocused = useRef(false);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const start = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (isFocused.current && appState.current === "active") {
        cbRef.current();
      }
    }, interval);
  }, [interval]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start/stop on screen focus
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      start();
      return () => {
        isFocused.current = false;
        stop();
      };
    }, [start, stop])
  );

  // Pause when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appState.current = next;
      if (next !== "active") {
        stop();
      } else if (isFocused.current) {
        cbRef.current(); // immediate refresh on foreground
        start();
      }
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [start, stop]);
}
