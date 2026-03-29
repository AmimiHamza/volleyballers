import React, { useState, useEffect, useCallback, useRef } from "react";
import { ActivityIndicator, View, Text, StyleSheet, Platform } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../api/client";

// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

// Match screens
import MatchListScreen from "../screens/matches/MatchListScreen";
import MatchDetailScreen from "../screens/matches/MatchDetailScreen";
import CreateMatchScreen from "../screens/matches/CreateMatchScreen";
import RatePlayersScreen from "../screens/matches/RatePlayersScreen";

// Friends screen (unified)
import FriendsScreen from "../screens/friends/FriendsScreen";

// Profile screens
import ProfileScreen from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import PublicProfileScreen from "../screens/profile/PublicProfileScreen";
import MatchHistoryScreen from "../screens/profile/MatchHistoryScreen";

// Other screens
import NotificationsScreen from "../screens/notifications/NotificationsScreen";

const AuthStack = createStackNavigator();
const MainTab = createBottomTabNavigator();
const MatchStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const RootStack = createStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: "#FF6B35" },
  headerTintColor: "#fff",
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MatchStackNavigator() {
  return (
    <MatchStack.Navigator screenOptions={headerStyle}>
      <MatchStack.Screen name="MatchList" component={MatchListScreen} options={{ title: "Matches" }} />
      <MatchStack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: "Match Details" }} />
      <MatchStack.Screen name="CreateMatch" component={CreateMatchScreen} options={{ title: "New Match" }} />
      <MatchStack.Screen name="RatePlayers" component={RatePlayersScreen} options={{ title: "Rate Players" }} />
    </MatchStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={headerStyle}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: "Profile" }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit Profile" }} />
      <ProfileStack.Screen name="MatchHistory" component={MatchHistoryScreen} options={{ title: "Match History" }} />
    </ProfileStack.Navigator>
  );
}

function MainTabNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiClient.get("/notifications?page=1&per_page=1");
      setUnreadCount(res.data.data.unread_count || 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchUnread]);

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#999",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "MatchesTab") {
            return (
              <MaterialCommunityIcons
                name={focused ? "volleyball" : "volleyball"}
                size={24}
                color={color}
              />
            );
          }
          let iconName;
          if (route.name === "FriendsTab") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "ProfileTab") {
            iconName = focused ? "person-circle" : "person-circle-outline";
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <MainTab.Screen
        name="MatchesTab"
        component={MatchStackNavigator}
        options={{ tabBarLabel: "Matches" }}
      />
      <MainTab.Screen
        name="FriendsTab"
        component={FriendsScreen}
        options={{
          tabBarLabel: "Friends",
          headerShown: false,
        }}
      />
      <MainTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Alerts",
          headerShown: true,
          ...headerStyle,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#FF6B35",
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
        }}
        listeners={{
          focus: () => setUnreadCount(0),
        }}
      />
      <MainTab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: "Profile" }}
      />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!isAuthenticated) return;

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (!data || !navigationRef.isReady()) return;

        const { reference_type, reference_id } = data;
        if (reference_type === "match" && reference_id) {
          navigationRef.navigate("Main", {
            screen: "MatchesTab",
            params: {
              screen: "MatchDetail",
              params: { matchId: reference_id },
            },
          });
        } else if (reference_type === "user" && reference_id) {
          navigationRef.navigate("PublicProfile", { userId: reference_id });
        } else if (reference_type === "friend_request") {
          navigationRef.navigate("Main", {
            screen: "FriendsTab",
          });
        }
      }
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen
              name="PublicProfile"
              component={PublicProfileScreen}
              options={{ headerShown: true, title: "Player Profile", ...headerStyle }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
