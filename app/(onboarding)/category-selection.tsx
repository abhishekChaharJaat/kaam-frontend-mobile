import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "@/store/user";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

const CATEGORIES = [
  "Plumber",
  "Electrician",
  "Carpenter",
  "Painter",
  "Mason / Mistri",
  "Labour / Helper",
  "AC Repair",
  "RO Repair",
  "CCTV Technician",
  "Welder",
  "Tile Worker",
  "POP / False Ceiling",
  "House Cleaning",
  "Appliance Repair",
  "Pest Control",
  "Furniture Work",
  "Borewell / Water Tank",
  "Civil Contractor",
  "Interior Work",
  "Packer / Mover Helper",
];

export default function CategorySelectionScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { setOnboardingComplete, setOnboardingStep } = useUserStore();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const isDark = colors.bgBase === "#0A0F1A";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: string) => {
    const next = new Set(selected);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setSelected(next);
  };

  const totalSelected = selected.size + (otherSelected && otherText.trim() ? 1 : 0);

  const onContinue = async () => {
    if (totalSelected === 0) return;
    setSaving(true);
    try {
      const token = await getToken();
      const parts = Array.from(selected);
      if (otherSelected && otherText.trim()) parts.push(otherText.trim());
      const workTitle = parts.join(" | ");
      await api("/users/me", {
        method: "PATCH",
        token,
        body: { work_title: workTitle },
      });
      setOnboardingComplete(true);
      setOnboardingStep(null);
      router.replace("/(tabs)");
    } catch {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontFamily: "DMSans_700Bold", color: colors.textPrimary, textAlign: "center", marginBottom: 8 }}>
          {t("onboarding.selectCategories")}
        </Text>
        <Text style={{ fontSize: 15, fontFamily: "DMSans_400Regular", color: colors.textSecondary, textAlign: "center" }}>
          Select one or more
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected.has(cat);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.7}
                style={{
                  borderWidth: 1.5,
                  borderColor: isSelected ? "#059669" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                  borderRadius: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  backgroundColor: isSelected
                    ? isDark ? "rgba(5,150,105,0.15)" : "rgba(5,150,105,0.08)"
                    : colors.bgSurface,
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                  color: isSelected ? "#059669" : colors.textSecondary,
                }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Other option */}
          <TouchableOpacity
            onPress={() => setOtherSelected(!otherSelected)}
            activeOpacity={0.7}
            style={{
              borderWidth: 1.5,
              borderColor: otherSelected ? "#059669" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: otherSelected
                ? isDark ? "rgba(5,150,105,0.15)" : "rgba(5,150,105,0.08)"
                : colors.bgSurface,
            }}
          >
            <Text style={{
              fontSize: 14,
              fontFamily: otherSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
              color: otherSelected ? "#059669" : colors.textSecondary,
            }}>
              Other
            </Text>
          </TouchableOpacity>
        </View>

        {/* Other text input */}
        {otherSelected && (
          <View style={{ marginTop: 16 }}>
            <TextInput
              value={otherText}
              onChangeText={setOtherText}
              placeholder="e.g. Driving, Security Guard..."
              placeholderTextColor={colors.textTertiary}
              autoFocus
              style={{
                backgroundColor: colors.bgSurface,
                borderWidth: 1.5,
                borderColor: otherText.trim() ? "#059669" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                fontFamily: "DMSans_400Regular",
                color: colors.textPrimary,
              }}
            />
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}>
        <TouchableOpacity
          onPress={onContinue}
          disabled={totalSelected === 0 || saving}
          activeOpacity={0.8}
          style={{
            backgroundColor: totalSelected > 0 ? "#059669" : isDark ? "#1F2937" : "#E5E7EB",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: "#059669",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: totalSelected > 0 ? 0.3 : 0,
            shadowRadius: 12,
            elevation: totalSelected > 0 ? 6 : 0,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : null}
          <Text style={{
            fontSize: 16,
            fontFamily: "DMSans_600SemiBold",
            color: totalSelected > 0 ? "#FFF" : colors.textTertiary,
          }}>
            {t("onboarding.finishSetup")} {totalSelected > 0 ? `(${totalSelected})` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
