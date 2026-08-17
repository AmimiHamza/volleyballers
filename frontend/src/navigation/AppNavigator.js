import React, { useState, useEffect, useCallback } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, useNavigationContainerRef, DarkTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import apiClient from "../api/client";
import { colors } from "../theme";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import PlayersScreen from "../screens/PlayersScreen";
import MatchListScreen from "../screens/matches/MatchListScreen";
import MatchDetailScreen from "../screens/matches/MatchDetailScreen";
import CreateMatchScreen from "../screens/matches/CreateMatchScreen";
import RatePlayersScreen from "../screens/matches/RatePlayersScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import PublicProfileScreen from "../screens/profile/PublicProfileScreen";
import MatchHistoryScreen from "../screens/profile/MatchHistoryScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ChatListScreen from "../screens/chat/ChatListScreen";
import ChatConversationScreen from "../screens/chat/ChatConversationScreen";

const AuthStack = createStackNavigator();
const MainTab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const MatchStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const ChatStack = createStackNavigator();
const RootStack = createStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: colors.bgElevated, shadowColor: "transparent", elevation: 0, borderBottomWidth: 0 },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStackNavigator() {
  const { t } = useTranslation();
  return (
    <HomeStack.Navigator screenOptions={headerStyle}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t("notifications.title") }} />
    </HomeStack.Navigator>
  );
}

function MatchStackNavigator() {
  const { t } = useTranslation();
  return (
    <MatchStack.Navigator screenOptions={headerStyle}>
      <MatchStack.Screen name="MatchList" component={MatchListScreen} options={{ title: t("nav.matches") }} />
      <MatchStack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: t("matches.matchDetails") }} />
      <MatchStack.Screen name="CreateMatch" component={CreateMatchScreen} options={{ title: t("matches.newMatch") }} />
      <MatchStack.Screen name="RatePlayers" component={RatePlayersScreen} options={{ title: t("matches.ratePlayers") }} />
    </MatchStack.Navigator>
  );
}

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ ...headerStyle, headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
        options={{ headerShown: true, title: "Chat" }}
      />
    </ChatStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const { t } = useTranslation();
  return (
    <ProfileStack.Navigator screenOptions={headerStyle}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: t("nav.profile") }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t("profile.editProfile") }} />
      <ProfileStack.Screen name="MatchHistory" component={MatchHistoryScreen} options={{ title: t("history.title") }} />
    </ProfileStack.Navigator>
  );
}

function MainTabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [unreadChat, setUnreadChat] = useState(0);
  const { onMessage } = useSocket() || {};

  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiClient.get("/messages/unread-count");
      setUnreadChat(res.data.data.count || 0);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (!onMessage) return;
    const unsub = onMessage(() => fetchUnread());
    return unsub;
  }, [onMessage, fetchUnread]);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          height: 64 + insets.bottom + 12,
          paddingBottom: insets.bottom + 12,
          paddingTop: 10,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 3, letterSpacing: 0.2, paddingBottom: 2 },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === "HomeTab") iconName = focused ? "home" : "home-outline";
          else if (route.name === "MatchesTab") {
            return <MaterialCommunityIcons name="volleyball" size={24} color={color} />;
          }
          else if (route.name === "PlayersTab") iconName = focused ? "people" : "people-outline";
          else if (route.name === "ChatTab") iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          else if (route.name === "ProfileTab") iconName = focused ? "person-circle" : "person-circle-outline";
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <MainTab.Screen name="HomeTab" component={HomeStackNavigator} options={{ tabBarLabel: t("nav.home") }} />
      <MainTab.Screen
        name="MatchesTab"
        component={MatchStackNavigator}
        options={{ tabBarLabel: t("nav.matches") }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("MatchesTab", { screen: "MatchList" });
          },
        })}
      />
      <MainTab.Screen name="PlayersTab" component={PlayersScreen} options={{ tabBarLabel: t("nav.players") }} />
      <MainTab.Screen
        name="ChatTab"
        component={ChatStackNavigator}
        options={{
          tabBarLabel: t("nav.chat"),
          tabBarBadge: unreadChat > 0 ? unreadChat : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10, fontWeight: "700" },
        }}
      />
      <MainTab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ tabBarLabel: t("nav.profile") }} />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const navigationRef = useNavigationContainerRef();

  // The push-notification tap handler lived here. It is removed along with
  // expo-notifications — see src/utils/pushNotifications.js for how to restore
  // it once a Firebase project exists.

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ headerShown: true, title: t("profile.playerProfile"), ...headerStyle }} />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
