import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/lib/useThemeColors";

export default function TermsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="flex-row items-center px-4 mb-4">
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} className="mr-3">
          <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-h3 text-text-primary font-sans-bold">
          {t("terms.title")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <Text className="text-body text-text-primary font-sans-semibold mb-3">
          {t("terms.termsTitle")}
        </Text>
        <Text className="text-body-sm text-text-secondary mb-6 leading-5">
          {t("terms.termsContent")}
        </Text>

        <Text className="text-body text-text-primary font-sans-semibold mb-3">
          {t("terms.privacyTitle")}
        </Text>
        <Text className="text-body-sm text-text-secondary mb-6 leading-5">
          {t("terms.privacyContent")}
        </Text>

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
