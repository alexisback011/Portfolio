import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { client } from "../api";
import { useAdminList } from "../hooks/useAdminList";
import { useAuth } from "../auth";
import { colors, font } from "../theme";

const fetchMessages = () => client.get("/contact").then((r) => r.data);

export default function MessagesScreen({ onLogout }) {
  const { user } = useAuth();
  const { items, loading, refreshing, reload, remove } = useAdminList(fetchMessages);
  const [deleting, setDeleting] = useState(null);

  const onDelete = useCallback(
    (m) => {
      Alert.alert("Delete message?", `From ${m.name}`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(m.id);
            try {
              await client.delete(`/contact/${m.id}`);
              remove(m.id);
            } catch {
              Alert.alert("Error", "Could not delete message.");
            } finally {
              setDeleting(null);
            }
          },
        },
      ]);
    },
    [remove]
  );

  const renderItem = ({ item }) => (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: colors.foreground }}>
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          disabled={deleting === item.id}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {deleting === item.id ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL(`mailto:${item.email}`)}
        style={{ marginTop: 6 }}
      >
        <Text style={{ color: colors.secondary, fontSize: 12, fontFamily: font.mono }}>
          {item.email}
        </Text>
      </TouchableOpacity>

      <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "300", lineHeight: 21, color: colors.mutedForeground }}>
        {item.message}
      </Text>

      <Text style={{ marginTop: 12, fontSize: 11, color: colors.mutedForeground }}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 3, color: colors.secondary }}>
              [ SIGNED IN ]
            </Text>
            <Text
              numberOfLines={1}
              style={{ marginTop: 6, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: colors.foreground }}
            >
              {user?.name}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.mutedForeground, fontFamily: font.mono }}>
              {user?.email}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onLogout}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="log-out-outline" size={15} color={colors.foreground} />
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 2, color: colors.foreground }}>
              LOGOUT
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="mail-outline" size={16} color={colors.primary} />
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 3, color: colors.foreground }}>
            MESSAGE INBOX
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" }} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.mutedForeground }}>
            {items.length}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={{ fontSize: 14, fontWeight: "300", color: colors.mutedForeground }}>
              No messages yet. Submissions from the contact form appear here.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
