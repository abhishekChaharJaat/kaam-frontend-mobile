import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { useToast } from "@/lib/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChangePasswordScreen() {
  const { user } = useUser();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const isDark = colors.bgBase === "#0A0F1A";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      showToast(t("profile.passwordTooShort"), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t("profile.passwordMismatch"), "error");
      return;
    }

    setSaving(true);
    try {
      await user?.updatePassword({
        currentPassword,
        newPassword,
      });
      showToast(t("profile.passwordChanged"), "success");
      router.back();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("common.error");
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: colors.textPrimary,
    paddingVertical: 0,
  };

  const fieldContainer = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    height: 50,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: Platform.OS === "ios" ? insets.top + 10 : 44,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: colors.bgBase,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.bgSurface,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        >
          <FontAwesome name="chevron-left" size={15} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textPrimary,
            marginLeft: 14,
          }}
        >
          {t("profile.changePassword")}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 16 }}>
        {/* Current Password */}
        <View>
          <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: colors.textSecondary, marginBottom: 8 }}>
            {t("profile.currentPassword")}
          </Text>
          <View style={fieldContainer}>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              placeholder="********"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              <FontAwesome name={showCurrent ? "eye-slash" : "eye"} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View>
          <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: colors.textSecondary, marginBottom: 8 }}>
            {t("profile.newPassword")}
          </Text>
          <View style={fieldContainer}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              placeholder="********"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <FontAwesome name={showNew ? "eye-slash" : "eye"} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm New Password */}
        <View>
          <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: colors.textSecondary, marginBottom: 8 }}>
            {t("profile.confirmNewPassword")}
          </Text>
          <View style={fieldContainer}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="********"
              placeholderTextColor={colors.textTertiary}
              style={inputStyle}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <FontAwesome name={showConfirm ? "eye-slash" : "eye"} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#059669",
            borderRadius: 14,
            paddingVertical: 15,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
            opacity: saving || !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FontAwesome name="check" size={16} color="#FFFFFF" />
          )}
          <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#FFFFFF" }}>
            {t("profile.changePassword")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
