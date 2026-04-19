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
  Modal,
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
  status?: string;
  budget_type?: string;
  budget_min?: number;
  budget_max?: number;
  conversation_count: number;
  created_at?: string;
  view_count?: number;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  required_date?: string;
  required_date_end?: string;
  location?: { type: string; coordinates: [number, number] };
}

const STATUS_PILL_CONFIG: Record<
  string,
  { labelKey: string; color: string; bg: string; darkBg: string }
> = {
  open: {
    labelKey: "jobs.open",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.08)",
    darkBg: "rgba(59,130,246,0.18)",
  },
  assigned: {
    labelKey: "jobs.assigned",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.08)",
    darkBg: "rgba(139,92,246,0.18)",
  },
  completed: {
    labelKey: "jobs.completed",
    color: "#059669",
    bg: "rgba(5,150,105,0.1)",
    darkBg: "rgba(5,150,105,0.2)",
  },
  cancelled: {
    labelKey: "jobs.cancelled",
    color: "#DC2626",
    bg: "rgba(220,38,38,0.08)",
    darkBg: "rgba(220,38,38,0.18)",
  },
  hidden: {
    labelKey: "jobs.hidden",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.12)",
    darkBg: "rgba(156,163,175,0.2)",
  },
};

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatScheduledLabel(job: Pick<Job, "required_date" | "required_date_end" | "urgency">, fallback: string): string {
  if (job.required_date && job.required_date_end) {
    return `${formatShortDate(job.required_date)} – ${formatShortDate(job.required_date_end)}`;
  }
  if (job.required_date) return formatShortDate(job.required_date);
  return fallback;
}

function urgencyLabelKey(urgency: string): string {
  const map: Record<string, string> = {
    today: "jobs.today",
    tomorrow: "jobs.tomorrow",
    this_week: "jobs.thisWeek",
    flexible: "jobs.flexible",
    urgent: "jobs.urgent",
    custom: "jobs.custom",
  };
  return map[urgency] || "jobs.flexible";
}

/** Haversine distance in km between two lat/lng points */
function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number): string {
  if (km < 10) return km.toFixed(1);
  return Math.round(km).toString();
}

