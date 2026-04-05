import "../global.css";

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from "@expo-google-fonts/dm-sans";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import { vars } from "nativewind";

import { tokenCache } from "@/lib/clerk-token-cache";
import { useThemeStore } from "@/store/theme";
import { useUserStore } from "@/store/user";
import { ToastProvider } from "@/lib/toast";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

const LIGHT_NAV = {
  primary: "#059669",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  border: "#E5E7EB",
  notification: "#059669",
};

const DARK_NAV = {
  primary: "#059669",
  background: "#0A0F1A",
  card: "#111827",
  text: "#F9FAFB",
  border: "#1F2937",
  notification: "#059669",
};

const lightVars = vars({
  "--bg-base": "#F8FAFC",
  "--bg-surface": "#FFFFFF",
  "--bg-elevated": "#F1F5F9",
  "--text-primary": "#111827",
  "--text-secondary": "#6B7280",
  "--text-tertiary": "#9CA3AF",
  "--text-disabled": "#D1D5DB",
  "--text-inverse": "#F9FAFB",
  "--border-default": "#E5E7EB",
  "--border-subtle": "#CBD5E1",
});

const darkVars = vars({
  "--bg-base": "#0A0F1A",
  "--bg-surface": "#111827",
  "--bg-elevated": "#1F2937",
  "--text-primary": "#F9FAFB",
  "--text-secondary": "#9CA3AF",
  "--text-tertiary": "#6B7280",
  "--text-disabled": "#4B5563",
  "--text-inverse": "#111827",
  "--border-default": "#1F2937",
  "--border-subtle": "#374151",
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const { theme, isLoaded: themeLoaded, loadTheme } = useThemeStore();
  const { isLoaded: userLoaded, loadUser } = useUserStore();

  useEffect(() => {
    loadTheme();
    loadUser();
  }, [loadTheme, loadUser]);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && themeLoaded && userLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, themeLoaded, userLoaded]);

  if (!fontsLoaded || !themeLoaded || !userLoaded) {
    return null;
  }

  const isDark = theme === "dark";
  const navColors = isDark ? DARK_NAV : LIGHT_NAV;
  const themeVars = isDark ? darkVars : lightVars;

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
        <View style={[{ flex: 1 }, themeVars]}>
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={isDark ? "#0A0F1A" : "#F8FAFC"}
          />
          <ToastProvider isDark={isDark}>
            <ThemeProvider
              value={{
                ...DefaultTheme,
                dark: isDark,
                colors: navColors,
              }}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: true,
                  gestureDirection: "horizontal",
                  animation: "slide_from_right",
                }}
              />
            </ThemeProvider>
          </ToastProvider>
        </View>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
