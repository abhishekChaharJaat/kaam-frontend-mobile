import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { useThemeStore } from "@/store/theme";
import { useUserStore } from "@/store/user";
import { api } from "@/lib/api";
import i18n from "@/i18n";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

const LANG_STORAGE_KEY = "@app_language";

async function persistLang(lang: string) {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

function SettingRow({
  icon,
  title,
  value,
  onPress,
  danger,
  iconBg,
  iconColor,
  textColor,
  subtextColor,
  readonly,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
  textColor: string;
  subtextColor: string;
  readonly?: boolean;
}) {
  const content = (
    <>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
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
          size={15}
          color={danger ? "#EF4444" : iconColor || "#059669"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "DMSans_500Medium",
            color: danger ? "#EF4444" : textColor,
          }}
        >
          {title}
        </Text>
      </View>
      {value && (
        <Text
          style={{
            fontSize: 13,
            fontFamily: "DMSans_400Regular",
            color: subtextColor,
            marginRight: 6,
          }}
        >
          {value}
        </Text>
      )}
      {!readonly && (
        <FontAwesome
          name="chevron-right"
          size={11}
          color={danger ? "#EF4444" : subtextColor}
        />
      )}
    </>
  );

  if (readonly) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
      }}
    >
      {content}
    </TouchableOpacity>
  );
}

function SectionCard({
  children,
  isDark,
  bgSurface,
}: {
  children: React.ReactNode;
  isDark: boolean;
  bgSurface: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bgSurface,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 4,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: isDark
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

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const colors = useThemeColors();
  const { usagePreference } = useUserStore();
  const [language, setLanguage] = useState(i18n.language);
  const isDark = colors.bgBase === "#0A0F1A";

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "hi" : "en";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    await persistLang(newLang);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("settings.deleteAccount"),
      t("auth.deleteAccountConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              await api("/users/me", { method: "DELETE", token });
              await signOut();
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-bg-base">
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.bgSurface,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          }}
        >
          <FontAwesome name="arrow-left" size={15} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontFamily: "DMSans_700Bold",
            color: colors.textPrimary,
          }}
        >
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textTertiary,
            marginBottom: 10,
            marginLeft: 8,
            letterSpacing: 0.8,
          }}
        >
          {t("settings.preferences")}
        </Text>
        <SectionCard isDark={isDark} bgSurface={colors.bgSurface}>
          <SettingRow
            icon="language"
            title={t("settings.language")}
            value={language === "hi" ? "हिंदी" : "English"}
            onPress={toggleLanguage}
            iconBg="rgba(59,130,246,0.1)"
            iconColor="#3B82F6"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon={isDark ? "moon-o" : "sun-o"}
            title={t("settings.theme")}
            value={theme === "dark" ? t("settings.dark") : t("settings.light")}
            onPress={toggleTheme}
            iconBg={isDark ? "rgba(147,130,220,0.12)" : "rgba(245,158,11,0.1)"}
            iconColor={isDark ? "#9382DC" : "#F59E0B"}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          {usagePreference === "find_work" && (
            <>
              <Divider />
              <SettingRow
                icon="exchange"
                title={t("settings.usagePreference")}
                value={t("settings.findingWork")}
                readonly
                textColor={colors.textPrimary}
                subtextColor={colors.textSecondary}
              />
            </>
          )}
          <Divider />
          <SettingRow
            icon="map-marker"
            title={t("settings.updateLocation")}
            onPress={() => {}}
            iconBg="rgba(239,68,68,0.08)"
            iconColor="#EF4444"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </SectionCard>

        {/* Support */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textTertiary,
            marginBottom: 10,
            marginLeft: 8,
            marginTop: 8,
            letterSpacing: 0.8,
          }}
        >
          {t("settings.support")}
        </Text>
        <SectionCard isDark={isDark} bgSurface={colors.bgSurface}>
          <SettingRow
            icon="question-circle"
            title={t("settings.helpSupport")}
            onPress={() => router.push("/help")}
            iconBg="rgba(245,158,11,0.1)"
            iconColor="#F59E0B"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="file-text-o"
            title={t("settings.termsPrivacy")}
            onPress={() => router.push("/terms")}
            iconBg="rgba(107,114,128,0.1)"
            iconColor="#6B7280"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="info-circle"
            title={t("settings.about")}
            onPress={() => router.push("/about")}
            iconBg="rgba(59,130,246,0.1)"
            iconColor="#3B82F6"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="ban"
            title={t("settings.blockedUsers")}
            onPress={() => {}}
            iconBg="rgba(107,114,128,0.1)"
            iconColor="#6B7280"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </SectionCard>

        {/* Account */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textTertiary,
            marginBottom: 10,
            marginLeft: 8,
            marginTop: 8,
            letterSpacing: 0.8,
          }}
        >
          {t("settings.account")}
        </Text>
        <SectionCard isDark={isDark} bgSurface={colors.bgSurface}>
          <SettingRow
            icon="sign-out"
            title={t("auth.logout")}
            onPress={async () => {
              await signOut();
            }}
            iconBg="rgba(245,158,11,0.08)"
            iconColor="#F59E0B"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="trash"
            title={t("settings.deleteAccount")}
            onPress={handleDeleteAccount}
            danger
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </SectionCard>
      </ScrollView>
    </View>
  );
}
