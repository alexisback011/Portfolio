import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth";
import { colors, font } from "../theme";

const label = {
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 2,
  textTransform: "uppercase",
  color: colors.mutedForeground,
  fontFamily: font.mono,
};

const input = {
  marginTop: 8,
  borderBottomWidth: 2,
  borderBottomColor: "rgba(255,255,255,0.2)",
  paddingVertical: 12,
  fontSize: 16,
  fontWeight: "300",
  color: colors.foreground,
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Something went wrong. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", letterSpacing: -1, color: colors.foreground }}>
            ALEX<span style={{ color: colors.primary }}>.</span>
          </Text>
          <Text
            style={{
              marginTop: 20,
              fontSize: 36,
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: -1.5,
              color: colors.foreground,
            }}
          >
            Sign In
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, fontWeight: "300", color: colors.mutedForeground }}>
            Access your admin space.
          </Text>

          <View style={{ marginTop: 40, gap: 24 }}>
            <View>
              <Text style={label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@email.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={input}
              />
            </View>

            <View>
              <Text style={label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={input}
              />
            </View>

            {error ? (
              <Text style={{ color: colors.destructive, fontSize: 14, fontWeight: "300" }}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backgroundColor: colors.primary,
                paddingVertical: 18,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 3, color: "#000" }}>
                    SIGN IN
                  </Text>
                  <Ionicons name="arrow-up" size={15} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
