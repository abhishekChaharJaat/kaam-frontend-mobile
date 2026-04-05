import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import { useAuth, useUser } from "@clerk/clerk-expo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useUserStore } from "@/store/user";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3.5"
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          backgroundColor: danger
            ? "rgba(239,68,68,0.1)"
            : iconBg || "rgba(5,150,105,0.1)",
        }}
      >
        <FontAwesome
          name={icon}
          size={16}
          color={danger ? "#EF4444" : iconColor || "#059669"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          className={`text-body font-sans-medium ${
            danger ? "text-error" : "text-text-primary"
          }`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-caption text-text-tertiary mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
      <FontAwesome
        name="chevron-right"
        size={11}
        color={danger ? "#EF4444" : "#9CA3AF"}
      />
    </TouchableOpacity>
  );
}

function SectionCard({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 4,
        marginHorizontal: 20,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.bgBase === "#0A0F1A" ? 0.3 : 0.06,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor:
          colors.bgBase === "#0A0F1A"
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.03)",
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-border" />;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const { usagePreference, location } = useUserStore();
  const router = useRouter();
  const colors = useThemeColors();
  const isDark = colors.bgBase === "#0A0F1A";
  const [workTitle, setWorkTitle] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (usagePreference !== "find_work") return;
      (async () => {
        try {
          const token = await getToken();
          const me = await api<{ work_title?: string }>("/auth/me", { token });
          setWorkTitle(me.work_title || null);
        } catch {}
      })();
    }, [usagePreference, getToken])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      setStatusBarBackgroundColor("#059669", false);
      setStatusBarStyle("light");
      return () => {
        setStatusBarBackgroundColor(isDark ? "#0A0F1A" : "#F8FAFC", false);
        setStatusBarStyle(isDark ? "light" : "dark");
      };
    }, [isDark])
  );

  const initials =
    (user?.firstName?.[0] || "").toUpperCase() +
    (user?.lastName?.[0] || "").toUpperCase() || "U";

  const isEmployer = usagePreference === "find_worker";

  return (
    <ScrollView
      className="flex-1 bg-bg-base"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header */}
      <View
        style={{
          backgroundColor: "#059669",
          paddingTop: Platform.OS === "ios" ? 56 : 44,
          paddingBottom: 52,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: "rgba(255,255,255,0.4)",
            }}
          >
            <Text
              style={{
                fontSize: 32,
                fontFamily: "DMSans_700Bold",
                color: "#FFF",
              }}
            >
              {initials}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 22,
              fontFamily: "DMSans_700Bold",
              color: "#FFF",
              marginTop: 14,
            }}
          >
            {user?.fullName || t("chat.user")}
          </Text>

          {workTitle ? (
            <Text
              style={{
                fontSize: 14,
                fontFamily: "DMSans_600SemiBold",
                color: "rgba(255,255,255,0.9)",
                marginTop: 4,
              }}
            >
              {workTitle}
            </Text>
          ) : (
            <Text
              style={{
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                color: "rgba(255,255,255,0.75)",
                marginTop: 4,
              }}
            >
              {user?.primaryEmailAddress?.emailAddress || ""}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 12,
              backgroundColor: "rgba(255,255,255,0.18)",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              gap: 6,
            }}
          >
            <FontAwesome
              name={isEmployer ? "search" : "briefcase"}
              size={11}
              color="#FFF"
            />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "DMSans_600SemiBold",
                color: "#FFF",
              }}
            >
              {isEmployer ? t("profile.findWorker") : t("profile.findWork")}
            </Text>
          </View>
        </View>
      </View>

      {/* Location pill */}
      {location?.city && (
        <View style={{ alignItems: "center", marginTop: -20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.bgSurface,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 24,
              gap: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 6,
              borderWidth: 1,
              borderColor:
                colors.bgBase === "#0A0F1A"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            }}
          >
            <FontAwesome name="map-marker" size={14} color="#059669" />
            <Text className="text-body-sm font-sans-medium text-text-primary">
              {[location.locality, location.city].filter(Boolean).join(", ")}
            </Text>
          </View>
        </View>
      )}

      <View style={{ marginTop: location?.city ? 20 : 28 }}>
        {/* Account Section */}
        <Text
          className="text-caption font-sans-semibold text-text-tertiary"
          style={{ marginLeft: 28, marginBottom: 8, letterSpacing: 0.8 }}
        >
          {t("profile.account", { defaultValue: "ACCOUNT" }).toUpperCase()}
        </Text>
        <SectionCard colors={colors}>
          <MenuItem
            icon="pencil"
            title={t("profile.editProfile")}
            subtitle={t("profile.updateInfo")}
            onPress={() => router.push("/(tabs)/profile/edit")}
          />
          <Divider />
          {isEmployer ? (
            <MenuItem
              icon="heart"
              title={t("profile.savedUsers")}
              subtitle={t("profile.bookmarkedWorkers")}
              onPress={() => router.push("/saved-users")}
              iconBg="rgba(239,68,68,0.08)"
              iconColor="#EF4444"
            />
          ) : (
            <MenuItem
              icon="check-circle"
              title={t("assignedJobs.title")}
              subtitle={t("assignedJobs.profileSubtitle")}
              onPress={() => router.push("/assigned-jobs")}
              iconBg="rgba(5,150,105,0.1)"
              iconColor="#059669"
            />
          )}
          <Divider />
          <MenuItem
            icon="briefcase"
            title={t("jobs.myJobs")}
            onPress={() => router.push("/my-jobs")}
            iconBg="rgba(59,130,246,0.1)"
            iconColor="#3B82F6"
          />
        </SectionCard>

        {/* Preferences Section */}
        <Text
          className="text-caption font-sans-semibold text-text-tertiary"
          style={{
            marginLeft: 28,
            marginBottom: 8,
            marginTop: 6,
            letterSpacing: 0.8,
          }}
        >
          {t("profile.general", { defaultValue: "GENERAL" }).toUpperCase()}
        </Text>
        <SectionCard colors={colors}>
          <MenuItem
            icon="cog"
            title={t("profile.settings")}
            subtitle={t("profile.settingsSubtitle")}
            onPress={() => router.push("/settings")}
            iconBg="rgba(107,114,128,0.1)"
            iconColor="#6B7280"
          />
          <Divider />
          <MenuItem
            icon="question-circle"
            title={t("profile.helpSupport")}
            onPress={() => router.push("/help")}
            iconBg="rgba(245,158,11,0.1)"
            iconColor="#F59E0B"
          />
          <Divider />
          <MenuItem
            icon="file-text-o"
            title={t("profile.termsPrivacy")}
            onPress={() => router.push("/terms")}
            iconBg="rgba(107,114,128,0.1)"
            iconColor="#6B7280"
          />
        </SectionCard>

        {/* Logout */}
        <SectionCard colors={colors}>
          <MenuItem
            icon="sign-out"
            title={t("auth.logout")}
            onPress={async () => await signOut()}
            danger
          />
        </SectionCard>
      </View>

      {/* App version */}
      <Text
        className="text-caption text-text-disabled text-center"
        style={{ marginTop: 4, marginBottom: 8 }}
      >
        v1.0.0
      </Text>
    </ScrollView>
  );
}
