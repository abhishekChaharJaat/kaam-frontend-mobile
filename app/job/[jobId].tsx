import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { useToast } from "@/lib/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useUserStore } from "@/store/user";

interface JobDetail {
  id: string;
  title: string;
  description: string;
  category_id: string;
  budget_type: string;
  budget_min?: number;
  budget_max?: number;
  urgency: string;
  status: string;
  city?: string;
  locality?: string;
  address_line?: string;
  latitude?: number;
  longitude?: number;
  location?: { type: string; coordinates: [number, number] };
  posted_by_user_id: string;
  posted_by_clerk_id?: string;
  posted_by_name?: string;
  poster_rating_avg?: number;
  poster_rating_count?: number;
  images: string[];
  required_date?: string;
  required_date_end?: string;
  required_time_slot?: string;
  view_count: number;
  conversation_count: number;
  created_at?: string;
  assigned_to_user_id?: string;
}

const URGENCY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof FontAwesome>["name"]; color: string; bg: string }
> = {
  urgent: { label: "Urgent", icon: "bolt", color: "#EF4444", bg: "#FEE2E2" },
  today: { label: "Today", icon: "clock-o", color: "#F59E0B", bg: "#FEF3C7" },
  tomorrow: { label: "Tomorrow", icon: "calendar-o", color: "#3B82F6", bg: "#DBEAFE" },
  this_week: { label: "This Week", icon: "calendar", color: "#8B5CF6", bg: "#EDE9FE" },
  flexible: { label: "Flexible", icon: "leaf", color: "#059669", bg: "#D1FAE5" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  open: { color: "#059669", bg: "#D1FAE5" },
  assigned: { color: "#3B82F6", bg: "#DBEAFE" },
  completed: { color: "#6B7280", bg: "#F3F4F6" },
  cancelled: { color: "#EF4444", bg: "#FEE2E2" },
  hidden: { color: "#6B7280", bg: "#E5E7EB" },
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_WIDTH = SCREEN_WIDTH - 40;

function StarRating({
  avg,
  count,
  colors,
}: {
  avg: number;
  count: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon: React.ComponentProps<typeof FontAwesome>["name"] =
          avg >= star ? "star" : avg >= star - 0.5 ? "star-half-full" : "star-o";
        return <FontAwesome key={star} name={icon} size={13} color="#F59E0B" />;
      })}
      <Text
        style={{
          fontSize: 13,
          fontFamily: "DMSans_600SemiBold",
          color: "#F59E0B",
          marginLeft: 2,
        }}
      >
        {avg.toFixed(1)}
      </Text>
      {count > 0 && (
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_400Regular",
            color: colors.textTertiary,
          }}
        >
          ({count})
        </Text>
      )}
    </View>
  );
}

