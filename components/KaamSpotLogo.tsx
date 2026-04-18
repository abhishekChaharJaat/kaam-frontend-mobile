import { View, Text } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useThemeColors } from "@/lib/useThemeColors";

interface KaamSpotLogoProps {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  row?: boolean;
}

const sizeMap = {
  sm: { box: 28, icon: 16, fontSize: 18, radius: 7, gap: 8 },
  md: { box: 36, icon: 20, fontSize: 24, radius: 9, gap: 10 },
  lg: { box: 44, icon: 26, fontSize: 30, radius: 11, gap: 12 },
};

export default function KaamSpotLogo({ size = "md", onDark = false, row = false }: KaamSpotLogoProps) {
  const colors = useThemeColors();
  const { box, icon, fontSize, radius, gap } = sizeMap[size];

  return (
    <View
      style={{
        flexDirection: row ? "row" : "column",
        alignItems: "center",
        gap,
      }}
    >
      {/* Icon box — white on dark bg, green on light bg */}
      <View
        style={{
          width: box,
          height: box,
          backgroundColor: onDark ? "rgba(255,255,255,0.15)" : "#059669",
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: onDark ? "transparent" : "#059669",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: onDark ? 0 : 4,
        }}
      >
        <MaterialCommunityIcons name="account-hard-hat" size={icon} color="white" />
      </View>

      {/* Wordmark */}
      <Text style={{ fontSize, fontWeight: "800", letterSpacing: -0.5 }}>
        <Text style={{ color: onDark ? "#FFFFFF" : colors.textPrimary }}>Kaam</Text>
        <Text style={{ color: onDark ? "#A7F3D0" : "#059669" }}>Spot</Text>
      </Text>
    </View>
  );
}
