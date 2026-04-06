import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  TextInput,
} from "react-native";

import { useRouter, useFocusEffect } from "expo-router";
import { setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import KaamSpotLogo from "@/components/KaamSpotLogo";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useUserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/lib/useThemeColors";

interface Job {
  id: string;
  title: string;
  city?: string;
  locality?: string;
  urgency: string;
  budget_type?: string;
  budget_min?: number;
  budget_max?: number;
  conversation_count: number;
  created_at?: string;
  view_count?: number;
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
  job: Job;
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
  const budgetLabel =
    job.budget_type === "negotiable"
      ? t("jobs.negotiable")
      : job.budget_type === "discuss"
        ? t("jobs.discuss")
        : job.budget_min && job.budget_max
          ? `₹${job.budget_min} - ₹${job.budget_max}`
          : job.budget_min
            ? `₹${job.budget_min}+`
            : null;

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
                lineHeight: 21,
              }}
            >
              {job.title}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
              <FontAwesome name="map-marker" size={11} color={colors.textTertiary} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "DMSans_400Regular",
                  color: colors.textSecondary,
                  marginLeft: 4,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {job.locality ? `${job.locality}, ` : ""}
                {job.city || t("common.nearby")}
              </Text>
            </View>

            {budgetLabel && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <FontAwesome name="inr" size={10} color={colors.textTertiary} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "DMSans_500Medium",
                    color: colors.textSecondary,
                    marginLeft: 3,
                  }}
                >
                  {budgetLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.04)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 11, fontFamily: "DMSans_400Regular", color: colors.textTertiary }}>
              {t("home.whenToStart")}:
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: urgency.bg,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_600SemiBold",
                  color: urgency.color,
                  textTransform: "capitalize",
                }}
              >
                {job.urgency.replace("_", " ")}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FontAwesome
                name="comments-o"
                size={12}
                color={colors.textTertiary}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_500Medium",
                  color: colors.textTertiary,
                  marginLeft: 4,
                }}
              >
                {job.conversation_count}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function StatPill({
  icon,
  label,
  value,
  iconColor,
  colors,
  isDark,
}: {
  icon: string;
  label: string;
  value: string | number;
  iconColor: string;
  colors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgSurface,
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <FontAwesome name={icon as React.ComponentProps<typeof FontAwesome>["name"]} size={16} color={iconColor} />
      <Text
        style={{
          fontSize: 18,
          fontFamily: "DMSans_700Bold",
          color: colors.textPrimary,
          marginTop: 6,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          fontFamily: "DMSans_500Medium",
          color: colors.textTertiary,
          marginTop: 2,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SkeletonBlock({ width, height = 12, radius = 6, style }: {
  width: number | string; height?: number; radius?: number; style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  return (
    <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: "#94A3B8", opacity }, style]} />
  );
}

function HomeSkeletonJobCard({ isDark }: { isDark: boolean }) {
  return (
    <View style={{
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <SkeletonBlock width={42} height={42} radius={12} style={{ marginRight: 12 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="75%" height={14} />
          <SkeletonBlock width="50%" height={11} />
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", marginTop: 12, marginBottom: 10 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <SkeletonBlock width={70} height={22} radius={6} />
        <SkeletonBlock width={50} height={22} radius={6} />
      </View>
    </View>
  );
}

function HomeSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Hero header skeleton */}
      <View style={{
        backgroundColor: "#059669",
        paddingTop: Platform.OS === "ios" ? 56 : 44,
        paddingBottom: 32,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <SkeletonBlock width={100} height={12} style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
        <SkeletonBlock width={180} height={22} radius={8} style={{ marginTop: 8, backgroundColor: "rgba(255,255,255,0.3)" }} />
        <SkeletonBlock width={130} height={28} radius={20} style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.2)" }} />
      </View>

      {/* Section header */}
      <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonBlock width={120} height={16} />
        <SkeletonBlock width={60} height={28} radius={8} />
      </View>

      {/* Job card skeletons */}
      <View style={{ paddingHorizontal: 20 }}>
        <HomeSkeletonJobCard isDark={isDark} />
        <HomeSkeletonJobCard isDark={isDark} />
        <HomeSkeletonJobCard isDark={isDark} />
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const [nearbyJobs, setNearbyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const { getToken } = useAuth();
  const { user } = useUser();
  const { usagePreference, location } = useUserStore();
  const router = useRouter();
  const colors = useThemeColors();
  const isDark = colors.bgBase === "#0A0F1A";
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heroFade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      setStatusBarBackgroundColor("#059669", false);
      setStatusBarStyle("light");
      return () => {
        setStatusBarBackgroundColor(isDark ? "#0A0F1A" : "#F8FAFC", false);
        setStatusBarStyle(isDark ? "light" : "dark");
      };
    }, [isDark])
  );

  useEffect(() => {
    Animated.timing(heroFade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const syncUser = async (token: string | null) => {
    if (!token) return;
    try {
      const displayName = user?.fullName || user?.firstName || undefined;
      await api("/auth/sync-clerk-user", {
        method: "POST",
        token,
        body: displayName ? { full_name: displayName } : undefined,
      });
    } catch {}
  };

  const fetchData = async (query?: string) => {
    try {
      const token = await getToken();
      if (!query) await syncUser(token);
      let endpoint: string;
      if (usagePreference === "find_worker") {
        endpoint = "/jobs/mine";
      } else {
        const params = new URLSearchParams({ limit: "20", exclude_mine: "true" });
        if (query?.trim()) params.set("q", query.trim());
        endpoint = `/jobs?${params.toString()}`;
      }
      const jobs = await api<Job[]>(endpoint, { token });
      setNearbyJobs(jobs);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearching(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [usagePreference])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      fetchData(text);
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearching(true);
    fetchData("");
  };

  const firstName = user?.firstName || "there";
  const locationLabel = location?.locality
    ? `${location.locality}, ${location.city || ""}`
    : location?.city || t("common.setLocation");

  const isEmployer = usagePreference === "find_worker";
  const activeJobs = nearbyJobs.length;
  const totalResponses = nearbyJobs.reduce(
    (sum, j) => sum + j.conversation_count,
    0
  );

  if (loading) {
    return <HomeSkeleton isDark={isDark} />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          tintColor="#059669"
        />
      }
    >
      {/* Hero Header */}
      <Animated.View style={{ opacity: heroFade }}>
        <View
          style={{
            backgroundColor: "#059669",
            paddingTop: Platform.OS === "ios" ? 56 : 44,
            paddingBottom: 32,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "DMSans_400Regular",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {`${t("common.hello")}, ${firstName}`}
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "DMSans_700Bold",
                  color: "#FFFFFF",
                  marginTop: 2,
                }}
              >
                {isEmployer ? "KaamHetu" : t("home.findWork")}
              </Text>
            </View>

            <KaamSpotLogo size="sm" onDark />
          </View>

          {/* Location Pill */}
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginTop: 14,
            }}
          >
            <FontAwesome name="map-marker" size={12} color="#FFFFFF" />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "DMSans_500Medium",
                color: "#FFFFFF",
                marginLeft: 6,
              }}
              numberOfLines={1}
            >
              {locationLabel}
            </Text>
            <FontAwesome
              name="chevron-down"
              size={8}
              color="rgba(255,255,255,0.7)"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>

          {/* Inline Search Bar (Worker only) */}
          {!isEmployer && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.18)",
                borderRadius: 14,
                marginTop: 16,
                paddingHorizontal: 14,
                height: 44,
              }}
            >
              <FontAwesome name="search" size={14} color="rgba(255,255,255,0.6)" />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder={t("home.searchJobs")}
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 14,
                  fontFamily: "DMSans_400Regular",
                  color: "#FFFFFF",
                  paddingVertical: 0,
                }}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
                  <FontAwesome name="times-circle" size={16} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              )}
              {searching && (
                <ActivityIndicator
                  size="small"
                  color="rgba(255,255,255,0.7)"
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Stats Row (Employer) */}
      {isEmployer && (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            marginTop: -16,
            gap: 10,
          }}
        >
          <StatPill
            icon="briefcase"
            label={t("home.activeJobs")}
            value={activeJobs}
            iconColor="#059669"
            colors={colors}
            isDark={isDark}
          />
          <StatPill
            icon="comments"
            label={t("home.responses")}
            value={totalResponses}
            iconColor="#3B82F6"
            colors={colors}
            isDark={isDark}
          />
          <StatPill
            icon="eye"
            label={t("home.totalViews")}
            value={nearbyJobs.reduce((s, j) => s + (j.view_count || 0), 0)}
            iconColor="#F59E0B"
            colors={colors}
            isDark={isDark}
          />
        </View>
      )}

      {/* Post Job CTA (Employer, no jobs) */}
      {isEmployer && nearbyJobs.length === 0 && (
        <TouchableOpacity
          onPress={() => router.push("/post-job")}
          activeOpacity={0.8}
          style={{
            marginHorizontal: 20,
            marginTop: 20,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? "#064E3B" : "#ECFDF5",
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(5,150,105,0.3)"
                : "rgba(5,150,105,0.15)",
              borderRadius: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "DMSans_700Bold",
                  color: "#059669",
                }}
              >
                {t("home.postJob")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans_400Regular",
                  color: isDark ? "rgba(5,150,105,0.7)" : "#6B7280",
                  marginTop: 4,
                }}
              >
                {t("home.getResponses")}
              </Text>
            </View>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "#059669",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="plus" size={18} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Section Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          marginTop: isEmployer ? 24 : 20,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontFamily: "DMSans_700Bold",
            color: colors.textPrimary,
          }}
        >
          {isEmployer ? t("home.myPostedJobs") : t("home.nearbyJobs")}
        </Text>
        {!isEmployer && nearbyJobs.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/jobs")}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(5,150,105,0.08)",
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "DMSans_600SemiBold",
                color: "#059669",
              }}
            >
              {t("common.seeAll")}
            </Text>
            <FontAwesome
              name="chevron-right"
              size={9}
              color="#059669"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Job List */}
      <View style={{ paddingHorizontal: 20 }}>
        {nearbyJobs.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: 16,
              alignItems: "center",
              paddingVertical: 40,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <FontAwesome
                name="briefcase"
                size={24}
                color={colors.textTertiary}
              />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "DMSans_500Medium",
                color: colors.textTertiary,
              }}
            >
              {isEmployer ? t("home.noPostedJobs") : t("home.noJobs")}
            </Text>
            {isEmployer && (
              <TouchableOpacity
                onPress={() => router.push("/post-job")}
                activeOpacity={0.7}
                style={{
                  marginTop: 14,
                  backgroundColor: "rgba(5,150,105,0.1)",
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "DMSans_600SemiBold",
                    color: "#059669",
                  }}
                >
                  {t("home.postFirstJob")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          nearbyJobs.map((job, idx) => (
            <JobCard
              key={job.id}
              job={job}
              index={idx}
              onPress={() => router.push(`/job/${job.id}`)}
              colors={colors}
              isDark={isDark}
              t={t}
              isEmployer={isEmployer}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
