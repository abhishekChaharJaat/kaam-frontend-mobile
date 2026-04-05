import { useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { useUserStore, UsagePreference } from "@/store/user";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

export default function UsagePreferenceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const { setUsagePreference, setOnboardingComplete } = useUserStore();
  const [selected, setSelected] = useState<UsagePreference | null>(null);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      setUsagePreference(selected);

      const token = await getToken();
      await api("/users/me", {
        method: "PATCH",
        token,
        body: { usage_preference: selected },
      });

      if (selected === "find_work") {
        router.push("/(onboarding)/category-selection");
      } else {
        setOnboardingComplete(true);
        router.replace("/(tabs)");
      }
    } catch {
      if (selected === "find_work") {
        router.push("/(onboarding)/category-selection");
      } else {
        setOnboardingComplete(true);
        router.replace("/(tabs)");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-bg-base justify-center px-6">
      <Text className="text-display font-sans-bold text-text-primary text-center mb-2">
        {t("onboarding.usagePreference")}
      </Text>
      <Text className="text-body text-text-secondary text-center mb-8">
        {t("onboarding.changeAnytime")}
      </Text>

      <TouchableOpacity
        className={`border rounded-xl p-5 mb-4 flex-row items-center ${
          selected === "find_worker"
            ? "border-primary bg-primary-ghost"
            : "border-border bg-bg-surface"
        }`}
        onPress={() => setSelected("find_worker")}
      >
        <View
          className={`rounded-full p-3 mr-4 ${
            selected === "find_worker" ? "bg-primary" : "bg-bg-elevated"
          }`}
        >
          <FontAwesome
            name="search"
            size={20}
            color={selected === "find_worker" ? "#FFFFFF" : "#64748B"}
          />
        </View>
        <View className="flex-1">
          <Text className="text-h3 font-sans-semibold text-text-primary mb-1">
            {t("onboarding.findWorkers")}
          </Text>
          <Text className="text-body-sm text-text-secondary">
            {t("onboarding.findWorkersDesc")}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className={`border rounded-xl p-5 mb-8 flex-row items-center ${
          selected === "find_work"
            ? "border-primary bg-primary-ghost"
            : "border-border bg-bg-surface"
        }`}
        onPress={() => setSelected("find_work")}
      >
        <View
          className={`rounded-full p-3 mr-4 ${
            selected === "find_work" ? "bg-primary" : "bg-bg-elevated"
          }`}
        >
          <FontAwesome
            name="briefcase"
            size={20}
            color={selected === "find_work" ? "#FFFFFF" : "#64748B"}
          />
        </View>
        <View className="flex-1">
          <Text className="text-h3 font-sans-semibold text-text-primary mb-1">
            {t("onboarding.findWork")}
          </Text>
          <Text className="text-body-sm text-text-secondary">
            {t("onboarding.findWorkDesc")}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className={`rounded-lg py-4 items-center ${
          selected && !saving ? "bg-primary" : "bg-bg-elevated"
        }`}
        onPress={onContinue}
        disabled={!selected || saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text
            className={`text-body-lg font-sans-semibold ${
              selected ? "text-text-on-primary" : "text-text-disabled"
            }`}
          >
            {t("common.continue")}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
