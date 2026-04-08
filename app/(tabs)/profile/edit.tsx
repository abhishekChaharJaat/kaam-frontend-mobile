import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/lib/useThemeColors";
import { useUserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  locality?: string;
  usage_preference?: string;
  work_title?: string;
  bio?: string;
  work_range_km?: number;
}

function FormField({
  label,
  icon,
  children,
  labelColor,
}: {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  children: React.ReactNode;
  labelColor?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
          gap: 7,
        }}
      >
        <FontAwesome name={icon} size={13} color="#059669" />
        <Text
          style={{
            fontSize: 13,
            fontFamily: "DMSans_600SemiBold",
            color: labelColor || "#6B7280",
          }}
        >
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const { location, usagePreference } = useUserStore();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(location?.city || "");
  const [locality, setLocality] = useState(location?.locality || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [workRange, setWorkRange] = useState<number | null>(null);
  const [workRangeVisible, setWorkRangeVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const WORK_RANGE_OPTIONS = [
    { label: "Under 1 km", value: 1 },
    { label: "Under 2 km", value: 2 },
    { label: "2–5 km", value: 5 },
    { label: "5–10 km", value: 10 },
    { label: "10–20 km", value: 20 },
    { label: "20+ km", value: 50 },
    { label: t("settings.inMyCity"), value: 0 },
  ];

  const workRangeLabel = WORK_RANGE_OPTIONS.find((o) => o.value === workRange)?.label || t("settings.notSet");

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const me = await api<UserProfile>("/auth/me", { token });
        setFullName(me.full_name || "");
        setPhone(me.phone || "");
        setCity(me.city || location?.city || "");
        setLocality(me.locality || location?.locality || "");
        setHeadline(me.work_title || "");
        setBio(me.bio || "");
        if (me.work_range_km != null) setWorkRange(me.work_range_km);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const onSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      await api("/users/me", {
        method: "PATCH",
        token,
        body: {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          locality: locality.trim() || null,
          ...(usagePreference === "find_work" && {
            work_title: headline.trim() || null,
            bio: bio.trim() || null,
            ...(workRange != null && { work_range_km: workRange }),
          }),
        },
      });
      showToast(t("profile.saved"), "success");
      (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    (user?.firstName?.[0] || "").toUpperCase() +
    (user?.lastName?.[0] || "").toUpperCase() || "U";

  const isDark = colors.bgBase === "#0A0F1A";

  const inputStyle = {
    backgroundColor: colors.bgBase,
    borderWidth: 1.5,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: colors.textPrimary,
  };

  const focusBorderColor = "#059669";

  if (loading) {
    return (
      <View className="flex-1 bg-bg-base items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg-base"
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: Platform.OS === "ios" ? 56 : 44,
          paddingBottom: 16,
          paddingHorizontal: 20,
          backgroundColor: colors.bgBase,
        }}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.bgSurface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          }}
        >
          <FontAwesome name="arrow-left" size={14} color={colors.textPrimary} />
        </TouchableOpacity>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#059669",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 14,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontFamily: "DMSans_700Bold",
              color: "#FFF",
            }}
          >
            {initials}
          </Text>
        </View>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "DMSans_700Bold",
              color: colors.textPrimary,
            }}
          >
            {t("profile.editProfile")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "DMSans_400Regular",
              color: colors.textTertiary,
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {user?.primaryEmailAddress?.emailAddress || ""}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info Section */}
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "DMSans_600SemiBold",
              color: colors.textTertiary,
              marginBottom: 14,
              letterSpacing: 0.8,
            }}
          >
            {t("profile.basicInfo")}
          </Text>

          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: 20,
              padding: 20,
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
            <FormField label={t("onboarding.fullName")} icon="user" labelColor={colors.textSecondary}>
              <TextInput
                style={inputStyle}
                value={fullName}
                onChangeText={setFullName}
                onFocus={(e) => {
                  e.target.setNativeProps({
                    style: { borderColor: focusBorderColor },
                  });
                }}
                onBlur={(e) => {
                  e.target.setNativeProps({
                    style: {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                    },
                  });
                }}
              />
            </FormField>

            <FormField label={t("profile.phone")} icon="phone" labelColor={colors.textSecondary}>
              <TextInput
                style={inputStyle}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={t("profile.phonePlaceholder")}
                placeholderTextColor={colors.textTertiary}
                onFocus={(e) => {
                  e.target.setNativeProps({
                    style: { borderColor: focusBorderColor },
                  });
                }}
                onBlur={(e) => {
                  e.target.setNativeProps({
                    style: {
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                    },
                  });
                }}
              />
            </FormField>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormField label={t("profile.city")} icon="map-marker" labelColor={colors.textSecondary}>
                  <TextInput
                    style={inputStyle}
                    value={city}
                    onChangeText={setCity}
                    placeholder={t("profile.cityPlaceholder")}
                    placeholderTextColor={colors.textTertiary}
                  />
                </FormField>
              </View>
              <View style={{ flex: 1 }}>
                <FormField label={t("profile.locality")} icon="map-pin" labelColor={colors.textSecondary}>
                  <TextInput
                    style={inputStyle}
                    value={locality}
                    onChangeText={setLocality}
                    placeholder={t("profile.localityPlaceholder")}
                    placeholderTextColor={colors.textTertiary}
                  />
                </FormField>
              </View>
            </View>
          </View>
        </View>

        {/* Service Profile Section — only for workers */}
        {usagePreference === "find_work" && (
          <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans_600SemiBold",
                color: colors.textTertiary,
                marginBottom: 14,
                letterSpacing: 0.8,
              }}
            >
              {t("profile.serviceProfile")}
            </Text>

            <View
              style={{
                backgroundColor: colors.bgSurface,
                borderRadius: 20,
                padding: 20,
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
              <FormField label={t("profile.workTitle")} icon="briefcase" labelColor={colors.textSecondary}>
                <TextInput
                  style={inputStyle}
                  value={headline}
                  onChangeText={setHeadline}
                  placeholder={t("profile.workTitlePlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                />
              </FormField>

              <FormField label={t("profile.aboutMe")} icon="align-left" labelColor={colors.textSecondary}>
                <TextInput
                  style={[inputStyle, { minHeight: 100, textAlignVertical: "top" }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder={t("profile.aboutMePlaceholder")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </FormField>

              {/* Work Range */}
              <TouchableOpacity
                onPress={() => setWorkRangeVisible(true)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.bgBase,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 14,
                  borderWidth: 1.5,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <FontAwesome name="road" size={16} color="#8B5CF6" />
                  <Text style={{ fontSize: 15, fontFamily: "DMSans_500Medium", color: colors.textPrimary }}>
                    {t("settings.workRange")}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 14, fontFamily: "DMSans_400Regular", color: colors.textTertiary }}>
                    {workRangeLabel}
                  </Text>
                  <FontAwesome name="chevron-right" size={11} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: colors.bgBase,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 1.5,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <FontAwesome
                    name="check-circle"
                    size={16}
                    color={isAvailable ? "#059669" : colors.textTertiary}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "DMSans_500Medium",
                      color: colors.textPrimary,
                    }}
                  >
                    {t("profile.availableForWork")}
                  </Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{
                    false: isDark ? "#374151" : "#E2E8F0",
                    true: "#059669",
                  }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <TouchableOpacity
            onPress={onSave}
            disabled={saving || !fullName.trim()}
            activeOpacity={0.8}
            style={{
              backgroundColor:
                saving || !fullName.trim() ? colors.textTertiary : "#059669",
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: saving || !fullName.trim() ? 0 : 0.3,
              shadowRadius: 12,
              elevation: saving || !fullName.trim() ? 0 : 8,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <FontAwesome name="check" size={16} color="#FFF" />
            )}
            <Text
              style={{
                fontSize: 16,
                fontFamily: "DMSans_600SemiBold",
                color: "#FFF",
              }}
            >
              {saving ? t("profile.saving") : t("profile.saveChanges")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Work Range Picker Modal */}
      <Modal
        visible={workRangeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkRangeVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setWorkRangeVisible(false)}
        />
        <View style={{
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 32,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}>
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }} />
          </View>
          <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: colors.textPrimary, paddingHorizontal: 20, paddingVertical: 14 }}>
            {t("settings.workRange")}
          </Text>
          {WORK_RANGE_OPTIONS.map((opt, i) => {
            const isSelected = workRange === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { setWorkRange(opt.value); setWorkRangeVisible(false); }}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: i < WORK_RANGE_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                }}
              >
                <Text style={{
                  fontSize: 15,
                  fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                  color: isSelected ? "#059669" : colors.textPrimary,
                }}>
                  {opt.label}
                </Text>
                {isSelected && <FontAwesome name="check" size={14} color="#059669" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
