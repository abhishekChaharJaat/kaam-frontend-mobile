import { useThemeStore } from "@/store/theme";

const LIGHT = {
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  iconDefault: "#6B7280",
  iconMuted: "#9CA3AF",
  bgBase: "#F8FAFC",
  bgSurface: "#FFFFFF",
  border: "#E5E7EB",
};

const DARK = {
  textPrimary: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textTertiary: "#6B7280",
  iconDefault: "#94A3B8",
  iconMuted: "#6B7280",
  bgBase: "#0A0F1A",
  bgSurface: "#111827",
  border: "#1F2937",
};

export function useThemeColors() {
  const theme = useThemeStore((s) => s.theme);
  return theme === "dark" ? DARK : LIGHT;
}
