import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/lib/useThemeColors";

export default function HelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();

  const FAQs = [
    { q: t("help.q1"), a: t("help.a1") },
    { q: t("help.q2"), a: t("help.a2") },
    { q: t("help.q3"), a: t("help.a3") },
    { q: t("help.q4"), a: t("help.a4") },
  ];

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="flex-row items-center px-4 mb-4">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          className="w-[38px] h-[38px] rounded-full bg-bg-surface border border-border items-center justify-center mr-3.5 shadow-sm"
        >
          <FontAwesome name="chevron-left" size={15} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-h3 text-text-primary font-sans-bold">
          {t("help.title")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <Text className="text-body text-text-primary font-sans-semibold mb-4">
          {t("help.faq")}
        </Text>

        {FAQs.map((faq, i) => (
          <View key={i} className="bg-bg-surface border border-border rounded-xl p-4 mb-3">
            <Text className="text-body font-sans-medium text-text-primary mb-2">
              {faq.q}
            </Text>
            <Text className="text-body-sm text-text-secondary">{faq.a}</Text>
          </View>
        ))}

        <TouchableOpacity
          className="bg-bg-surface border border-border rounded-xl p-4 mt-4 flex-row items-center"
          onPress={() => Linking.openURL("mailto:support@localwork.app")}
        >
          <FontAwesome name="envelope" size={18} color="#059669" />
          <Text className="text-body text-primary font-sans-medium ml-3">
            {t("help.contactSupport")}
          </Text>
        </TouchableOpacity>

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
