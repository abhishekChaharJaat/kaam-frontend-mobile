import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "@/store/user";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

const TAB_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>["name"]> = {
  index: "home",
  chats: "comments",
  notifications: "bell-o",
  profile: "user-o",
};

const TAB_ICONS_ACTIVE: Record<string, React.ComponentProps<typeof FontAwesome>["name"]> = {
  index: "home",
  chats: "comments",
  notifications: "bell",
  profile: "user",
};

function AnimatedTabIcon({
  name,
  focused,
  color,
}: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  focused: boolean;
  color: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <FontAwesome name={name} size={20} color={color} />
    </Animated.View>
  );
}

function isNestedScreenActive(state: BottomTabBarProps["state"]): boolean {
  const focusedRoute = state.routes[state.index];
  const nestedState = focusedRoute?.state;
  if (nestedState && nestedState.index != null && nestedState.index > 0) {
    return true;
  }
  return false;
}

function getAndroidBottom(bottomInset: number): number {
  if (bottomInset === 0) return 16;          // physical / capacitive buttons
  if (bottomInset < 30) return bottomInset + 8; // gesture navigation
  return bottomInset;                        // 3-button software nav bar
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isNestedScreenActive(state)) return null;

  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as Record<string, unknown>;
    if (options?.href === null) return false;
    if ((options?.tabBarStyle as { display?: string })?.display === "none")
      return false;
    return true;
  });

  const hasFab = visibleRoutes.some((r) => r.name === "jobs");

  return (
    <View
      style={{
        position: "absolute",
        bottom: Platform.OS === "ios" ? 24 : getAndroidBottom(insets.bottom),
        left: 16,
        right: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          backgroundColor: colors.bgSurface,
          borderRadius: 28,
          height: 64,
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colors.bgBase === "#0A0F1A" ? 0.5 : 0.12,
          shadowRadius: 24,
          elevation: 16,
          borderWidth: 1,
          borderColor:
            colors.bgBase === "#0A0F1A"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
        }}
      >
        {visibleRoutes.map((route) => {
          const globalIndex = state.routes.findIndex(
            (r) => r.key === route.key
          );
          const isFocused = state.index === globalIndex;
          const { options } = descriptors[route.key];

          if (route.name === "jobs" && hasFab) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => router.push("/post-job")}
                activeOpacity={0.8}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "#059669",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -28,
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 10,
                }}
              >
                <FontAwesome name="plus" size={22} color="#FFF" />
              </TouchableOpacity>
            );
          }

          const iconName = isFocused
            ? TAB_ICONS_ACTIVE[route.name]
            : TAB_ICONS[route.name];
          const activeColor = "#059669";
          const inactiveColor = colors.textTertiary;
          const color = isFocused ? activeColor : inactiveColor;
          const label =
            typeof options.title === "string"
              ? options.title
              : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 6,
              }}
            >
              <View style={{ alignItems: "center", gap: 3 }}>
                <AnimatedTabIcon
                  name={iconName ?? "circle"}
                  focused={isFocused}
                  color={color}
                />
                {isFocused && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: activeColor,
                      marginTop: 1,
                    }}
                  />
                )}
                {!isFocused && (
                  <Text
                    style={{
                      fontFamily: "DMSans_500Medium",
                      fontSize: 10,
                      color: inactiveColor,
                      marginTop: 1,
                    }}
                  >
                    {label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface BackendUser {
  id: string;
  full_name: string;
  usage_preference?: string;
  city?: string;
  locality?: string;
  state?: string;
  work_title?: string;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const {
    usagePreference,
    isOnboardingComplete,
    onboardingStep,
    setOnboardingComplete,
    setOnboardingStep,
    setUsagePreference,
    setLocation,
  } = useUserStore();
  // Always verify against the backend on sign-in
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setVerifying(false);
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        const me = await api<BackendUser>("/auth/me", { token });

        const hasName = !!me.full_name && me.full_name !== "User";
        const hasLocation = !!me.city;
        const hasPreference = !!me.usage_preference;
        const isWorkerAccount = me.usage_preference === "find_work";
        const hasWorkTitle = !isWorkerAccount || !!me.work_title;

        if (hasName && hasLocation && hasPreference && hasWorkTitle) {
          setUsagePreference(me.usage_preference as "find_worker" | "find_work");
          setLocation({
            latitude: 0,
            longitude: 0,
            city: me.city,
            locality: me.locality,
            state: me.state,
          });
          setOnboardingComplete(true);
          setOnboardingStep(null);
        } else {
          setOnboardingComplete(false);
          if (!hasName) {
            setOnboardingStep("basic-info");
          } else if (!hasLocation) {
            setOnboardingStep("location-permission");
          } else if (!hasPreference) {
            setOnboardingStep("usage-preference");
          } else if (isWorkerAccount && !me.work_title) {
            setOnboardingStep("category-selection");
          } else {
            setOnboardingStep("usage-preference");
          }
        }
      } catch {
        // On network error keep existing local state
      }
      setVerifying(false);
    })();
  }, [isLoaded, isSignedIn, getToken, setUsagePreference, setLocation, setOnboardingComplete, setOnboardingStep]);

  if (!isLoaded || verifying) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (!isOnboardingComplete) {
    const step = onboardingStep ?? "basic-info";
    return <Redirect href={`/(onboarding)/${step}`} />;
  }

  const isWorkerMode = usagePreference === "find_worker";

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={{ paddingBottom: 0 }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("common.home") }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: t("common.chats") }}
      />
      <Tabs.Screen
        name="jobs"
        options={
          isWorkerMode
            ? {
                title: t("common.post"),
                listeners: {
                  tabPress: (e) => e.preventDefault(),
                },
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: t("common.alerts") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("common.profile") }}
      />
    </Tabs>
  );
}
