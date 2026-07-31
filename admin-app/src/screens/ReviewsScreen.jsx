import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { client } from "../api";
import { useAdminList } from "../hooks/useAdminList";
import { Stars } from "../components/Stars";
import { colors, font } from "../theme";

const fetchReviews = () => client.get("/review").then((r) => r.data);

export default function ReviewsScreen() {
  const { items, loading, refreshing, reload, remove } = useAdminList(fetchReviews);
  const [deleting, setDeleting] = useState(null);

  const onDelete = useCallback(
    (r) => {
      Alert.alert("Delete review?", `From ${r.name}`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(r.id);
            try {
              await client.delete(`/review/${r.id}`);
              remove(r.id);
            } catch {
              Alert.alert("Error", "Could not delete review.");
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

      <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Stars value={item.rating} size={13} />
        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "300", lineHeight: 21, color: colors.mutedForeground }}>
        {item.comment}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="star-outline" size={16} color={colors.primary} />
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 3, color: colors.foreground }}>
            REVIEWS
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
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={{ fontSize: 14, fontWeight: "300", color: colors.mutedForeground }}>
              No reviews yet. Viewer comments appear here.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
