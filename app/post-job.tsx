import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useUserStore } from "@/store/user";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { useToast } from "@/lib/toast";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: "plumber", name: "Plumber", slug: "plumber" },
  { id: "electrician", name: "Electrician", slug: "electrician" },
  { id: "carpenter", name: "Carpenter", slug: "carpenter" },
  { id: "painter", name: "Painter", slug: "painter" },
  { id: "mason", name: "Mason / Mistri", slug: "mason" },
  { id: "labour", name: "Labour / Helper", slug: "labour" },
  { id: "ac-repair", name: "AC Repair", slug: "ac-repair" },
  { id: "ro-repair", name: "RO Repair", slug: "ro-repair" },
  { id: "cctv", name: "CCTV Technician", slug: "cctv" },
  { id: "welder", name: "Welder", slug: "welder" },
  { id: "tile-worker", name: "Tile Worker", slug: "tile-worker" },
  { id: "pop-false-ceiling", name: "POP / False Ceiling", slug: "pop-false-ceiling" },
  { id: "house-cleaning", name: "House Cleaning", slug: "house-cleaning" },
  { id: "appliance-repair", name: "Appliance Repair", slug: "appliance-repair" },
  { id: "pest-control", name: "Pest Control", slug: "pest-control" },
  { id: "furniture", name: "Furniture Work", slug: "furniture" },
  { id: "borewell", name: "Borewell / Water Tank", slug: "borewell" },
  { id: "civil-contractor", name: "Civil Contractor", slug: "civil-contractor" },
  { id: "interior", name: "Interior Work", slug: "interior" },
  { id: "packer-mover", name: "Packer / Mover Helper", slug: "packer-mover" },
];

const BUDGET_TYPES = [
  { key: "fixed", labelKey: "jobs.fixedPrice", icon: "tag" as const },
  { key: "negotiable", labelKey: "jobs.negotiable", icon: "exchange" as const },
  { key: "discuss", labelKey: "jobs.discuss", icon: "comments-o" as const },
];

const URGENCY_OPTIONS = [
  { key: "urgent", labelKey: "jobs.urgent", icon: "bolt", color: "#EF4444" },
  { key: "today", labelKey: "jobs.today", icon: "clock-o", color: "#F59E0B" },
  { key: "tomorrow", labelKey: "jobs.tomorrow", icon: "calendar-o", color: "#3B82F6" },
  { key: "this_week", labelKey: "jobs.thisWeek", icon: "calendar", color: "#8B5CF6" },
  { key: "flexible", labelKey: "jobs.flexible", icon: "check-circle", color: "#10B981" },
] as const;

const STEPS = [
  { num: 1, title: "What", subtitleKey: "jobs.whatDoYouNeed" },
  { num: 2, title: "Details", subtitleKey: "jobs.budgetTimeline" },
  { num: 3, title: "Review", subtitleKey: "jobs.confirmPost" },
];

