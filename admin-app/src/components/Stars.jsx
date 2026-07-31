import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export const Stars = ({ value, size = 12 }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Ionicons
        key={n}
        name={n <= value ? "star" : "star-outline"}
        size={size}
        color={n <= value ? colors.primary : "rgba(255,255,255,0.25)"}
      />
    ))}
  </View>
);
