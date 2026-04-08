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
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useUserStore } from "@/store/user";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { useToast } from "@/lib/toast";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

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
  const [requiredDate, setRequiredDate] = useState<Date | null>(null);
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
          required_date: requiredDate
            ? requiredDate.toISOString().split("T")[0]
            : undefined,
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
            onPress={() => (step > 1 ? animateStep(step - 1) : (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
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
              requiredDate={requiredDate}
              setRequiredDate={setRequiredDate}
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
              requiredDate={requiredDate}
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
            className="rounded-full py-4 items-center"
            style={{
              backgroundColor: (step === 1 && !canProceedStep1) ? "#D1D5DB" : "#059669",
            }}
            onPress={() => animateStep(step + 1)}
            disabled={step === 1 && !canProceedStep1}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <Text
                className="text-body-lg font-sans-semibold mr-2"
                style={{ color: (step === 1 && !canProceedStep1) ? "#6B7280" : "#FFF" }}
              >
                {t("common.continue")}
              </Text>
              <FontAwesome
                name="arrow-right"
                size={14}
                color={(step === 1 && !canProceedStep1) ? "#6B7280" : "#FFF"}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`rounded-full py-4 items-center ${loading ? "bg-primary/70" : "bg-primary"}`}
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
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const colors = useThemeColors();

  const selectedCategory = categoryId === "other"
    ? { id: "other", name: "Other", slug: "other" }
    : categories.find((c) => c.id === categoryId);

  const filteredCategories = searchQuery.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : categories;

  const openModal = () => {
    setSearchQuery("");
    setModalVisible(true);
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setModalVisible(false);
    setSearchQuery("");
  };

  return (
    <View>
      <View className="mb-6">
        <View className="flex-row items-center mb-2">
          <Text className="text-body-sm text-text-secondary font-sans-semibold uppercase tracking-wider">
            {t("jobs.jobTitle")}
          </Text>
          <Text className="text-body-sm font-sans-semibold ml-0.5" style={{ color: "#EF4444" }}> *</Text>
        </View>
        <TextInput
          className="bg-bg-surface border border-border rounded-full px-5 py-4 text-body-lg text-text-primary font-sans-medium"
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
        <View className="flex-row items-center mb-3">
          <Text className="text-body-sm text-text-secondary font-sans-semibold uppercase tracking-wider">
            {t("jobs.selectCategory")}
          </Text>
          <Text className="text-body-sm font-sans-semibold ml-0.5" style={{ color: "#EF4444" }}> *</Text>
        </View>

        {/* Dropdown trigger */}
        <TouchableOpacity
          onPress={openModal}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.bgSurface,
            borderWidth: 1.5,
            borderColor: selectedCategory ? "#059669" : colors.border,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <FontAwesome
            name="th-large"
            size={15}
            color={selectedCategory ? "#059669" : "#6B7280"}
            style={{ marginRight: 10 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontFamily: selectedCategory ? "DMSans_600SemiBold" : "DMSans_400Regular",
              color: selectedCategory ? colors.textPrimary : "#6B7280",
            }}
          >
            {selectedCategory ? selectedCategory.name : t("jobs.selectCategory")}
          </Text>
          <FontAwesome name="chevron-down" size={13} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Category picker modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: colors.bgBase,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
                {t("jobs.selectCategory")}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.bgSurface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}>
                <FontAwesome name="search" size={14} color="#6B7280" style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search category..."
                  placeholderTextColor="#6B7280"
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontFamily: "DMSans_400Regular",
                    color: colors.textPrimary,
                    padding: 0,
                  }}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <FontAwesome name="times-circle" size={15} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category list */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredCategories.length === 0 && searchQuery.trim() !== "" && (
                <Text style={{ color: "#6B7280", fontFamily: "DMSans_400Regular", textAlign: "center", paddingVertical: 20 }}>
                  No matching category
                </Text>
              )}
              {filteredCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => selectCategory(cat.id)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 4,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{
                      flex: 1,
                      fontSize: 15,
                      fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                      color: isSelected ? "#059669" : colors.textPrimary,
                    }}>
                      {cat.name}
                    </Text>
                    {isSelected && <FontAwesome name="check" size={14} color="#059669" />}
                  </TouchableOpacity>
                );
              })}

              {/* Other — always at bottom */}
              {(() => {
                const isSelected = categoryId === "other";
                return (
                  <TouchableOpacity
                    onPress={() => selectCategory("other")}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{
                      flex: 1,
                      fontSize: 15,
                      fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                      color: isSelected ? "#059669" : colors.textPrimary,
                    }}>
                      Other
                    </Text>
                    {isSelected && <FontAwesome name="check" size={14} color="#059669" />}
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StepTwo({
  t,
  description, setDescription,
  budgetType, setBudgetType,
  budgetMin, setBudgetMin,
  budgetMax, setBudgetMax,
  urgency, setUrgency,
  requiredDate, setRequiredDate,
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
  requiredDate: Date | null;
  setRequiredDate: (d: Date | null) => void;
}) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const colors = useThemeColors();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const handleUrgencySelect = (key: string) => {
    setUrgency(key);
    if (key === "today") {
      setRequiredDate(new Date(today));
    } else if (key === "tomorrow") {
      setRequiredDate(new Date(tomorrow));
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: requiredDate || today,
        mode: "date",
        minimumDate: today,
        onChange: (event, date) => {
          if (event.type === "set" && date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            setRequiredDate(d);
            if (d.getTime() === today.getTime()) setUrgency("today");
            else if (d.getTime() === tomorrow.getTime()) setUrgency("tomorrow");
            else setUrgency("flexible");
          }
        },
      });
    } else {
      setShowIOSPicker(true);
    }
  };

  return (
    <View>
      {/* Description */}
      <View className="mb-6">
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-2 uppercase tracking-wider">
          {t("jobs.descriptionOptional")}
        </Text>
        <TextInput
          className="bg-bg-surface border border-border rounded-3xl px-5 py-4 text-body text-text-primary"
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
            className={`flex-row items-center px-3 py-2.5 rounded-xl border mb-2 ${
              budgetType === bt.key
                ? "bg-primary/10 border-primary"
                : "bg-bg-surface border-border"
            }`}
            onPress={() => setBudgetType(bt.key)}
            activeOpacity={0.7}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
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
              className={`text-body-sm font-sans-medium flex-1 ${
                budgetType === bt.key ? "text-primary" : "text-text-primary"
              }`}
            >
              {t(bt.labelKey)}
            </Text>
            {budgetType === bt.key && (
              <FontAwesome name="check-circle" size={15} color="#059669" />
            )}
          </TouchableOpacity>
        ))}

        {budgetType !== "discuss" && (
          <View className="flex-row mt-2">
            <View className="flex-1 mr-2">
              <Text className="text-caption text-text-tertiary mb-1">{t("jobs.min")}</Text>
              <TextInput
                className="bg-bg-surface border border-border rounded-full px-4 py-3.5 text-body text-text-primary text-center"
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
                className="bg-bg-surface border border-border rounded-full px-4 py-3.5 text-body text-text-primary text-center"
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

      {/* When needed */}
      <View className="mb-2">
        <Text className="text-body-sm text-text-secondary font-sans-semibold mb-3 uppercase tracking-wider">
          {t("jobs.whenNeeded")}
        </Text>

        {/* Quick-select chips */}
        <View className="flex-row flex-wrap mb-3">
          {URGENCY_OPTIONS.map((u) => (
            <TouchableOpacity
              key={u.key}
              className={`mr-2.5 mb-3 px-4 py-3 rounded-full border flex-row items-center ${
                urgency === u.key
                  ? "border-primary bg-primary/10"
                  : "bg-bg-surface border-border"
              }`}
              onPress={() => handleUrgencySelect(u.key)}
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

        {/* Selected date display / pick date button */}
        <TouchableOpacity
          onPress={openDatePicker}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.bgSurface,
            borderWidth: 1.5,
            borderColor: requiredDate ? "#059669" : colors.border,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 13,
          }}
        >
          <FontAwesome
            name="calendar"
            size={15}
            color={requiredDate ? "#059669" : "#6B7280"}
            style={{ marginRight: 10 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontFamily: requiredDate ? "DMSans_600SemiBold" : "DMSans_400Regular",
              color: requiredDate ? colors.textPrimary : "#6B7280",
            }}
          >
            {requiredDate ? formatDate(requiredDate) : "Pick a date (optional)"}
          </Text>
          {requiredDate ? (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); setRequiredDate(null); setUrgency("flexible"); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome name="times-circle" size={16} color="#6B7280" />
            </TouchableOpacity>
          ) : (
            <FontAwesome name="chevron-right" size={13} color="#6B7280" />
          )}
        </TouchableOpacity>
      </View>

      {/* iOS date picker modal */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showIOSPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIOSPicker(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
            activeOpacity={1}
            onPress={() => setShowIOSPicker(false)}
          />
          <View style={{ backgroundColor: colors.bgBase, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <TouchableOpacity onPress={() => setShowIOSPicker(false)}>
                <Text style={{ fontSize: 16, fontFamily: "DMSans_400Regular", color: "#6B7280" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowIOSPicker(false)}>
                <Text style={{ fontSize: 16, fontFamily: "DMSans_600SemiBold", color: "#059669" }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={requiredDate || today}
              mode="date"
              display="spinner"
              minimumDate={today}
              onChange={(_, date) => {
                if (date) {
                  const d = new Date(date);
                  d.setHours(0, 0, 0, 0);
                  setRequiredDate(d);
                  if (d.getTime() === today.getTime()) setUrgency("today");
                  else if (d.getTime() === tomorrow.getTime()) setUrgency("tomorrow");
                  else setUrgency("flexible");
                }
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

function StepThree({
  t,
  title, description, selectedCategory, formatBudget, selectedUrgency, requiredDate, location,
}: {
  t: (key: string) => string;
  title: string;
  description: string;
  selectedCategory?: Category;
  formatBudget: () => string;
  selectedUrgency?: (typeof URGENCY_OPTIONS)[number];
  requiredDate: Date | null;
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
            icon="calendar"
            label={t("jobs.whenNeeded")}
            value={requiredDate ? formatDate(requiredDate) : (selectedUrgency ? t(selectedUrgency.labelKey) : t("jobs.flexible"))}
            valueColor={requiredDate ? "#059669" : selectedUrgency?.color}
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