export default function PostJob() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgetType, setBudgetType] = useState("negotiable");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [urgency, setUrgency] = useState("flexible");
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const { location } = useUserStore();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await api<Category[]>("/categories", { token });
        if (data && data.length > 0) setCategories(data);
      } catch {}
    })();
  }, [getToken]);

  const animateStep = (toStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setStep(toStep);
      Animated.parallel([
        Animated.timing(progressAnim, {
          toValue: toStep,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const canProceedStep1 = title.trim().length > 0 && categoryId.length > 0;

  const handlePost = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      await api("/jobs", {
        method: "POST",
        token,
        body: {
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          budget_type: budgetType,
          budget_min: budgetMin ? parseInt(budgetMin) : undefined,
          budget_max: budgetMax ? parseInt(budgetMax) : undefined,
          urgency,
          city: location?.city || undefined,
          locality: location?.locality || undefined,
          latitude: location?.latitude || undefined,
          longitude: location?.longitude || undefined,
        },
      });
      showToast(t("jobs.jobLiveMessage"), "success");
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("jobs.failedToPost");
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categoryId === "other"
    ? { id: "other", name: "Other", slug: "other" }
    : categories.find((c) => c.id === categoryId);
  const selectedUrgency = URGENCY_OPTIONS.find((u) => u.key === urgency);

  const formatBudget = () => {
    if (budgetType === "discuss") return t("jobs.discuss");
    if (budgetType === "negotiable" && !budgetMin && !budgetMax) return t("jobs.negotiable");
    const parts = [];
    if (budgetMin) parts.push(`₹${budgetMin}`);
    if (budgetMax) parts.push(`₹${budgetMax}`);
    return parts.join(" – ") || t("jobs.negotiable");
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [1, 3],
    outputRange: ["33%", "100%"],
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-base"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View className="pt-14 px-5 pb-4">
        <View className="flex-row items-center justify-between mb-5">
          <TouchableOpacity
            onPress={() => (step > 1 ? animateStep(step - 1) : router.back())}
            className="w-10 h-10 bg-bg-surface border border-border rounded-full items-center justify-center"
          >
            <FontAwesome name="arrow-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-body-sm text-text-tertiary font-sans-medium">
              {t("common.stepOf", { current: step, total: 3 })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <FontAwesome name="times" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View className="h-1 bg-bg-elevated rounded-full overflow-hidden">
          <Animated.View
            className="h-full bg-primary rounded-full"
            style={{ width: progressWidth }}
          />
        </View>

        {/* Step title */}
        <View className="mt-5">
          <Text className="text-h1 text-text-primary font-sans-bold">
            {t(STEPS[step - 1].subtitleKey)}
          </Text>
        </View>
      </View>

      {/* Step content */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <StepOne
              t={t}
              title={title}
              setTitle={setTitle}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              categories={categories}
            />
          )}
          {step === 2 && (
            <StepTwo
              t={t}
              description={description}
              setDescription={setDescription}
              budgetType={budgetType}
              setBudgetType={setBudgetType}
              budgetMin={budgetMin}
              setBudgetMin={setBudgetMin}
              budgetMax={budgetMax}
              setBudgetMax={setBudgetMax}
              urgency={urgency}
              setUrgency={setUrgency}
            />
          )}
          {step === 3 && (
            <StepThree
              t={t}
              title={title}
              description={description}
              selectedCategory={selectedCategory}
              formatBudget={formatBudget}
              selectedUrgency={selectedUrgency}
              location={location}
            />
          )}
          <View className="h-8" />
        </ScrollView>
      </Animated.View>

      {/* Bottom action */}
      <View className="px-5 pb-8 pt-4 border-t border-border bg-bg-base">
        {step < 3 ? (
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              (step === 1 && !canProceedStep1) ? "bg-bg-elevated" : "bg-primary"
            }`}
            onPress={() => animateStep(step + 1)}
            disabled={step === 1 && !canProceedStep1}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <Text
                className={`text-body-lg font-sans-semibold mr-2 ${
                  (step === 1 && !canProceedStep1) ? "text-text-disabled" : "text-text-on-primary"
                }`}
              >
                {t("common.continue")}
              </Text>
              <FontAwesome
                name="arrow-right"
                size={14}
                color={(step === 1 && !canProceedStep1) ? "#4B5563" : "#FFF"}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${loading ? "bg-primary/70" : "bg-primary"}`}
            onPress={handlePost}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center">
                <FontAwesome name="check" size={16} color="#FFF" />
                <Text className="text-body-lg text-text-on-primary font-sans-semibold ml-2">
                  {t("jobs.postJob")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function StepOne({
  t,
  title, setTitle, categoryId, setCategoryId, categories,
}: {
  t: (key: string) => string;
  title: string;
  setTitle: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  categories: Category[];
}) {
  return (
    <View>
      <View className="mb-6">
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-2 uppercase tracking-wider">
          {t("jobs.jobTitle")}
        </Text>
        <TextInput
          className="bg-bg-surface border border-border rounded-xl px-4 py-4 text-body-lg text-text-primary font-sans-medium"
          value={title}
          onChangeText={setTitle}
          placeholder={t("jobs.titlePlaceholder")}
          placeholderTextColor="#4B5563"
          autoFocus
        />
        {title.trim().length > 0 && (
          <View className="flex-row items-center mt-2">
            <FontAwesome name="check-circle" size={12} color="#10B981" />
            <Text className="text-caption text-success ml-1">{t("jobs.looksGood")}</Text>
          </View>
        )}
      </View>

      <View>
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-3 uppercase tracking-wider">
          {t("jobs.selectCategory")}
        </Text>
        <View className="flex-row flex-wrap">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className={`mr-2.5 mb-3 px-4 py-2.5 rounded-xl border ${
                categoryId === cat.id
                  ? "bg-primary border-primary"
                  : "bg-bg-surface border-border"
              }`}
              onPress={() => setCategoryId(cat.id)}
              activeOpacity={0.7}
            >
              <Text
                className={`text-body-sm font-sans-medium ${
                  categoryId === cat.id
                    ? "text-text-on-primary"
                    : "text-text-secondary"
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Other chip */}
          <TouchableOpacity
            className={`mr-2.5 mb-3 px-4 py-2.5 rounded-xl border ${
              categoryId === "other"
                ? "bg-primary border-primary"
                : "bg-bg-surface border-border"
            }`}
            onPress={() => setCategoryId("other")}
            activeOpacity={0.7}
          >
            <Text
              className={`text-body-sm font-sans-medium ${
                categoryId === "other" ? "text-text-on-primary" : "text-text-secondary"
              }`}
            >
              Other
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function StepTwo({
  t,
  description, setDescription,
  budgetType, setBudgetType,
  budgetMin, setBudgetMin,
  budgetMax, setBudgetMax,
  urgency, setUrgency,
}: {
  t: (key: string) => string;
  description: string;
  setDescription: (v: string) => void;
  budgetType: string;
  setBudgetType: (v: string) => void;
  budgetMin: string;
  setBudgetMin: (v: string) => void;
  budgetMax: string;
  setBudgetMax: (v: string) => void;
  urgency: string;
  setUrgency: (v: string) => void;
}) {
  return (
    <View>
      {/* Description */}
      <View className="mb-6">
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-2 uppercase tracking-wider">
          {t("jobs.descriptionOptional")}
        </Text>
        <TextInput
          className="bg-bg-surface border border-border rounded-xl px-4 py-4 text-body text-text-primary"
          value={description}
          onChangeText={setDescription}
          placeholder={t("jobs.describeWork")}
          placeholderTextColor="#4B5563"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />
      </View>

      {/* Budget */}
      <View className="mb-6">
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-3 uppercase tracking-wider">
          {t("jobs.budget")}
        </Text>
        {BUDGET_TYPES.map((bt) => (
          <TouchableOpacity
            key={bt.key}
            className={`flex-row items-center p-4 rounded-xl border mb-2.5 ${
              budgetType === bt.key
                ? "bg-primary/10 border-primary"
                : "bg-bg-surface border-border"
            }`}
            onPress={() => setBudgetType(bt.key)}
            activeOpacity={0.7}
          >
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                budgetType === bt.key ? "bg-primary" : "bg-bg-elevated"
              }`}
            >
              <FontAwesome
                name={bt.icon}
                size={16}
                color={budgetType === bt.key ? "#FFF" : "#6B7280"}
              />
            </View>
            <Text
              className={`text-body font-sans-medium flex-1 ${
                budgetType === bt.key ? "text-primary" : "text-text-primary"
              }`}
            >
              {t(bt.labelKey)}
            </Text>
            {budgetType === bt.key && (
              <FontAwesome name="check-circle" size={18} color="#059669" />
            )}
          </TouchableOpacity>
        ))}

        {budgetType !== "discuss" && (
          <View className="flex-row mt-2">
            <View className="flex-1 mr-2">
              <Text className="text-caption text-text-tertiary mb-1">{t("jobs.min")}</Text>
              <TextInput
                className="bg-bg-surface border border-border rounded-xl px-4 py-3.5 text-body text-text-primary text-center"
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="numeric"
                placeholder="200"
                placeholderTextColor="#4B5563"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-caption text-text-tertiary mb-1">{t("jobs.max")}</Text>
              <TextInput
                className="bg-bg-surface border border-border rounded-xl px-4 py-3.5 text-body text-text-primary text-center"
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="numeric"
                placeholder="800"
                placeholderTextColor="#4B5563"
              />
            </View>
          </View>
        )}
      </View>

      {/* Urgency */}
      <View>
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-3 uppercase tracking-wider">
          {t("jobs.whenNeeded")}
        </Text>
        <View className="flex-row flex-wrap">
          {URGENCY_OPTIONS.map((u) => (
            <TouchableOpacity
              key={u.key}
              className={`mr-2.5 mb-3 px-4 py-3 rounded-xl border flex-row items-center ${
                urgency === u.key
                  ? "border-primary bg-primary/10"
                  : "bg-bg-surface border-border"
              }`}
              onPress={() => setUrgency(u.key)}
              activeOpacity={0.7}
            >
              <FontAwesome
                name={u.icon}
                size={14}
                color={urgency === u.key ? "#059669" : u.color}
              />
              <Text
                className={`text-body-sm font-sans-medium ml-2 ${
                  urgency === u.key ? "text-primary" : "text-text-secondary"
                }`}
              >
                {t(u.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function StepThree({
  t,
  title, description, selectedCategory, formatBudget, selectedUrgency, location,
}: {
  t: (key: string) => string;
  title: string;
  description: string;
  selectedCategory?: Category;
  formatBudget: () => string;
  selectedUrgency?: (typeof URGENCY_OPTIONS)[number];
  location: { latitude?: number; longitude?: number; city?: string; locality?: string; state?: string } | null;
}) {
  return (
    <View>
      <Text className="text-body-sm text-text-secondary font-sans-semibold mb-4 uppercase tracking-wider">
        {t("jobs.reviewJobPost")}
      </Text>

      {/* Job card preview */}
      <View className="bg-bg-surface border border-border rounded-2xl p-5 mb-4">
        <Text className="text-h3 text-text-primary font-sans-bold mb-2">
          {title}
        </Text>
        {description ? (
          <Text className="text-body text-text-secondary mb-4" numberOfLines={3}>
            {description}
          </Text>
        ) : null}

        <View className="border-t border-border pt-4">
          <ReviewRow
            icon="th-large"
            label={t("jobs.category")}
            value={selectedCategory?.name || "—"}
          />
          <ReviewRow icon="money" label={t("jobs.budget")} value={formatBudget()} />
          <ReviewRow
            icon={selectedUrgency?.icon || "clock-o"}
            label={t("jobs.urgency")}
            value={
              selectedUrgency ? t(selectedUrgency.labelKey) : t("jobs.flexible")
            }
            valueColor={selectedUrgency?.color}
          />
          {location?.city && (
            <ReviewRow
              icon="map-marker"
              label={t("jobs.location")}
              value={
                location.locality
                  ? `${location.locality}, ${location.city}`
                  : location.city
              }
              isLast
            />
          )}
        </View>
      </View>

      <View className="bg-success-ghost rounded-xl px-4 py-3 flex-row items-center">
        <FontAwesome name="info-circle" size={14} color="#10B981" />
        <Text className="text-body-sm text-success ml-2 flex-1">
          {t("jobs.workersNotified")}
        </Text>
      </View>
    </View>
  );
}

function ReviewRow({
  icon, label, value, valueColor, isLast,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3 ${!isLast ? "border-b border-border-subtle" : ""}`}
    >
      <View className="w-8 items-center">
        <FontAwesome name={icon} size={14} color="#6B7280" />
      </View>
      <Text className="text-body-sm text-text-tertiary flex-1">{label}</Text>
      <Text
        className="text-body text-text-primary font-sans-medium"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}
