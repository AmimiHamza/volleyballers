import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { useToast } from "../../components/Toast";
import { colors, radius, shadows } from "../../theme";
import Avatar from "../../components/Avatar";
import PressableScale from "../../components/PressableScale";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 400, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 150).start();
    animate(dot3, 300).start();
  }, []);

  const dotStyle = (val) => ({
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
  });

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

function MessageBubble({ item, isMe, showAvatar, isLastFromSender, partner }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, friction: 7 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.messageRow,
      isMe ? styles.messageRowMe : styles.messageRowOther,
      { opacity, transform: [{ translateY: translate }] },
    ]}>
      {!isMe && showAvatar ? (
        <Avatar uri={partner.profile_picture} name={partner.username} size={28} style={{ marginRight: 6 }} />
      ) : !isMe ? (
        <View style={{ width: 32, marginRight: 6 }} />
      ) : null}
      {isMe ? (
        <LinearGradient
          colors={colors.gradPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleMe]}
        >
          <Text style={[styles.bubbleText, { color: "#fff" }]}>{item.content}</Text>
          {isLastFromSender && (
            <Text style={[styles.bubbleTime, { color: "rgba(255,255,255,0.75)" }]}>
              {formatTime(item.created_at)}
            </Text>
          )}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Text style={styles.bubbleText}>{item.content}</Text>
          {isLastFromSender && (
            <Text style={styles.bubbleTime}>{formatTime(item.created_at)}</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

export default function ChatConversationScreen({ route, navigation }) {
  const { userId, username } = route.params;
  const { user: me } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const { onMessage, emit } = useSocket() || {};
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState({ username, profile_picture: null });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiClient.get(`/messages/${userId}`);
      setMessages(res.data.data.messages || []);
      setPartner(res.data.data.user);
    } catch { toast.error(t("chat.loadFailed")); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar uri={partner?.profile_picture} name={partner?.username || username} size={32} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{partner?.username || username}</Text>
        </View>
      ),
    });
  }, [partner, username, navigation]);

  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage((msg) => {
      if ((msg.sender_id === userId && msg.receiver_id === me?.id) ||
          (msg.sender_id === me?.id && msg.receiver_id === userId)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        if (msg.sender_id === userId) {
          apiClient.put(`/messages/read/${userId}`).catch(() => {});
          setPartnerTyping(false);
        }
      }
    });
    return unsub;
  }, [onMessage, userId, me?.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput("");
    try {
      const res = await apiClient.post("/messages", { receiver_id: userId, content: text });
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.data.id)) return prev;
        return [...prev, res.data.data];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      toast.error(e.response?.data?.message || t("chat.sendFailed"));
      setInput(text);
    } finally { setSending(false); }
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === me?.id;
    const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== item.sender_id);
    const isLastFromSender = index === messages.length - 1 || messages[index + 1].sender_id !== item.sender_id;
    return (
      <MessageBubble
        item={item}
        isMe={isMe}
        showAvatar={showAvatar}
        isLastFromSender={isLastFromSender}
        partner={partner}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 12, gap: 4, paddingBottom: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={partnerTyping ? <TypingIndicator /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>{t("chat.startChatHint")}</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t("chat.typeMessage")}
          placeholderTextColor={colors.textDim}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <PressableScale
          onPress={handleSend}
          disabled={!input.trim() || sending}
          scaleTo={0.85}
        >
          <LinearGradient
            colors={input.trim() ? colors.gradPrimary : [colors.borderStrong, colors.borderStrong]}
            style={[styles.sendBtn, !input.trim() && { opacity: 0.6 }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </LinearGradient>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 2 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: colors.textDim, marginTop: 3, alignSelf: "flex-end" },

  typingRow: { flexDirection: "row", paddingHorizontal: 12, marginTop: 4 },
  typingBubble: { backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", gap: 4, borderWidth: 1, borderColor: colors.border },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1, maxHeight: 100,
    backgroundColor: colors.input,
    borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    color: colors.text, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    ...shadows.glowSubtle,
  },

  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
});
