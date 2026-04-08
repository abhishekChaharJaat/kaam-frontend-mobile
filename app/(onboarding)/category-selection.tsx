import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
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

const WORK_RANGE_OPTIONS = [
  { label: "Under 1 km", value: 1 },
  { label: "Under 2 km", value: 2 },
  { label: "2–5 km", value: 5 },
  { label: "5–10 km", value: 10 },
  { label: "10–20 km", value: 20 },
  { label: "20+ km", value: 50 },
  { label: "In my city", value: 0 },
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
  const [workRange, setWorkRange] = useState<number | null>(null);
  const [rangeDropdownVisible, setRangeDropdownVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill if user already has work_title or work_range_km saved
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const me = await api<{ work_title?: string; work_range_km?: number }>("/auth/me", { token });
        if (me.work_title) {
          const parts = me.work_title.split(" | ");
          const known = new Set(CATEGORIES);
          const matched = new Set<string>();
          for (const p of parts) {
            if (known.has(p)) matched.add(p);
            else { setOtherSelected(true); setOtherText(p); }
          }
          if (matched.size > 0) setSelected(matched);
        }
        if (me.work_range_km != null) setWorkRange(me.work_range_km);
      } catch {}
    })();
  }, []);

  const toggleCategory = (cat: string) => {
    const next = new Set(selected);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setSelected(next);
  };

  const totalSelected = selected.size + (otherSelected && otherText.trim() ? 1 : 0);

  const onContinue = async () => {
    if (totalSelected === 0 && workRange === null) return;
    setSaving(true);
    try {
      const token = await getToken();
      const body: Record<string, unknown> = {};
      if (totalSelected > 0) {
        const parts = Array.from(selected);
        if (otherSelected && otherText.trim()) parts.push(otherText.trim());
        body.work_title = parts.join(" | ");
      }
      if (workRange !== null) {
        body.work_range_km = workRange;
      }
      await api("/users/me", {
        method: "PATCH",
        token,
        body,
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

        {/* Work range dropdown */}
        <View style={{ marginTop: 28 }}>
          <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: colors.textPrimary, marginBottom: 4 }}>
            {t("onboarding.workRange")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.textSecondary, marginBottom: 14 }}>
            {t("onboarding.workRangeDesc")}
          </Text>
          <TouchableOpacity
            onPress={() => setRangeDropdownVisible(true)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.bgSurface,
              borderWidth: 1.5,
              borderColor: workRange !== null ? "#059669" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{
              fontSize: 15,
              fontFamily: workRange !== null ? "DMSans_600SemiBold" : "DMSans_400Regular",
              color: workRange !== null ? "#059669" : colors.textTertiary,
            }}>
              {workRange !== null
                ? WORK_RANGE_OPTIONS.find((o) => o.value === workRange)?.label
                : t("onboarding.selectRange")}
            </Text>
            <FontAwesome name="chevron-down" size={12} color={workRange !== null ? "#059669" : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}>
        <TouchableOpacity
          onPress={onContinue}
          disabled={totalSelected === 0 || workRange === null || saving}
          activeOpacity={0.8}
          style={{
            backgroundColor: totalSelected > 0 && workRange !== null ? "#059669" : isDark ? "#1F2937" : "#E5E7EB",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: "#059669",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: totalSelected > 0 && workRange !== null ? 0.3 : 0,
            shadowRadius: 12,
            elevation: totalSelected > 0 && workRange !== null ? 6 : 0,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : null}
          <Text style={{
            fontSize: 16,
            fontFamily: "DMSans_600SemiBold",
            color: totalSelected > 0 && workRange !== null ? "#FFF" : colors.textTertiary,
          }}>
            {t("onboarding.finishSetup")} {totalSelected > 0 ? `(${totalSelected})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Range Dropdown Modal */}
      <Modal
        visible={rangeDropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRangeDropdownVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setRangeDropdownVisible(false)}
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
            {t("onboarding.workRange")}
          </Text>
          {WORK_RANGE_OPTIONS.map((opt, i) => {
            const isActive = workRange === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { setWorkRange(opt.value); setRangeDropdownVisible(false); }}
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
                  fontFamily: isActive ? "DMSans_600SemiBold" : "DMSans_400Regular",
                  color: isActive ? "#059669" : colors.textPrimary,
                }}>
                  {opt.label}
                </Text>
                {isActive && <FontAwesome name="check" size={14} color="#059669" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}
