import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

interface AssignedJob {
  id: string;
  title: string;
  status: string;
  posted_by_name?: string;
  city?: string;
  locality?: string;
  urgency: string;
  budget_type?: string;
  budget_min?: number;
  budget_max?: number;
  updated_at?: string;
}

const URGENCY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  urgent: { icon: "bolt", color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  today: { icon: "clock-o", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  tomorrow: { icon: "calendar-o", color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  this_week: { icon: "calendar", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
  flexible: { icon: "leaf", color: "#059669", bg: "rgba(5,150,105,0.1)" },
};

function JobCard({
  job,
  index,
  onPress,
  colors,
  isDark,
  t,
}: {
  job: AssignedJob;
  index: number;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
  t: (key: string) => string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const urgency = URGENCY_CONFIG[job.urgency] || URGENCY_CONFIG.flexible;
  const budgetLabel = (() => {
    if (job.budget_type === "discuss") return t("jobs.discuss");
    if (job.budget_min != null && job.budget_max != null) {
      if (job.budget_min === job.budget_max) return `₹${job.budget_min}`;
      return `₹${job.budget_min} - ₹${job.budget_max}`;
    }
    if (job.budget_min != null) return `₹${job.budget_min}+`;
    if (job.budget_type === "negotiable") return t("jobs.negotiable");
    if (job.budget_type === "fixed") return t("jobs.fixedPrice");
    return null;
  })();

  const location = [job.locality, job.city].filter(Boolean).join(", ");

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.bgSurface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          marginHorizontal: 20,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: urgency.bg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <FontAwesome
              name={urgency.icon as React.ComponentProps<typeof FontAwesome>["name"]}
              size={16}
              color={urgency.color}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 15,
                fontFamily: "DMSans_600SemiBold",
                color: colors.textPrimary,
                lineHeight: 20,
              }}
            >
              {job.title}
            </Text>

            {job.posted_by_name && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <FontAwesome name="user" size={11} color="#059669" />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "DMSans_500Medium",
                    color: "#059669",
                  }}
                >
                  {job.posted_by_name}
                </Text>
              </View>
            )}

            {location ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <FontAwesome name="map-marker" size={12} color={colors.textTertiary} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "DMSans_400Regular",
                    color: colors.textSecondary,
                  }}
                >
                  {location}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: job.status === "completed" ? "#F3F4F6" : "#D1FAE5",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FontAwesome
                  name={job.status === "completed" ? "flag-checkered" : "check-circle"}
                  size={11}
                  color={job.status === "completed" ? "#6B7280" : "#059669"}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "DMSans_600SemiBold",
                    color: job.status === "completed" ? "#6B7280" : "#059669",
                  }}
                >
                  {job.status === "completed" ? t("jobs.completed") : t("assignedJobs.assigned")}
                </Text>
              </View>

              {budgetLabel && (
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "DMSans_500Medium",
                    color: colors.textSecondary,
                  }}
                >
                  {budgetLabel}
                </Text>
              )}
            </View>
          </View>

          <FontAwesome name="chevron-right" size={12} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const STATUS_TABS = ["assigned", "completed"] as const;
type StatusTab = typeof STATUS_TABS[number];

export default function AssignedJobsScreen() {
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>("assigned");
  const { getToken } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const isDark = colors.bgBase === "#0A0F1A";

  const fetchJobs = useCallback(async (status: StatusTab) => {
    try {
      const token = await getToken();
      const data = await api<AssignedJob[]>(`/jobs/assigned-to-me?status=${status}`, { token });
      setJobs(data);
    } catch {
      setJobs([]);
    }
  }, [getToken]);

  useEffect(() => {
    (async () => {
      await fetchJobs(activeTab);
      setLoading(false);
    })();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs(activeTab);
    setRefreshing(false);
  }, [fetchJobs, activeTab]);


  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 56,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.bgBase,
        }}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.bgSurface,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <FontAwesome name="chevron-left" size={15} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: "DMSans_700Bold",
              color: colors.textPrimary,
            }}
          >
            {t("assignedJobs.title")}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "DMSans_400Regular",
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            {t("assignedJobs.subtitle")}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#D1FAE5",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: "DMSans_700Bold",
              color: "#059669",
            }}
          >
            {jobs.length}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => { if (activeTab !== tab) { setLoading(true); setActiveTab(tab); } }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: activeTab === tab ? "#059669" : colors.bgSurface,
              borderWidth: 1,
              borderColor: activeTab === tab ? "#059669" : colors.border,
            }}
          >
            <Text style={{
              fontSize: 13,
              fontFamily: "DMSans_600SemiBold",
              color: activeTab === tab ? "#FFFFFF" : colors.textSecondary,
            }}>
              {t(`jobs.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
        }
        renderItem={({ item, index }) => (
          <JobCard
            job={item}
            index={index}
            onPress={() => router.push(`/job/${item.id}`)}
            colors={colors}
            isDark={isDark}
            t={t}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(5,150,105,0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <FontAwesome name="briefcase" size={28} color="#059669" />
            </View>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "DMSans_600SemiBold",
                color: colors.textPrimary,
                marginBottom: 6,
              }}
            >
              {activeTab === "completed" ? t("assignedJobs.noCompletedJobs") : t("assignedJobs.noJobs")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "DMSans_400Regular",
                color: colors.textSecondary,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              {activeTab === "completed" ? t("assignedJobs.noCompletedJobsHint") : t("assignedJobs.noJobsHint")}
            </Text>
          </View>
        }
      />
      )}
    </View>
  );
}
