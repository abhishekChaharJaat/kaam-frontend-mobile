import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

export default function BasicInfoScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState(
    user?.fullName || user?.firstName || ""
  );
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await user?.update({ firstName: fullName.split(" ")[0] });

      const token = await getToken();
      await api("/auth/sync-clerk-user", {
        method: "POST",
        token,
        body: { full_name: fullName.trim() },
      });
      await api("/users/me", {
        method: "PATCH",
        token,
        body: { full_name: fullName.trim() },
      });

      router.push("/(onboarding)/location-permission");
    } catch {
      router.push("/(onboarding)/location-permission");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg-base"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-display font-sans-bold text-text-primary text-center mb-2">
          {t("onboarding.whatIsYourName")}
        </Text>
        <Text className="text-body text-text-secondary text-center mb-8">
          {t("onboarding.profileVisible")}
        </Text>

        <TextInput
          className="bg-bg-surface border border-border rounded-lg px-4 py-4 text-h3 text-text-primary text-center mb-8"
          placeholder={t("onboarding.enterFullName")}
          placeholderTextColor="#94A3B8"
          value={fullName}
          onChangeText={setFullName}
          autoFocus
        />

        <TouchableOpacity
          className={`rounded-lg py-4 items-center ${
            fullName.trim() && !saving ? "bg-primary" : "bg-bg-elevated"
          }`}
          onPress={onContinue}
          disabled={!fullName.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text
              className={`text-body-lg font-sans-semibold ${
                fullName.trim() ? "text-text-on-primary" : "text-text-disabled"
              }`}
            >
              {t("common.continue")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