function jobDistanceKm(
  job: Pick<Job, "location">,
  coords: { latitude: number; longitude: number } | null,
): number | null {
  const jobCoords = job.location?.coordinates;
  if (!coords || !jobCoords || jobCoords.length !== 2) return null;
  if (coords.latitude === 0 && coords.longitude === 0) return null;
  return getDistanceKm(coords.latitude, coords.longitude, jobCoords[1], jobCoords[0]);
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
  distanceKm,
  showStatus = false,
}: {
  job: Job;
  index: number;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  distanceKm?: number | null;
  showStatus?: boolean;
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, flexWrap: "wrap" }}>
            {showStatus && job.status && (() => {
              const cfg =
                STATUS_PILL_CONFIG[job.status] ?? STATUS_PILL_CONFIG.open;
              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: cfg.color,
                      marginRight: 5,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "DMSans_600SemiBold",
                      color: cfg.color,
                    }}
                  >
                    {t(cfg.labelKey, { defaultValue: job.status })}
                  </Text>
                </View>
              );
            })()}
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
              <FontAwesome
                name={urgency.icon as React.ComponentProps<typeof FontAwesome>["name"]}
                size={10}
                color={urgency.color}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_600SemiBold",
                  color: urgency.color,
                }}
              >
                {formatScheduledLabel(job, t(urgencyLabelKey(job.urgency)))}
              </Text>
            </View>
            {distanceKm != null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "rgba(59,130,246,0.14)" : "rgba(59,130,246,0.08)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <FontAwesome name="location-arrow" size={9} color="#3B82F6" style={{ marginRight: 4 }} />
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "DMSans_600SemiBold",
                    color: "#3B82F6",
                  }}
                >
                  {t("jobs.kmAway", { km: formatKm(distanceKm) })}
                </Text>
              </View>
            )}
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
  const [rangeJobs, setRangeJobs] = useState<Job[]>([]);
  const [cityJobs, setCityJobs] = useState<Job[]>([]);
  const [otherJobs, setOtherJobs] = useState<Job[]>([]);
  const [nearbyJobs, setNearbyJobs] = useState<Job[]>([]);
  const [workRangeKm, setWorkRangeKm] = useState<number | null>(null);
  const [savedUserCoords, setSavedUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [savedUserCity, setSavedUserCity] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [categoryIdToSlug, setCategoryIdToSlug] = useState<Record<string, string>>({});
  const [filterVisible, setFilterVisible] = useState(false);
  const [rangeFilterVisible, setRangeFilterVisible] = useState(false);
  const [rangeOverride, setRangeOverride] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [employerStatusFilter, setEmployerStatusFilter] = useState<
    "open" | "assigned" | "completed" | "hidden"
  >("open");
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

  // Fetch categories, work range, saved location — re-fetch on every focus
  const fetchUserAndCategories = useCallback(async () => {
    try {
      const token = await getToken();
      const [cats, me] = await Promise.all([
        api<{ id: string; slug: string }[]>("/categories", { token }),
        api<{ work_range_km?: number; location?: { coordinates: [number, number] }; city?: string }>("/auth/me", { token }),
      ]);
      const map: Record<string, string> = {};
      for (const c of cats) map[c.id] = c.slug;
      setCategoryIdToSlug(map);
      if (me.work_range_km != null) setWorkRangeKm(me.work_range_km);
      if (me.location?.coordinates) {
        setSavedUserCoords({
          longitude: me.location.coordinates[0],
          latitude: me.location.coordinates[1],
        });
      }
      if (me.city) setSavedUserCity(me.city);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserAndCategories();
    }, [fetchUserAndCategories])
  );

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

  const fetchData = async (
    query?: string,
    categorySlugs?: string[],
    rangeOverrideArg?: number | null,
  ) => {
    try {
      const token = await getToken();
      if (!query) await syncUser(token);
      let endpoint: string;
      if (usagePreference === "find_worker") {
        endpoint = "/jobs/mine";
      } else {
        const params = new URLSearchParams({ limit: "50", exclude_mine: "true" });
        if (query?.trim()) params.set("q", query.trim());
        endpoint = `/jobs?${params.toString()}`;
      }
      const jobs = await api<Job[]>(endpoint, { token });
      setNearbyJobs(jobs);
      if (usagePreference !== "find_worker") {
        // Filter by category
        const activeCategories = categorySlugs && categorySlugs.length > 0 ? new Set(categorySlugs) : null;
        const matchesCategory = (j: Job) => {
          if (!activeCategories) return true;
          const slug = j.category_slug ?? categoryIdToSlug[j.category_id ?? ""] ?? "";
          return activeCategories.has(slug);
        };
        const allMatching = jobs.filter(matchesCategory);

        // Split into 3 categories using saved coordinates from backend
        const userLat = savedUserCoords?.latitude;
        const userLng = savedUserCoords?.longitude;
        const hasUserCoords = userLat != null && userLng != null && (userLat !== 0 || userLng !== 0);
        const userCity = (savedUserCity || location?.city)?.toLowerCase().trim();
        const effectiveRange =
          rangeOverrideArg !== undefined ? rangeOverrideArg : rangeOverride;
        const range = effectiveRange ?? workRangeKm;

        const inRange: Job[] = [];
        const inCity: Job[] = [];
        const inOther: Job[] = [];

        for (const j of allMatching) {
          const jobLng = j.location?.coordinates?.[0];
          const jobLat = j.location?.coordinates?.[1];
          const hasJobCoords = jobLat != null && jobLng != null && (jobLat !== 0 || jobLng !== 0);
          const jobCity = j.city?.toLowerCase().trim();

          // 1. Check distance: worker coords vs job coords
          if (hasUserCoords && hasJobCoords && range != null && range > 0) {
            const dist = getDistanceKm(userLat, userLng, jobLat, jobLng);
            if (dist <= range) {
              inRange.push(j);
              continue;
            }
          }

          // 2. Outside range — check if same city
          if (userCity && jobCity === userCity) {
            inCity.push(j);
          } else {
            // 3. Different city → others
            inOther.push(j);
          }
        }

        setRangeJobs(inRange);
        setCityJobs(inCity);
        setOtherJobs(inOther);
      }
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
    }, [usagePreference, savedUserCoords, savedUserCity, workRangeKm])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      fetchData(text, Array.from(selectedCategories));
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearching(true);
    fetchData("", Array.from(selectedCategories));
  };

  const firstName = user?.firstName || "there";
  const locationLabel = location?.locality
    ? `${location.locality}, ${location.city || ""}`
    : location?.city || t("common.setLocation");

  const isEmployer = usagePreference === "find_worker";

  const RANGE_OPTIONS: {
    label: string;
    value: number;
    icon: React.ComponentProps<typeof FontAwesome>["name"];
    color: string;
  }[] = [
    { label: "Under 1 km", value: 1, icon: "street-view", color: "#10B981" },
    { label: "Under 2 km", value: 2, icon: "street-view", color: "#059669" },
    { label: "2–5 km", value: 5, icon: "bicycle", color: "#3B82F6" },
    { label: "5–10 km", value: 10, icon: "motorcycle", color: "#6366F1" },
    { label: "10–20 km", value: 20, icon: "car", color: "#8B5CF6" },
    { label: t("settings.inMyCity"), value: 0, icon: "building-o", color: "#F59E0B" },
  ];

  const activeRangeValue = rangeOverride ?? workRangeKm;
  const activeRangeLabel =
    RANGE_OPTIONS.find((o) => o.value === activeRangeValue)?.label ??
    t("home.range");
  const rangeIsCustom = rangeOverride !== null;

  const CATEGORIES = [
    { id: "plumber", name: "Plumber" },
    { id: "electrician", name: "Electrician" },
    { id: "carpenter", name: "Carpenter" },
    { id: "painter", name: "Painter" },
    { id: "mason", name: "Mason / Mistri" },
    { id: "labour", name: "Labour / Helper" },
    { id: "ac-repair", name: "AC Repair" },
    { id: "ro-repair", name: "RO Repair" },
    { id: "cctv", name: "CCTV Technician" },
    { id: "welder", name: "Welder" },
    { id: "tile-worker", name: "Tile Worker" },
    { id: "pop-false-ceiling", name: "POP / False Ceiling" },
    { id: "house-cleaning", name: "House Cleaning" },
    { id: "appliance-repair", name: "Appliance Repair" },
    { id: "pest-control", name: "Pest Control" },
    { id: "furniture", name: "Furniture Work" },
    { id: "borewell", name: "Borewell / Water Tank" },
    { id: "civil-contractor", name: "Civil Contractor" },
    { id: "interior", name: "Interior Work" },
    { id: "packer-mover", name: "Packer / Mover Helper" },
  ];

  const filteredEmployerJobs = nearbyJobs.filter(
    (j) => (j.status || "open") === employerStatusFilter
  );
  const employerStatusTabs = [
    { key: "open" as const, labelKey: "jobs.open", color: "#3B82F6" },
    { key: "assigned" as const, labelKey: "jobs.assigned", color: "#8B5CF6" },
    { key: "completed" as const, labelKey: "jobs.completed", color: "#059669" },
    { key: "hidden" as const, labelKey: "jobs.hidden", color: "#6B7280" },
  ];

  if (loading) {
    return <HomeSkeleton isDark={isDark} />;
  }

  const handleHomeRefresh = () => {
    setRefreshing(true);
    void (async () => {
      await fetchUserAndCategories();
      await fetchData(searchQuery.trim() || undefined, Array.from(selectedCategories));
    })();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Hero Header (fixed) */}
      <Animated.View style={{ opacity: heroFade }}>
        <View
          style={{
            backgroundColor: "#059669",
            paddingTop: Platform.OS === "ios" ? 56 : 44,
            paddingBottom: 18,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <View>
            <View style={{ alignSelf: "flex-start" }}>
              <KaamSpotLogo size="sm" onDark row />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "DMSans_400Regular",
                  color: "rgba(255,255,255,0.75)",
                  flexShrink: 0,
                }}
              >
                {`${t("common.hello")}, ${firstName}`}
              </Text>

              {/* Location Pill */}
              <TouchableOpacity
                onPress={() => router.push("/settings")}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexShrink: 1,
                  maxWidth: "50%",
                }}
              >
                <FontAwesome name="map-marker" size={12} color="#FFFFFF" />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "DMSans_500Medium",
                    color: "#FFFFFF",
                    marginLeft: 6,
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
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
            </View>
          </View>

          {/* Inline Search Bar (Worker only) */}
          {!isEmployer && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.18)",
                borderRadius: 10,
                marginTop: 12,
                paddingHorizontal: 12,
                height: 36,
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

      {/* Section Header (fixed) */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          marginTop: isEmployer ? 24 : 20,
          paddingBottom: 14,
        }}
      >
        {isEmployer ? (
          <Text style={{ fontSize: 18, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
            {t("home.myPostedJobs")}
          </Text>
        ) : (
          <View />
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!isEmployer && (
            <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: colors.textTertiary }}>
              {t("home.filter")}:
            </Text>
          )}
          {/* Range filter button (worker only) */}
          {!isEmployer && (
            <TouchableOpacity
              onPress={() => setRangeFilterVisible(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: rangeIsCustom
                  ? "#059669"
                  : isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
                borderWidth: 1,
                borderColor: rangeIsCustom
                  ? "#059669"
                  : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.08)",
                paddingHorizontal: 11,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <FontAwesome
                name="map-o"
                size={12}
                color={rangeIsCustom ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "DMSans_600SemiBold",
                  color: rangeIsCustom ? "#FFFFFF" : colors.textSecondary,
                }}
              >
                {rangeIsCustom ? activeRangeLabel : t("home.range")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Filter button (worker only) */}
          {!isEmployer && (
            <TouchableOpacity
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: selectedCategories.size > 0 ? "#059669" : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                borderWidth: 1,
                borderColor: selectedCategories.size > 0 ? "#059669" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                paddingHorizontal: 11,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <FontAwesome
                name="sliders"
                size={12}
                color={selectedCategories.size > 0 ? "#FFFFFF" : colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "DMSans_600SemiBold",
                  color: selectedCategories.size > 0 ? "#FFFFFF" : colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {selectedCategories.size === 0
                  ? t("home.category")
                  : selectedCategories.size === 1
                  ? CATEGORIES.find((c) => selectedCategories.has(c.id))?.name ?? t("home.category")
                  : `${selectedCategories.size} ${t("home.categoriesLabel")}`}
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>

      {/* Line after filters */}
      <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginHorizontal: 20 }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleHomeRefresh}
            tintColor="#059669"
            colors={["#059669"]}
            progressBackgroundColor={Platform.OS === "android" ? colors.bgSurface : undefined}
            title={Platform.OS === "ios" ? t("common.refreshing") : undefined}
            titleColor={colors.textSecondary}
          />
        }
      >

      {/* Category Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setFilterVisible(false)}
        />
        <View style={{
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 32,
          maxHeight: "75%",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
              Filter by Category
            </Text>
            {selectedCategories.size > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategories(new Set());
                  setFilterVisible(false);
                  setLoading(true);
                  fetchData(searchQuery || undefined, []);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#059669" }}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category list */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((cat, i) => {
              const isSelected = selectedCategories.has(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    const next = new Set(selectedCategories);
                    isSelected ? next.delete(cat.id) : next.add(cat.id);
                    setSelectedCategories(next);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 13,
                    borderBottomWidth: i < CATEGORIES.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Text style={{ fontSize: 15, fontFamily: "DMSans_400Regular", color: isSelected ? "#059669" : colors.textPrimary }}>
                    {cat.name}
                  </Text>
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isSelected ? "#059669" : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                    backgroundColor: isSelected ? "#059669" : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {isSelected && <FontAwesome name="check" size={11} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Apply button */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <TouchableOpacity
              onPress={() => {
                setFilterVisible(false);
                setLoading(true);
                fetchData(searchQuery || undefined, Array.from(selectedCategories));
              }}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#059669",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: "DMSans_700Bold", color: "#FFFFFF" }}>
                {selectedCategories.size === 0 ? "Show All Jobs" : `Show ${selectedCategories.size} Categor${selectedCategories.size > 1 ? "ies" : "y"}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Range Filter Modal */}
      <Modal
        visible={rangeFilterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRangeFilterVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setRangeFilterVisible(false)}
        />
        <View
          style={{
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 32,
            maxHeight: "75%",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
              {t("home.filterByRange")}
            </Text>
            {rangeIsCustom && (
              <TouchableOpacity
                onPress={() => {
                  setRangeOverride(null);
                  setRangeFilterVisible(false);
                  setLoading(true);
                  fetchData(searchQuery || undefined, Array.from(selectedCategories), null);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#059669" }}>
                  {t("home.resetRange")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Range list */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            {RANGE_OPTIONS.map((opt, i) => {
              const isSelected = activeRangeValue === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setRangeOverride(opt.value);
                    setRangeFilterVisible(false);
                    setLoading(true);
                    fetchData(
                      searchQuery || undefined,
                      Array.from(selectedCategories),
                      opt.value,
                    );
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 13,
                    borderBottomWidth: i < RANGE_OPTIONS.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: `${opt.color}22`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesome name={opt.icon} size={15} color={opt.color} />
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: "DMSans_400Regular",
                        color: isSelected ? "#059669" : colors.textPrimary,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? "#059669"
                        : isDark
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.2)",
                      backgroundColor: isSelected ? "#059669" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && <FontAwesome name="check" size={11} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Employer: status filter chips */}
      {isEmployer && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          style={{ marginBottom: 14 }}
        >
          {employerStatusTabs.map((tab) => {
            const isActive = employerStatusFilter === tab.key;
            const count = nearbyJobs.filter(
              (j) => (j.status || "open") === tab.key
            ).length;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setEmployerStatusFilter(tab.key)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: isActive
                    ? tab.color
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  borderWidth: 1,
                  borderColor: isActive
                    ? tab.color
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "DMSans_600SemiBold",
                    color: isActive ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {t(tab.labelKey)}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      minWidth: 20,
                      height: 18,
                      borderRadius: 9,
                      paddingHorizontal: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.25)"
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.08)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "DMSans_700Bold",
                        color: isActive ? "#FFFFFF" : colors.textSecondary,
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Job List */}
      <View style={{ paddingHorizontal: 20 }}>
        {isEmployer || nearbyJobs.length === 0 ? null : (
          <>
            {rangeJobs.length === 0 && cityJobs.length === 0 && otherJobs.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text style={{ fontSize: 14, fontFamily: "DMSans_500Medium", color: colors.textTertiary }}>
                  {t("home.noJobsForCategory")}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCategories(new Set())} style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: "#059669" }}>{t("home.clearFilters")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* No jobs in your city message */}
            {rangeJobs.length === 0 && cityJobs.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <FontAwesome name="briefcase" size={24} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 14, fontFamily: "DMSans_500Medium", color: colors.textSecondary, textAlign: "center" }}>
                  {t("home.noJobsInYourCity")}
                </Text>
              </View>
            )}

            {/* 1. Jobs Near You (within work range) */}
            {rangeJobs.length > 0 && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <FontAwesome name="map-pin" size={12} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontFamily: "DMSans_700Bold", color: "#059669" }}>
                    {t("home.jobsInYourRange")}
                  </Text>
                </View>
                {rangeJobs.map((job, idx) => (
                  <JobCard key={job.id} job={job} index={idx} onPress={() => router.push(`/job/${job.id}`)} colors={colors} isDark={isDark} t={t} distanceKm={jobDistanceKm(job, savedUserCoords)} />
                ))}
              </>
            )}

            {/* 2. Jobs in Your City */}
            {cityJobs.length > 0 && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: rangeJobs.length > 0 ? 20 : 0, marginBottom: 12 }}>
                  {rangeJobs.length > 0 && (
                    <>
                      <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }} />
                      <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: colors.textTertiary, marginHorizontal: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {t("home.jobsInYourCity")}
                      </Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }} />
                    </>
                  )}
                  {rangeJobs.length === 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <FontAwesome name="building-o" size={12} color="#3B82F6" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 14, fontFamily: "DMSans_700Bold", color: "#3B82F6" }}>
                        {t("home.jobsInYourCity")}
                      </Text>
                    </View>
                  )}
                </View>
                {cityJobs.map((job, idx) => (
                  <JobCard key={job.id} job={job} index={idx} onPress={() => router.push(`/job/${job.id}`)} colors={colors} isDark={isDark} t={t} distanceKm={jobDistanceKm(job, savedUserCoords)} />
                ))}
              </>
            )}

            {/* 3. Jobs in Other Cities */}
            {otherJobs.length > 0 && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 12 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }} />
                  <Text style={{ fontSize: 12, fontFamily: "DMSans_600SemiBold", color: colors.textTertiary, marginHorizontal: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {t("home.otherCities")}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }} />
                </View>
                {otherJobs.map((job, idx) => (
                  <JobCard key={job.id} job={job} index={idx} onPress={() => router.push(`/job/${job.id}`)} colors={colors} isDark={isDark} t={t} distanceKm={jobDistanceKm(job, savedUserCoords)} />
                ))}
              </>
            )}
          </>
        )}
        {(isEmployer ? filteredEmployerJobs.length : nearbyJobs.length) === 0 ? (
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
              {isEmployer
                ? nearbyJobs.length === 0
                  ? t("home.noPostedJobs")
                  : t("home.noJobsForStatus", {
                      status: t(`jobs.${employerStatusFilter}`),
                    })
                : t("home.noJobs")}
            </Text>
            {isEmployer && nearbyJobs.length === 0 && (
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
        ) : isEmployer ? (
          filteredEmployerJobs.map((job, idx) => (
            <JobCard
              key={job.id}
              job={job}
              index={idx}
              onPress={() => router.push(`/job/${job.id}`)}
              colors={colors}
              isDark={isDark}
              t={t}
              showStatus
            />
          ))
        ) : null}
      </View>
    </ScrollView>

      {refreshing && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: Platform.OS === "ios" ? 52 : 12,
            zIndex: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.97)",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.35 : 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <ActivityIndicator size="small" color="#059669" />
            <Text
              style={{
                marginLeft: 10,
                fontSize: 13,
                fontFamily: "DMSans_500Medium",
                color: colors.textSecondary,
              }}
            >
              {t("common.refreshing")}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
