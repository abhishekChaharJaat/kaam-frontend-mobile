import { View, Text, TouchableOpacity, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import i18n from "@/i18n";
import { useState } from "react";

const LANG_STORAGE_KEY = "@app_language";

async function persistLang(lang: string) {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

export default function AuthLanguagePicker() {
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const toggle = async () => {
    const next = currentLang === "en" ? "hi" : "en";
    i18n.changeLanguage(next);
    setCurrentLang(next);
    await persistLang(next);
  };

  return (
    <View
      style={{
        position: "absolute",
        top: Platform.OS === "ios" ? 54 : 40,
        right: 20,
        zIndex: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Text style={{
        fontSize: 11,
        fontFamily: "DMSans_500Medium",
        color: "#9CA3AF",
      }}>
        {currentLang === "en" ? "भाषा चुनें" : "Select language"}
      </Text>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(5,150,105,0.08)",
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 20,
          gap: 5,
        }}
      >
        <FontAwesome name="globe" size={13} color="#059669" />
        <Text style={{
          fontSize: 12,
          fontFamily: "DMSans_600SemiBold",
          color: "#059669",
        }}>
          {currentLang === "en" ? "हिंदी" : "English"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
