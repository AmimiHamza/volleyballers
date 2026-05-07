import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { API_BASE_URL } from "../config/server";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { accessToken, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const messageListenersRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const baseUrl = API_BASE_URL.replace("/api", "");
    const socket = io(baseUrl, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => {
      // eslint-disable-next-line no-console
      console.warn("Socket error:", err.message);
    });

    socket.on("new_message", (msg) => {
      messageListenersRef.current.forEach((cb) => cb(msg));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken, isAuthenticated]);

  const onMessage = useCallback((cb) => {
    messageListenersRef.current.add(cb);
    return () => messageListenersRef.current.delete(cb);
  }, []);

  const emit = useCallback((event, payload) => {
    if (socketRef.current) socketRef.current.emit(event, payload);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, onMessage, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
