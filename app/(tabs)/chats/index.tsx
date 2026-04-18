import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useUserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/lib/useThemeColors";

interface Conversation {
  id: string;
  job_id: string;
  job_title?: string;
  poster_user_id: string;
  poster_name?: string;
  responder_user_id: string;
  responder_name?: string;
  last_message_text?: string;
  last_message_at?: string;
  unread_count_poster: number;
  unread_count_responder: number;
  is_assigned: boolean;
  is_disabled: boolean;
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

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ConversationCard({
  item,
  index,
  onPress,
  otherName,
  unread,
  colors,
  isDark,
  t,
}: {
  item: Conversation;
  index: number;
  onPress: () => void;
  otherName: string;
  unread: number;
  colors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
  t: (key: string) => string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initial = otherName[0]?.toUpperCase() || "U";
  const avatarColor = getAvatarColor(otherName);
  const timeLabel = formatTime(item.last_message_at);
  const hasUnread = unread > 0;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.65}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          opacity: item.is_disabled ? 0.4 : 1,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: `${avatarColor}18`,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: "DMSans_700Bold",
              color: avatarColor,
            }}
          >
            {initial}
          </Text>
          {hasUnread && (
            <View
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#059669",
                borderWidth: 2,
                borderColor: colors.bgBase,
              }}
            />
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 15,
                fontFamily: hasUnread ? "DMSans_700Bold" : "DMSans_600SemiBold",
                color: colors.textPrimary,
                flex: 1,
                marginRight: 8,
              }}
            >
              {otherName}
            </Text>
            {timeLabel !== "" && (
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_500Medium",
                  color: hasUnread ? "#059669" : colors.textTertiary,
                }}
              >
                {timeLabel}
              </Text>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                marginRight: 8,
              }}
            >
              <FontAwesome
                name="briefcase"
                size={10}
                color={isDark ? "#4B5563" : "#9CA3AF"}
                style={{ marginRight: 5 }}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans_400Regular",
                  color: colors.textSecondary,
                  flex: 1,
                }}
              >
                {item.job_title || t("chat.chat")}
              </Text>
            </View>

            {hasUnread && (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#059669",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "DMSans_700Bold",
                    color: "#FFFFFF",
                  }}
                >
                  {unread}
                </Text>
              </View>
            )}
          </View>

          {item.is_assigned && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <FontAwesome name="check-circle" size={10} color="#10B981" />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "DMSans_500Medium",
                  color: "#10B981",
                  marginLeft: 4,
                }}
              >
                {t("chat.assignedLabel")}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ChatSkeleton({ colors, isDark }: { colors: ReturnType<typeof useThemeColors>; isDark: boolean }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const barColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const SkeletonRow = () => (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 }}>
      <Animated.View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: barColor, opacity }} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Animated.View style={{ width: 120, height: 14, borderRadius: 7, backgroundColor: barColor, opacity }} />
          <Animated.View style={{ width: 28, height: 10, borderRadius: 5, backgroundColor: barColor, opacity }} />
        </View>
        <Animated.View style={{ width: 180, height: 12, borderRadius: 6, backgroundColor: barColor, opacity, marginTop: 8 }} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i}>
          <SkeletonRow />
          {i < 7 && (
            <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", marginLeft: 84, marginRight: 20 }} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function ChatList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getToken } = useAuth();
  const { usagePreference } = useUserStore();
  const isEmployer = usagePreference === "find_worker";
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isDark = colors.bgBase === "#0A0F1A";

  const [activeTab, setActiveTab] = useState<"poster" | "responder">(
    "responder"
  );
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const me = await api<{ id: string }>("/auth/me", { token });
        setMyUserId(me.id);
      } catch {}
    })();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = await getToken();
      const roleParam = isEmployer ? "" : `?role=${activeTab}`;
      const data = await api<Conversation[]>(
        `/conversations${roleParam}`,
        { token }
      );
      setConversations(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchConversations();
  }, [activeTab, isEmployer]);

  const getOtherName = (conv: Conversation) => {
    if (isEmployer) {
      if (myUserId && conv.poster_user_id === myUserId) {
        return conv.responder_name || t("chat.user");
      }
      return conv.poster_name || t("chat.user");
    }
    return activeTab === "poster"
      ? conv.responder_name || t("chat.user")
      : conv.poster_name || t("chat.user");
  };

  const getUnreadCount = (conv: Conversation) => {
    if (isEmployer) {
      if (myUserId && conv.poster_user_id === myUserId) {
        return conv.unread_count_poster;
      }
      return conv.unread_count_responder;
    }
    return activeTab === "poster"
      ? conv.unread_count_poster
      : conv.unread_count_responder;
  };

  const renderConversation = ({
    item,
    index,
  }: {
    item: Conversation;
    index: number;
  }) => (
    <ConversationCard
      item={item}
      index={index}
      onPress={() => router.push(`/chat/${item.id}`)}
      otherName={getOtherName(item)}
      unread={getUnreadCount(item)}
      colors={colors}
      isDark={isDark}
      t={t}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 56 : 44,
          paddingBottom: 12,
          paddingHorizontal: 20,
          backgroundColor: colors.bgBase,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontFamily: "DMSans_700Bold",
            color: colors.textPrimary,
            marginBottom: isEmployer ? 0 : 14,
          }}
        >
          {t("chat.chats")}
        </Text>

        {/* Segmented Control (worker only) */}
        {!isEmployer && (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              borderRadius: 12,
              padding: 3,
            }}
          >
            {(
              [
                { key: "poster" as const, label: t("chat.findingWorker") },
                { key: "responder" as const, label: t("chat.findingWork") },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    alignItems: "center",
                    borderRadius: 10,
                    backgroundColor: isActive ? "#059669" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "DMSans_600SemiBold",
                      color: isActive
                        ? "#FFFFFF"
                        : colors.textTertiary,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <ChatSkeleton colors={colors} isDark={isDark} />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingBottom: 100,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.04)",
                marginLeft: 84,
                marginRight: 20,
              }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
              }}
              tintColor="#059669"
            />
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 60,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <FontAwesome
                  name="comments-o"
                  size={28}
                  color={colors.textTertiary}
                />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "DMSans_600SemiBold",
                  color: colors.textSecondary,
                  marginBottom: 6,
                }}
              >
                {t("chat.noConversations")}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans_400Regular",
                  color: colors.textTertiary,
                  textAlign: "center",
                  paddingHorizontal: 40,
                  lineHeight: 19,
                }}
              >
                {t("chat.noConversationsHint")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
