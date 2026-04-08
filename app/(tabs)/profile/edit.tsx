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

  const isDark = colors.bgBase === "#0A0F1A";
  const isWorker = usagePreference === "find_work";

  const WORK_RANGE_OPTIONS = [
    { label: "Under 1 km", value: 1, icon: "street-view" as const, color: "#10B981" },
    { label: "Under 2 km", value: 2, icon: "street-view" as const, color: "#059669" },
    { label: "2–5 km", value: 5, icon: "bicycle" as const, color: "#3B82F6" },
    { label: "5–10 km", value: 10, icon: "motorcycle" as const, color: "#6366F1" },
    { label: "10–20 km", value: 20, icon: "car" as const, color: "#8B5CF6" },
    { label: "20+ km", value: 50, icon: "road" as const, color: "#EC4899" },
    { label: t("settings.inMyCity"), value: 0, icon: "building-o" as const, color: "#F59E0B" },
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
          ...(isWorker && {
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

  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

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
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: Platform.OS === "ios" ? 56 : 44,
        paddingBottom: 16,
        paddingHorizontal: 20,
      }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSurface, alignItems: "center", justifyContent: "center" }}
        >
          <FontAwesome name="arrow-left" size={14} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginLeft: 14 }}>
          <Text style={{ fontSize: 15, fontFamily: "DMSans_700Bold", color: "#FFF" }}>{initials}</Text>
        </View>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
            {t("profile.editProfile")}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: colors.textTertiary, marginTop: 1 }} numberOfLines={1}>
            {user?.primaryEmailAddress?.emailAddress || ""}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <Text style={{ fontSize: 11, fontFamily: "DMSans_600SemiBold", color: colors.textTertiary, marginTop: 20, marginBottom: 14, letterSpacing: 0.8, textTransform: "uppercase" }}>
          {t("profile.basicInfo")}
        </Text>

        <PillInput
          label={t("onboarding.fullName")}
          value={fullName}
          onChangeText={setFullName}
          bg={inputBg}
          border={inputBorder}
          textColor={colors.textPrimary}
          labelColor={colors.textSecondary}
        />

        <PillInput
          label={t("profile.phone")}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("profile.phonePlaceholder")}
          placeholderColor={colors.textTertiary}
          keyboardType="phone-pad"
          bg={inputBg}
          border={inputBorder}
          textColor={colors.textPrimary}
          labelColor={colors.textSecondary}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <PillInput
              label={t("profile.city")}
              value={city}
              onChangeText={setCity}
              placeholder={t("profile.cityPlaceholder")}
              placeholderColor={colors.textTertiary}
              bg={inputBg}
              border={inputBorder}
              textColor={colors.textPrimary}
              labelColor={colors.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PillInput
              label={t("profile.locality")}
              value={locality}
              onChangeText={setLocality}
              placeholder={t("profile.localityPlaceholder")}
              placeholderColor={colors.textTertiary}
              bg={inputBg}
              border={inputBorder}
              textColor={colors.textPrimary}
              labelColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Service Profile — workers only */}
        {isWorker && (
          <>
            <Text style={{ fontSize: 11, fontFamily: "DMSans_600SemiBold", color: colors.textTertiary, marginTop: 28, marginBottom: 14, letterSpacing: 0.8, textTransform: "uppercase" }}>
              {t("profile.serviceProfile")}
            </Text>

            <PillInput
              label={t("profile.workTitle")}
              value={headline}
              onChangeText={setHeadline}
              placeholder={t("profile.workTitlePlaceholder")}
              placeholderColor={colors.textTertiary}
              bg={inputBg}
              border={inputBorder}
              textColor={colors.textPrimary}
              labelColor={colors.textSecondary}
            />

            <PillInput
              label={t("profile.aboutMe")}
              value={bio}
              onChangeText={setBio}
              placeholder={t("profile.aboutMePlaceholder")}
              placeholderColor={colors.textTertiary}
              multiline
              bg={inputBg}
              border={inputBorder}
              textColor={colors.textPrimary}
              labelColor={colors.textSecondary}
            />

            {/* Work Range — pill style */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: colors.textSecondary, marginBottom: 6, marginLeft: 4 }}>
                {t("settings.workRange")}
              </Text>
              <TouchableOpacity
                onPress={() => setWorkRangeVisible(true)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: inputBorder,
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                }}
              >
                <FontAwesome name="road" size={14} color="#8B5CF6" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, fontFamily: "DMSans_500Medium", color: colors.textPrimary }}>
                  {workRangeLabel}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Available for work — pill style */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: colors.textSecondary, marginBottom: 6, marginLeft: 4 }}>
                {t("profile.availableForWork")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: inputBg,
                  borderWidth: 1.5,
                  borderColor: inputBorder,
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  paddingVertical: 11,
                }}
              >
                <FontAwesome name="check-circle" size={14} color={isAvailable ? "#10B981" : colors.textTertiary} style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, fontFamily: "DMSans_500Medium", color: colors.textPrimary }}>
                  {isAvailable ? t("profile.availableForWork") : "Not available"}
                </Text>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ false: isDark ? "#374151" : "#E2E8F0", true: "#059669" }}
                  thumbColor="#FFF"
                />
              </View>
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={saving || !fullName.trim()}
          activeOpacity={0.8}
          style={{
            backgroundColor: saving || !fullName.trim() ? colors.textTertiary : "#059669",
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            marginTop: 24,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <FontAwesome name="check" size={16} color="#FFF" />
          )}
          <Text style={{ fontSize: 16, fontFamily: "DMSans_600SemiBold", color: "#FFF" }}>
            {saving ? t("profile.saving") : t("profile.saveChanges")}
          </Text>
        </TouchableOpacity>
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
                  paddingHorizontal: 20,
                  paddingVertical: 13,
                  borderBottomWidth: i < WORK_RANGE_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  backgroundColor: isSelected ? (isDark ? "rgba(5,150,105,0.1)" : "rgba(5,150,105,0.05)") : "transparent",
                }}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isSelected ? `${opt.color}20` : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}>
                  <FontAwesome name={opt.icon} size={14} color={isSelected ? opt.color : colors.textTertiary} />
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: 15,
                  fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                  color: isSelected ? "#059669" : colors.textPrimary,
                }}>
                  {opt.label}
                </Text>
                {isSelected && <FontAwesome name="check-circle" size={16} color="#059669" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function PillInput({
  label, value, onChangeText, placeholder, placeholderColor, keyboardType, multiline,
  bg, border, textColor, labelColor,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  placeholderColor?: string;
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
  multiline?: boolean;
  bg: string;
  border: string;
  textColor: string;
  labelColor: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: labelColor, marginBottom: 6, marginLeft: 4 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: border,
          borderRadius: multiline ? 20 : 999,
          paddingHorizontal: 18,
          paddingVertical: multiline ? 14 : 13,
          fontSize: 15,
          fontFamily: "DMSans_400Regular",
          color: textColor,
          ...(multiline ? { minHeight: 90 } : {}),
        }}
      />
    </View>
  );
}
