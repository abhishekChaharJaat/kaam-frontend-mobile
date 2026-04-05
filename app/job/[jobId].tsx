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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";
import { useToast } from "@/lib/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  posted_by_user_id: string;
  posted_by_clerk_id?: string;
  posted_by_name?: string;
  poster_rating_avg?: number;
  poster_rating_count?: number;
  images: string[];
  required_date?: string;
  required_time_slot?: string;
  view_count: number;
  conversation_count: number;
  created_at: string;
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

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
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
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const isDark = colors.bgBase === "#0A0F1A";
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await api<JobDetail>(`/jobs/${jobId}`, { token });
        setJob(data);
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

  const formatBudget = () => {
    if (!job) return "";
    if (job.budget_type === "negotiable") return t("jobs.negotiable");
    if (job.budget_type === "discuss") return t("jobs.discuss");
    if (job.budget_min && job.budget_max)
      return `₹${job.budget_min.toLocaleString()} - ₹${job.budget_max.toLocaleString()}`;
    if (job.budget_min) return `₹${job.budget_min.toLocaleString()}+`;
    return t("jobs.notSpecified");
  };

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
  const status = STATUS_CONFIG[job?.status ?? "open"] || STATUS_CONFIG.open;
  const location = [job?.locality, job?.city].filter(Boolean).join(", ");
  const isOwn = job?.posted_by_clerk_id === user?.id;

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
          onPress={() => router.back()}
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
          {loading ? t("jobs.jobDetail") : (job?.title ?? t("jobs.jobDetail"))}
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
              {job.status}
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
          contentContainerStyle={{ paddingBottom: isOwn ? 30 + insets.bottom : 100 + insets.bottom }}
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

              {/* ── Title ── */}
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "DMSans_700Bold",
                  color: colors.textPrimary,
                  lineHeight: 32,
                }}
              >
                {job.title}
              </Text>

              {/* ── Meta chips ── */}
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <FontAwesome name="clock-o" size={12} color={colors.textTertiary} />
                  <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.textSecondary }}>{formatTimeAgo(job.created_at)}</Text>
                </View>
              </View>

              {/* ── Divider ── */}
              <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />

              {/* ── Description ── */}
              <SectionHeader title={t("jobs.description")} />
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "DMSans_400Regular",
                  color: colors.textPrimary,
                  lineHeight: 25,
                }}
              >
                {job.description}
              </Text>

              {/* ── Divider ── */}
              <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />

              {/* ── Budget ── */}
              <SectionHeader title={t("jobs.budget")} />
              <View
                style={{
                  backgroundColor: isDark ? "rgba(5,150,105,0.1)" : "rgba(5,150,105,0.06)",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(5,150,105,0.2)" : "rgba(5,150,105,0.12)",
                }}
              >
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <FontAwesome name="money" size={20} color="#FFF" />
                </View>
                <Text style={{ fontSize: 22, fontFamily: "DMSans_700Bold", color: "#059669" }}>
                  {formatBudget()}
                </Text>
              </View>

              {/* ── Schedule ── */}
              {(job.required_date || job.required_time_slot) && (
                <>
                  <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", marginVertical: 20 }} />
                  <SectionHeader title={t("jobs.schedule")} />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {job.required_date && (
                      <View style={{ flex: 1, backgroundColor: colors.bgSurface, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border }}>
                        <FontAwesome name="calendar-check-o" size={18} color="#3B82F6" />
                        <View>
                          <Text style={{ fontSize: 11, fontFamily: "DMSans_500Medium", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 }}>{t("jobs.requiredDate")}</Text>
                          <Text style={{ fontSize: 14, fontFamily: "DMSans_600SemiBold", color: colors.textPrimary, marginTop: 2 }}>{job.required_date}</Text>
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
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/user/${job.posted_by_user_id}`)}
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
                    <FontAwesome name="chevron-right" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </>
              )}

            </View>
          </Animated.View>
        </ScrollView>
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
