import { useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { getCurrentLocation } from "@/lib/location";
import { useUserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

export default function LocationPermissionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const { setLocation } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);

  const onAllowLocation = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city,
          locality: loc.locality,
          state: loc.state,
        });

        setDetected(
          loc.locality
            ? `${loc.locality}, ${loc.city || ""}`
            : loc.city || t("onboarding.locationDetected")
        );

        const token = await getToken();
        await api("/users/me", {
          method: "PATCH",
          token,
          body: {
            city: loc.city || null,
            locality: loc.locality || null,
            state: loc.state || null,
            location: {
              type: "Point",
              coordinates: [loc.longitude, loc.latitude],
            },
          },
        });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const onContinue = () => {
    router.push("/(onboarding)/usage-preference");
  };

  return (
    <View className="flex-1 bg-bg-base justify-center px-6">
      <View className="items-center mb-8">
        <View className="bg-primary-ghost rounded-full p-6 mb-6">
          <FontAwesome name="map-marker" size={48} color="#059669" />
        </View>
        <Text className="text-h1 font-sans-bold text-text-primary text-center mb-2">
          {t("onboarding.enableLocation")}
        </Text>
        <Text className="text-body text-text-secondary text-center">
          {t("onboarding.locationDesc")}
        </Text>
      </View>

      {detected && (
        <View className="bg-success-ghost rounded-xl px-4 py-3 mb-4 flex-row items-center justify-center">
          <FontAwesome name="check-circle" size={16} color="#10B981" />
          <Text className="text-body text-success font-sans-medium ml-2">
            {detected}
          </Text>
        </View>
      )}

      {!detected ? (
        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center mb-3"
          onPress={onAllowLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text className="text-text-on-primary text-body-lg font-sans-semibold">
              {t("onboarding.allowLocationAccess")}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center mb-3"
          onPress={onContinue}
        >
          <Text className="text-text-on-primary text-body-lg font-sans-semibold">
            {t("common.continue")}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity className="items-center py-3" onPress={onContinue}>
        <Text className="text-text-tertiary text-body font-sans-medium">
          {detected ? "" : t("onboarding.setManuallyLater")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
