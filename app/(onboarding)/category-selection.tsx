import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useUserStore } from "@/store/user";

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
  const { setOnboardingComplete } = useUserStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    const next = new Set(selected);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setSelected(next);
  };

  const onContinue = () => {
    setOnboardingComplete(true);
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1 bg-bg-base">
      <View className="pt-16 px-6 pb-4">
        <Text className="text-h1 font-sans-bold text-text-primary text-center mb-2">
          What services do you offer?
        </Text>
        <Text className="text-body text-text-secondary text-center">
          Select one or more categories
        </Text>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap gap-2 pb-6">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              className={`border rounded-full px-4 py-2 ${
                selected.has(cat)
                  ? "border-primary bg-primary-ghost"
                  : "border-border bg-bg-surface"
              }`}
              onPress={() => toggleCategory(cat)}
            >
              <Text
                className={`text-body-sm font-sans-medium ${
                  selected.has(cat) ? "text-primary" : "text-text-secondary"
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-8 pt-4">
        <TouchableOpacity
          className={`rounded-lg py-4 items-center ${
            selected.size > 0 ? "bg-primary" : "bg-bg-elevated"
          }`}
          onPress={onContinue}
          disabled={selected.size === 0}
        >
          <Text
            className={`text-body-lg font-sans-semibold ${
              selected.size > 0
                ? "text-text-on-primary"
                : "text-text-disabled"
            }`}
          >
            Continue ({selected.size} selected)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
