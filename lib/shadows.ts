import { Platform, ViewStyle } from "react-native";

type ShadowLevel = "sm" | "md" | "lg" | "xl";

const shadowValues: Record<ShadowLevel, { ios: ViewStyle; android: ViewStyle }> = {
  sm: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
  },
  md: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
  },
  lg: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
  },
  xl: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 48,
    },
    android: { elevation: 16 },
  },
};

export function shadow(level: ShadowLevel): ViewStyle {
  return Platform.OS === "ios" ? shadowValues[level].ios : shadowValues[level].android;
}
