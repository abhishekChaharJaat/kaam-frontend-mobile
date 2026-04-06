import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import KaamSpotLogo from "@/components/KaamSpotLogo";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/lib/useThemeColors";

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="flex-row items-center px-4 mb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-h3 text-text-primary font-sans-bold">
          {t("about.title")}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <KaamSpotLogo size="lg" />
        <View className="mt-4 mb-1" />
        <Text className="text-body-sm text-text-secondary mb-6">
          {t("about.version")}
        </Text>

        <Text className="text-body text-text-secondary text-center leading-6">
          {t("about.description")}
        </Text>

        <Text className="text-caption text-text-secondary mt-8">
          {t("about.madeIn")}
        </Text>
      </View>
    </View>
  );
}