function InfoChip({
  icon,
  label,
  value,
  iconColor,
  colors,
  isDark,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  value: string;
  iconColor: string;
  colors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        gap: 6,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome name={icon} size={14} color={iconColor} />
      </View>
      <Text
        style={{
          fontSize: 15,
          fontFamily: "DMSans_700Bold",
          color: colors.textPrimary,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "DMSans_400Regular",
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
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
  if (km < 1) return km.toFixed(1);
  if (km < 10) return km.toFixed(1);
  return Math.round(km).toString();
}

function formatDDMMYY(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/** Parse API created_at — backend often sends UTC ISO without a Z suffix. */
function parseJobCreatedAt(raw: string | undefined | null): Date | null {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  const hasTz = /[zZ]$|[+-]\d{2}:\d{2}$/.test(s);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !hasTz) {
    const d = new Date(s.endsWith("Z") ? s : `${s}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelativePosted(
  created: Date,
  t: (key: string, opt?: Record<string, unknown>) => string,
): string {
  const diffMs = Date.now() - created.getTime();
  if (diffMs < 0) return formatAbsolutePosted(created);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("jobs.postedJustNow");
  if (mins < 60) return t("jobs.postedMinutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("jobs.postedHoursAgo", { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t("jobs.postedDaysAgo", { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("jobs.postedWeeksAgo", { count: weeks });
  return formatAbsolutePosted(created);
}

function formatAbsolutePosted(created: Date): string {
  return created.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function budgetTypeLabel(
  job: JobDetail,
  t: (key: string, opt?: Record<string, unknown>) => string,
): string {
  switch (job.budget_type) {
    case "fixed":
      return t("jobs.fixedPrice");
    case "negotiable":
      return t("jobs.negotiable");
    case "discuss":
      return t("jobs.discuss");
    default:
      return job.budget_type;
  }
}

/** Rupee amount if applicable; `discuss` and no-amount legacy jobs return null. */
function formatBudgetAmount(job: JobDetail): string | null {
  if (job.budget_type === "discuss") return null;
  if (job.budget_min != null && job.budget_max != null) {
    if (job.budget_min === job.budget_max)
      return `₹${job.budget_min.toLocaleString()}`;
    return `₹${job.budget_min.toLocaleString()} - ₹${job.budget_max.toLocaleString()}`;
  }
  if (job.budget_min != null) return `₹${job.budget_min.toLocaleString()}+`;
  return null;
}

function SkeletonBox({ width, height = 12, radius = 6, style }: {
  width: number | string; height?: number; radius?: number; style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  return (
    <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: "#94A3B8", opacity }, style]} />
  );
}

function JobDetailSkeleton({ colors, isDark }: { colors: ReturnType<typeof useThemeColors>; isDark: boolean }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 10 }}>
        {/* title */}
        <SkeletonBox width="80%" height={26} radius={8} />
        <SkeletonBox width="55%" height={16} radius={6} />
        {/* chips */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <SkeletonBox width={90} height={26} radius={8} />
          <SkeletonBox width={70} height={26} radius={8} />
          <SkeletonBox width={80} height={26} radius={8} />
        </View>
        {/* description block */}
        <View style={{ marginTop: 20, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16, gap: 10 }}>
          <SkeletonBox width={100} height={12} radius={4} />
          <SkeletonBox width="100%" height={12} radius={4} />
          <SkeletonBox width="90%" height={12} radius={4} />
          <SkeletonBox width="75%" height={12} radius={4} />
          <SkeletonBox width="85%" height={12} radius={4} />
        </View>
        {/* budget card */}
        <View style={{ marginTop: 8, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <SkeletonBox width={44} height={44} radius={14} />
          <View style={{ gap: 8 }}>
            <SkeletonBox width={60} height={10} radius={4} />
            <SkeletonBox width={120} height={20} radius={6} />
          </View>
        </View>
        {/* schedule */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 14, padding: 14, gap: 6 }}>
            <SkeletonBox width={50} height={10} radius={4} />
            <SkeletonBox width={80} height={14} radius={4} />
          </View>
          <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 14, padding: 14, gap: 6 }}>
            <SkeletonBox width={50} height={10} radius={4} />
            <SkeletonBox width={80} height={14} radius={4} />
          </View>
        </View>
        {/* poster */}
        <View style={{ marginTop: 8, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <SkeletonBox width={50} height={50} radius={16} />
          <View style={{ gap: 8 }}>
            <SkeletonBox width={110} height={14} radius={4} />
            <SkeletonBox width={70} height={10} radius={4} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 11,
      fontFamily: "DMSans_600SemiBold",
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "#6B7280",
      marginBottom: 10,
    }}>
      {title}
    </Text>
  );
}

export default function JobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [myMongoUserId, setMyMongoUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeTick, setTimeTick] = useState(0);
  const [hideBusy, setHideBusy] = useState(false);
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const isDark = colors.bgBase === "#0A0F1A";
  const insets = useSafeAreaInsets();

  const usagePreference = useUserStore((s) => s.usagePreference);
  const userLocation = useUserStore((s) => s.location);
  const isWorker = usagePreference === "find_work";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const [data, me] = await Promise.all([
          api<JobDetail>(`/jobs/${jobId}`, { token }),
          api<{ id: string }>("/auth/me", { token }),
        ]);
        setJob(data);
        setMyMongoUserId(me.id);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  useEffect(() => {
    if (!job?.created_at) return;
    const id = setInterval(() => setTimeTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, [job?.created_at]);

  const postedAtLabel =
    job == null
      ? null
      : (() => {
          void timeTick;
          const d = parseJobCreatedAt(job.created_at);
          if (!d) return null;
          return {
            relative: formatRelativePosted(d, t),
            absolute: formatAbsolutePosted(d),
          };
        })();

  const budgetAmountStr = job == null ? null : formatBudgetAmount(job);

  if (!job && !loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgBase,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome name="exclamation-circle" size={40} color={colors.textTertiary} />
        <Text
          style={{
            fontSize: 16,
            fontFamily: "DMSans_500Medium",
            color: colors.textSecondary,
            marginTop: 12,
          }}
        >
          {t("jobs.jobNotFound")}
        </Text>
      </View>
    );
  }

  const urgency = URGENCY_CONFIG[job?.urgency ?? "flexible"] || URGENCY_CONFIG.flexible;

  const jobCoords = job?.location?.coordinates;
  const distanceKm =
    userLocation && jobCoords && jobCoords.length === 2
      ? getDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          jobCoords[1],
          jobCoords[0],
        )
      : null;
  const status = STATUS_CONFIG[job?.status ?? "open"] || STATUS_CONFIG.open;
  const location = [job?.locality, job?.city].filter(Boolean).join(", ");
  const isOwn = job?.posted_by_clerk_id === user?.id;

  const handleHide = () => {
    if (!job) return;
    Alert.alert(
      t("jobs.hideJobConfirmTitle"),
      t("jobs.hideJobConfirmMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("jobs.hideJobConfirm"),
          style: "destructive",
          onPress: async () => {
            setHideBusy(true);
            try {
              const token = await getToken();
              await api(`/jobs/${job.id}/hide`, { method: "POST", token });
              setJob((prev) => (prev ? { ...prev, status: "hidden" } : prev));
              showToast(t("jobs.jobHidden"), "success");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : t("common.error");
              showToast(msg, "error");
            } finally {
              setHideBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleUnhide = () => {
    if (!job) return;
    Alert.alert(
      t("jobs.unhideJobConfirmTitle"),
      t("jobs.unhideJobConfirmMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("jobs.unhideJobConfirm"),
          style: "default",
          onPress: async () => {
            setHideBusy(true);
            try {
              const token = await getToken();
              await api(`/jobs/${job.id}/unhide`, { method: "POST", token });
              setJob((prev) => (prev ? { ...prev, status: "open" } : prev));
              showToast(t("jobs.jobUnhidden"), "success");
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : t("common.error");
              showToast(msg, "error");
            } finally {
              setHideBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Sticky Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 54,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: colors.bgBase,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        }}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="arrow-left" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textPrimary,
            marginLeft: 14,
          }}
          numberOfLines={1}
        >
          {t("jobs.jobDetail")}
        </Text>
        {!loading && job && (
          <View
            style={{
              backgroundColor: status.bg,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "DMSans_600SemiBold",
                color: status.color,
                textTransform: "capitalize",
              }}
            >
              {t(`jobs.${job.status}`, { defaultValue: job.status })}
            </Text>
          </View>
        )}
      </View>

      {/* Skeleton while loading */}
      {loading && <JobDetailSkeleton colors={colors} isDark={isDark} />}

      {/* Content */}
      {!loading && job && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom:
              isOwn && (job.status === "open" || job.status === "hidden")
                ? 100 + insets.bottom
                : isOwn
                ? 30 + insets.bottom
                : 100 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Images ── */}
            {job.images.length > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {job.images.map((url, i) => (
                  <Image
                    key={`img-${i}`}
                    source={{ uri: url }}
                    style={{ width: IMAGE_WIDTH, height: 200, borderRadius: 18 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            <View style={{ paddingHorizontal: 20, marginTop: job.images.length > 0 ? 20 : 16 }}>

              {isWorker ? (
                /* ══ WORKER VIEW ══ */
                <>
                  {/* Title */}
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: "DMSans_700Bold",
                      color: colors.textPrimary,
                      lineHeight: 26,
                    }}
                  >
                    {job.title}
                  </Text>

                  {/* Description — right below title */}
                  {job.description ? (
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "DMSans_400Regular",
                        color: colors.textSecondary,
                        lineHeight: 20,
                        marginTop: 6,
                      }}
                    >
                      {job.description}
                    </Text>
                  ) : null}

                  {/* Meta strip: urgency · posted · distance */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: urgency.bg,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <FontAwesome name={urgency.icon} size={10} color={urgency.color} />
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: "DMSans_600SemiBold",
                          color: urgency.color,
                        }}
                      >
                        {urgency.label}
                      </Text>
                    </View>

                    {postedAtLabel?.relative ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 }}>
                        <FontAwesome name="clock-o" size={10} color={colors.textTertiary} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "DMSans_500Medium",
                            color: colors.textTertiary,
                          }}
                        >
                          {postedAtLabel.relative}
                        </Text>
                      </View>
                    ) : null}

                    {distanceKm != null ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 }}>
                        <FontAwesome name="location-arrow" size={10} color={colors.textTertiary} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "DMSans_500Medium",
                            color: colors.textTertiary,
                          }}
                        >
                          {t("jobs.kmAway", { km: formatKm(distanceKm) })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Assigned banner */}
                  {job.status === "assigned" && myMongoUserId != null && job.assigned_to_user_id != null && (
                    <View
                      style={{
                        marginTop: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor:
                          job.assigned_to_user_id === myMongoUserId
                            ? isDark
                              ? "rgba(5,150,105,0.18)"
                              : "rgba(5,150,105,0.1)"
                            : isDark
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(245,158,11,0.12)",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor:
                          job.assigned_to_user_id === myMongoUserId
                            ? "rgba(5,150,105,0.35)"
                            : "rgba(245,158,11,0.35)",
                      }}
                    >
                      <FontAwesome
                        name={job.assigned_to_user_id === myMongoUserId ? "check-circle" : "info-circle"}
                        size={14}
                        color={job.assigned_to_user_id === myMongoUserId ? "#059669" : "#D97706"}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontFamily: "DMSans_600SemiBold",
                          color:
                            job.assigned_to_user_id === myMongoUserId
                              ? "#059669"
                              : colors.textPrimary,
                          lineHeight: 17,
                        }}
                      >
                        {job.assigned_to_user_id === myMongoUserId
                          ? t("jobs.assignedToYou")
                          : t("jobs.assignedToSomeoneElse")}
                      </Text>
                    </View>
                  )}

                  {/* Compact Budget card */}
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: isDark ? "rgba(5,150,105,0.14)" : "rgba(5,150,105,0.06)",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(5,150,105,0.3)" : "rgba(5,150,105,0.18)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: "#059669",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesome name="rupee" size={15} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 9,
                          fontFamily: "DMSans_600SemiBold",
                          color: "#059669",
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        {budgetTypeLabel(job, t)}
                      </Text>
                      <Text
                        style={{
                          fontSize: budgetAmountStr ? 16 : 13,
                          fontFamily: "DMSans_700Bold",
                          color: "#059669",
                          marginTop: 1,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {budgetAmountStr ?? t("jobs.discuss")}
                      </Text>
                    </View>
                  </View>

                  {/* Schedule grid: When + Time slot / Location */}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: colors.bgSurface,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                        borderWidth: 1,
                        borderColor: colors.border,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          backgroundColor: "rgba(59,130,246,0.12)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FontAwesome name="calendar-o" size={11} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 9,
                            fontFamily: "DMSans_600SemiBold",
                            color: colors.textTertiary,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {t("home.whenToStart")}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: "DMSans_700Bold",
                            color: colors.textPrimary,
                            marginTop: 1,
                          }}
                          numberOfLines={1}
                        >
                          {job.required_date
                            ? job.required_date_end
                              ? `${formatDDMMYY(job.required_date)} – ${formatDDMMYY(job.required_date_end)}`
                              : formatDDMMYY(job.required_date)
                            : urgency.label}
                        </Text>
                      </View>
                    </View>

                    {job.required_time_slot ? (
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: colors.bgSurface,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 9,
                          borderWidth: 1,
                          borderColor: colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            backgroundColor: "rgba(139,92,246,0.12)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FontAwesome name="clock-o" size={11} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 9,
                              fontFamily: "DMSans_600SemiBold",
                              color: colors.textTertiary,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {t("jobs.timeSlot")}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "DMSans_700Bold",
                              color: colors.textPrimary,
                              textTransform: "capitalize",
                              marginTop: 1,
                            }}
                            numberOfLines={1}
                          >
                            {job.required_time_slot}
                          </Text>
                        </View>
                      </View>
                    ) : location ? (
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: colors.bgSurface,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 9,
                          borderWidth: 1,
                          borderColor: colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            backgroundColor: "rgba(239,68,68,0.12)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FontAwesome name="map-marker" size={11} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 9,
                              fontFamily: "DMSans_600SemiBold",
                              color: colors.textTertiary,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {t("jobs.location")}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "DMSans_700Bold",
                              color: colors.textPrimary,
                              marginTop: 1,
                            }}
                            numberOfLines={1}
                          >
                            {location}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                /* ══ EMPLOYER / DEFAULT VIEW ══ */
                <>
                  {/* Title */}
                  <Text style={{ fontSize: 24, fontFamily: "DMSans_700Bold", color: colors.textPrimary, lineHeight: 32 }}>
                    {job.title}
                  </Text>

                  {/* Meta chips */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {location ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <FontAwesome name="map-marker" size={12} color={colors.textTertiary} />
                        <Text style={{ fontSize: 13, fontFamily: "DMSans_500Medium", color: colors.textSecondary }}>{location}</Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: urgency.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <FontAwesome name={urgency.icon} size={12} color={urgency.color} />
                      <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: urgency.color }}>{urgency.label}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, maxWidth: "100%" }}>
                      <FontAwesome name="clock-o" size={12} color={colors.textTertiary} style={{ marginTop: 2 }} />
                      <View style={{ flexShrink: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "DMSans_600SemiBold", color: colors.textSecondary }}>
                          {postedAtLabel?.relative ?? "—"}
                        </Text>
                        {postedAtLabel?.absolute ? (
                          <Text style={{ fontSize: 11, fontFamily: "DMSans_400Regular", color: colors.textTertiary, marginTop: 2 }}>
                            {postedAtLabel.absolute}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Divider + Description */}
                  <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                  <SectionHeader title={t("jobs.description")} />
                  <Text style={{ fontSize: 15, fontFamily: "DMSans_400Regular", color: colors.textPrimary, lineHeight: 25 }}>
                    {job.description}
                  </Text>

                  {/* Divider + Budget */}
                  <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                  <SectionHeader title={t("jobs.budget")} />
                  <View style={{ alignSelf: "flex-start", backgroundColor: isDark ? "rgba(5,150,105,0.12)" : "rgba(5,150,105,0.08)", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderColor: isDark ? "rgba(5,150,105,0.25)" : "rgba(5,150,105,0.15)", maxWidth: "100%" }}>
                    <FontAwesome name="money" size={14} color="#059669" style={{ marginTop: 2 }} />
                    <View style={{ flexShrink: 1 }}>
                      {budgetAmountStr ? (
                        <>
                          <Text style={{ fontSize: 12, fontFamily: "DMSans_500Medium", color: colors.textTertiary }}>
                            {budgetTypeLabel(job, t)}
                          </Text>
                          <Text style={{ fontSize: 15, fontFamily: "DMSans_700Bold", color: "#059669", marginTop: 4 }}>
                            {budgetAmountStr}
                          </Text>
                        </>
                      ) : (
                        <Text style={{ fontSize: 15, fontFamily: "DMSans_700Bold", color: "#059669" }}>
                          {budgetTypeLabel(job, t)}
                        </Text>
                      )}
                    </View>
                  </View>
                </>
              )}

              {/* ── Schedule (employer only) ── */}
              {!isWorker && (job.required_date || job.required_time_slot) && (
                <>
                  <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                  <SectionHeader title={t("jobs.schedule")} />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {job.required_date && (
                      <View style={{ flex: 1, backgroundColor: colors.bgSurface, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border }}>
                        <FontAwesome name="calendar-check-o" size={18} color="#3B82F6" />
                        <View>
                          <Text style={{ fontSize: 11, fontFamily: "DMSans_500Medium", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>{t("jobs.requiredDate")}</Text>
                          <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.textPrimary, marginTop: 2 }}>
                            {job.required_date_end
                              ? `${formatDDMMYY(job.required_date)} – ${formatDDMMYY(job.required_date_end)}`
                              : formatDDMMYY(job.required_date)}
                          </Text>
                        </View>
                      </View>
                    )}
                    {job.required_time_slot && (
                      <View style={{ flex: 1, backgroundColor: colors.bgSurface, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border }}>
                        <FontAwesome name="clock-o" size={18} color="#8B5CF6" />
                        <View>
                          <Text style={{ fontSize: 11, fontFamily: "DMSans_500Medium", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>{t("jobs.timeSlot")}</Text>
                          <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.textPrimary, marginTop: 2, textTransform: "capitalize" }}>{job.required_time_slot}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* ── Address ── */}
              {job.address_line ? (
                <>
                  <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                  <SectionHeader title={t("jobs.address")} />
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: colors.bgSurface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                    <FontAwesome name="map-marker" size={18} color="#EF4444" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 14, fontFamily: "DMSans_400Regular", color: colors.textPrimary, lineHeight: 22 }}>{job.address_line}</Text>
                  </View>
                </>
              ) : null}

              {/* ── Location Map (always show if any location info exists) ── */}
              {(job.city || job.locality || (job.location?.coordinates && (job.location.coordinates[0] !== 0 || job.location.coordinates[1] !== 0))) ? (() => {
                const locationLabel = [job.address_line, job.locality, job.city].filter(Boolean).join(", ");
                const searchQuery = [job.locality, job.city].filter(Boolean).join(", ");
                // Extract coordinates: prefer location GeoJSON, fall back to lat/lng fields
                const geoLng = job.location?.coordinates?.[0];
                const geoLat = job.location?.coordinates?.[1];
                const mapLat = (geoLat && geoLat !== 0) ? geoLat : job.latitude;
                const mapLng = (geoLng && geoLng !== 0) ? geoLng : job.longitude;
                const hasCoords = mapLat != null && mapLng != null && (mapLat !== 0 || mapLng !== 0);

                const mapHtml = hasCoords
                  ? `
<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* {margin:0;padding:0;box-sizing:border-box;} html,body,#map{width:100%;height:100vh;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map',{zoomControl:false,dragging:false,touchZoom:false,scrollWheelZoom:false,doubleClickZoom:false,attributionControl:false})
      .setView([${mapLat},${mapLng}],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    var icon = L.divIcon({className:'',html:'<div style="width:32px;height:32px;background:#059669;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',iconSize:[32,32],iconAnchor:[16,32]});
    L.marker([${mapLat},${mapLng}],{icon}).addTo(map);
  </script>
</body></html>`
                  : `
<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* {margin:0;padding:0;box-sizing:border-box;} html,body,#map{width:100%;height:100vh;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map',{zoomControl:false,dragging:false,touchZoom:false,scrollWheelZoom:false,doubleClickZoom:false,attributionControl:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    var icon = L.divIcon({className:'',html:'<div style="width:32px;height:32px;background:#059669;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',iconSize:[32,32],iconAnchor:[16,32]});
    fetch('https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1')
      .then(r=>r.json())
      .then(data=>{
        if(data && data[0]){
          var lat=parseFloat(data[0].lat), lng=parseFloat(data[0].lon);
          map.setView([lat,lng],14);
          L.marker([lat,lng],{icon}).addTo(map);
        } else {
          map.setView([20.5937,78.9629],12);
        }
      })
      .catch(()=>{ map.setView([20.5937,78.9629],12); });
  </script>
</body></html>`;

                return (
                  <>
                    <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                    <SectionHeader title={t("jobs.location")} />
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        const q = encodeURIComponent(locationLabel);
                        const url = Platform.OS === "ios"
                          ? `https://maps.apple.com/?q=${q}`
                          : `https://maps.google.com/?q=${q}`;
                        Linking.openURL(url);
                      }}
                      style={{ borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
                    >
                      <WebView
                        style={{ width: "100%", height: 200 }}
                        scrollEnabled={false}
                        pointerEvents="none"
                        originWhitelist={["*"]}
                        source={{ html: mapHtml }}
                      />
                      <View style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        backgroundColor: isDark ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.92)",
                        paddingHorizontal: 14, paddingVertical: 10,
                        flexDirection: "row", alignItems: "center", gap: 8,
                      }}>
                        <FontAwesome name="map-marker" size={14} color="#059669" />
                        <Text style={{ flex: 1, fontSize: 13, fontFamily: "DMSans_500Medium", color: colors.textPrimary }} numberOfLines={1}>
                          {locationLabel}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(5,150,105,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <FontAwesome name="external-link" size={10} color="#059669" />
                          <Text style={{ fontSize: 11, fontFamily: "DMSans_600SemiBold", color: "#059669" }}>
                            {t("jobs.openInMaps")}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                );
              })() : null}

              {/* ── Activity ── */}
              <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)" }}>
                  <FontAwesome name="eye" size={15} color="#3B82F6" />
                  <View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>{job.view_count}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "DMSans_400Regular", color: colors.textTertiary }}>{t("jobs.views")}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)" }}>
                  <FontAwesome name="comments" size={15} color="#8B5CF6" />
                  <View>
                    <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>{job.conversation_count}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "DMSans_400Regular", color: colors.textTertiary }}>{t("jobs.responses")}</Text>
                  </View>
                </View>
              </View>

              {/* ── Posted by ── */}
              {!isOwn && (
                <>
                  <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                  <SectionHeader title={t("jobs.postedBy")} />
                  <View
                    style={{
                      backgroundColor: colors.bgSurface,
                      borderRadius: 18,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.2 : 0.05,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "#059669", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 20, fontFamily: "DMSans_700Bold", color: "#FFF" }}>
                        {(job.posted_by_name || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={{ fontSize: 16, fontFamily: "DMSans_600SemiBold", color: colors.textPrimary }}>
                        {job.posted_by_name || t("chat.user")}
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: colors.textSecondary, marginTop: 2 }}>
                        {t("jobs.jobPoster")}
                      </Text>
                      <View style={{ marginTop: 5 }}>
                        <StarRating avg={job.poster_rating_avg ?? 0} count={job.poster_rating_count ?? 0} colors={colors} />
                      </View>
                    </View>
                  </View>
                </>
              )}

            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* ── Bottom CTA: Hide / Unhide (employer on own job) ── */}
      {!loading && isOwn && (job?.status === "open" || job?.status === "hidden") && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 16 + insets.bottom,
            backgroundColor: colors.bgBase,
            borderTopWidth: 1,
            borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={hideBusy}
            onPress={job.status === "hidden" ? handleUnhide : handleHide}
            style={{
              backgroundColor: job.status === "hidden" ? "#059669" : colors.bgSurface,
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              borderWidth: 1,
              borderColor:
                job.status === "hidden"
                  ? "#059669"
                  : isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.12)",
              opacity: hideBusy ? 0.6 : 1,
            }}
          >
            {hideBusy ? (
              <ActivityIndicator
                size="small"
                color={job.status === "hidden" ? "#FFF" : colors.textPrimary}
              />
            ) : (
              <FontAwesome
                name={job.status === "hidden" ? "eye" : "eye-slash"}
                size={17}
                color={job.status === "hidden" ? "#FFF" : colors.textPrimary}
              />
            )}
            <Text
              style={{
                fontSize: 16,
                fontFamily: "DMSans_700Bold",
                color: job.status === "hidden" ? "#FFF" : colors.textPrimary,
              }}
            >
              {job.status === "hidden" ? t("jobs.unhideJob") : t("jobs.hideJob")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom CTA ── */}
      {!loading && job?.status === "open" && !isOwn && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 16 + insets.bottom,
            backgroundColor: colors.bgBase,
            borderTopWidth: 1,
            borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              try {
                const token = await getToken();
                const conv = await api<{ id: string }>("/conversations", {
                  method: "POST",
                  token,
                  body: { job_id: jobId },
                });
                router.push(`/chat/${conv.id}`);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : t("common.error");
                showToast(msg, "error");
              }
            }}
            style={{
              backgroundColor: "#059669",
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <FontAwesome name="commenting" size={18} color="#FFF" />
            <Text style={{ fontSize: 16, fontFamily: "DMSans_700Bold", color: "#FFF" }}>
              {t("jobs.messageAboutJob")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
