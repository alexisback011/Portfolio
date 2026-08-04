import { useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/auth";
import LoginScreen from "./src/screens/LoginScreen";
import MessagesScreen from "./src/screens/MessagesScreen";
import ReviewsScreen from "./src/screens/ReviewsScreen";
import { colors } from "./src/theme";

function Tabs() {
  const [tab, setTab] = useState("messages");
  const { logout } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {tab === "messages" ? <MessagesScreen onLogout={logout} /> : <ReviewsScreen />}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingBottom: 6,
        }}
      >
        {[
          { key: "messages", label: "Messages", icon: "mail-outline", activeIcon: "mail" },
          { key: "reviews", label: "Reviews", icon: "star-outline", activeIcon: "star" },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 4,
                paddingVertical: 10,
              }}
            >
              <Ionicons
                name={active ? t.activeIcon : t.icon}
                size={22}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 2,
                  color: active ? colors.foreground : colors.mutedForeground,
                }}
              >
                {t.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  return user ? <Tabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
