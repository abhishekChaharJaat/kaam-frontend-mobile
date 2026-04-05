import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

interface UserProfile {
  id: string;
  full_name: string;
  city?: string;
  locality?: string;
  rating_avg: number;
  rating_count: number;
  headline?: string;
  experience_years?: number;
  jobs_completed: number;
  skills: string[];
  created_at?: string;
}

interface Review {
  id: string;
  job_id: string;
  reviewer_user_id: string;
  reviewer_name?: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

const AVATAR_COLORS = [
  "#059669", "#3B82F6", "#8B5CF6", "#EC4899",
  "#F59E0B", "#EF4444", "#14B8A6", "#6366F1",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon: React.ComponentProps<typeof FontAwesome>["name"] =
          rating >= star ? "star" : rating >= star - 0.5 ? "star-half-full" : "star-o";
        return <FontAwesome key={star} name={icon} size={size} color="#F59E0B" />;
      })}
    </View>
  );
}

function ReviewCard({
  review,
  index,
  colors,
  isDark,
}: {
  review: Review;
  index: number;
  colors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const reviewerInitial = (review.reviewer_name || "U").charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(review.reviewer_name || "U");

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        backgroundColor: colors.bgSurface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: avatarColor,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text
            style={{ fontSize: 15, fontFamily: "DMSans_700Bold", color: "#FFF" }}
          >
            {reviewerInitial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "DMSans_600SemiBold",
              color: colors.textPrimary,
            }}
          >
            {review.reviewer_name || "Anonymous"}
          </Text>
          {review.created_at && (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "DMSans_400Regular",
                color: colors.textTertiary,
                marginTop: 1,
              }}
            >
              {formatTimeAgo(review.created_at)}
            </Text>
          )}
        </View>
        <StarRow rating={review.rating} size={12} />
      </View>
      {review.comment && (
        <Text
          style={{
            fontSize: 14,
            fontFamily: "DMSans_400Regular",
            color: colors.textSecondary,
            lineHeight: 20,
          }}
        >
          {review.comment}
        </Text>
      )}
    </Animated.View>
  );
}

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const isDark = colors.bgBase === "#0A0F1A";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const [userData, reviewsData] = await Promise.all([
          api<UserProfile>(`/users/${userId}`, { token }),
          api<Review[]>(`/reviews/user/${userId}`, { token }),
        ]);
        setProfile(userData);
        setReviews(reviewsData);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgBase,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgBase,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome name="user-times" size={40} color={colors.textTertiary} />
        <Text
          style={{
            fontSize: 16,
            fontFamily: "DMSans_500Medium",
            color: colors.textSecondary,
            marginTop: 12,
          }}
        >
          {t("common.userNotFound", { defaultValue: "User not found" })}
        </Text>
      </View>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarColor = getAvatarColor(profile.full_name);
  const location = [profile.locality, profile.city].filter(Boolean).join(", ");
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...ratingDistribution.map((d) => d.count), 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Header */}
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
        >
          {t("profile.workerProfile", { defaultValue: "Worker Profile" })}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Profile Hero */}
          <View style={{ alignItems: "center", paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: avatarColor,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: avatarColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text
                style={{ fontSize: 28, fontFamily: "DMSans_700Bold", color: "#FFF" }}
              >
                {initials}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 22,
                fontFamily: "DMSans_700Bold",
                color: colors.textPrimary,
                marginTop: 16,
              }}
            >
              {profile.full_name}
            </Text>

            {profile.headline && (
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "DMSans_400Regular",
                  color: colors.textSecondary,
                  marginTop: 4,
                  textAlign: "center",
                  paddingHorizontal: 20,
                }}
              >
                {profile.headline}
              </Text>
            )}

            {/* Rating + Location row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: isDark ? "rgba(245,158,11,0.1)" : "#FEF3C7",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <FontAwesome name="star" size={12} color="#F59E0B" />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "DMSans_600SemiBold",
                    color: "#F59E0B",
                  }}
                >
                  {profile.rating_avg.toFixed(1)} ({profile.rating_count})
                </Text>
              </View>

              {location ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <FontAwesome name="map-marker" size={12} color={colors.textTertiary} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "DMSans_500Medium",
                      color: colors.textSecondary,
                    }}
                  >
                    {location}
                  </Text>
                </View>
              ) : null}

              {memberSince && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <FontAwesome name="calendar" size={11} color={colors.textTertiary} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "DMSans_500Medium",
                      color: colors.textSecondary,
                    }}
                  >
                    {memberSince}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Cards */}
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? "rgba(5,150,105,0.08)" : "#D1FAE5",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "DMSans_700Bold",
                  color: "#059669",
                }}
              >
                {profile.jobs_completed}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_500Medium",
                  color: "#059669",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("profile.jobsDone", { defaultValue: "Jobs Done" })}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? "rgba(245,158,11,0.08)" : "#FEF3C7",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "DMSans_700Bold",
                  color: "#F59E0B",
                }}
              >
                {profile.rating_avg.toFixed(1)}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_500Medium",
                  color: "#F59E0B",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("profile.avgRating", { defaultValue: "Avg Rating" })}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? "rgba(59,130,246,0.08)" : "#DBEAFE",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "DMSans_700Bold",
                  color: "#3B82F6",
                }}
              >
                {profile.experience_years ?? 0}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_500Medium",
                  color: "#3B82F6",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("profile.yearsExp", { defaultValue: "Years Exp" })}
              </Text>
            </View>
          </View>

          {/* Skills */}
          {profile.skills.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans_600SemiBold",
                  color: colors.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                {t("profile.skills", { defaultValue: "Skills" })}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {profile.skills.map((skill) => (
                  <View
                    key={skill}
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: "DMSans_500Medium",
                        color: colors.textPrimary,
                      }}
                    >
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rating Breakdown */}
          <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "DMSans_600SemiBold",
                color: colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 14,
              }}
            >
              {t("profile.ratingBreakdown", { defaultValue: "Rating Breakdown" })}
            </Text>
            <View
              style={{
                backgroundColor: colors.bgSurface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 40,
                    fontFamily: "DMSans_700Bold",
                    color: colors.textPrimary,
                    marginRight: 14,
                  }}
                >
                  {profile.rating_avg.toFixed(1)}
                </Text>
                <View>
                  <StarRow rating={profile.rating_avg} size={16} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "DMSans_400Regular",
                      color: colors.textTertiary,
                      marginTop: 4,
                    }}
                  >
                    {profile.rating_count} {t("profile.reviewsLabel", { defaultValue: "reviews" })}
                  </Text>
                </View>
              </View>

              {ratingDistribution.map((item) => (
                <View
                  key={item.star}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      width: 14,
                      fontSize: 12,
                      fontFamily: "DMSans_600SemiBold",
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    {item.star}
                  </Text>
                  <FontAwesome
                    name="star"
                    size={10}
                    color="#F59E0B"
                    style={{ marginLeft: 4, marginRight: 8 }}
                  />
                  <View
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    }}
                  >
                    <View
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F59E0B",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      width: 24,
                      fontSize: 12,
                      fontFamily: "DMSans_500Medium",
                      color: colors.textTertiary,
                      textAlign: "right",
                      marginLeft: 8,
                    }}
                  >
                    {item.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Reviews List */}
          <View style={{ paddingHorizontal: 20, marginTop: 26 }}>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "DMSans_600SemiBold",
                color: colors.textTertiary,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 14,
              }}
            >
              {t("profile.reviewsTitle", { defaultValue: "Reviews" })} ({reviews.length})
            </Text>

            {reviews.length === 0 ? (
              <View
                style={{
                  backgroundColor: colors.bgSurface,
                  borderRadius: 16,
                  padding: 32,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <FontAwesome name="comment-o" size={24} color={colors.textTertiary} />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "DMSans_500Medium",
                    color: colors.textSecondary,
                  }}
                >
                  {t("profile.noReviews", { defaultValue: "No reviews yet" })}
                </Text>
              </View>
            ) : (
              reviews.map((review, idx) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  index={idx}
                  colors={colors}
                  isDark={isDark}
                />
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
