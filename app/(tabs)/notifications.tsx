import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useNotificationUnread } from "@/contexts/NotificationUnreadContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
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

function SkeletonNotificationItem() {
  return (
    <View className="flex-row items-start px-5 py-4">
      <SkeletonBlock width={40} height={40} radius={8} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="90%" height={11} />
      </View>
      <SkeletonBlock width={8} height={8} radius={4} style={{ marginTop: 8 }} />
    </View>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();
  const { refresh: refreshUnreadBadge } = useNotificationUnread();

  const fetchNotifications = async () => {
    try {
      const token = await getToken();
      const data = await api<Notification[]>("/notifications", { token });
      setNotifications(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id: string) => {
    try {
      const token = await getToken();
      await api(`/notifications/${id}/read`, { method: "PATCH", token });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      refreshUnreadBadge();
    } catch {}
  };

  const handleTap = (item: Notification) => {
    if (!item.is_read) markRead(item.id);
    if (item.reference_type === "job" && item.reference_id) {
      router.push(`/job/${item.reference_id}`);
    } else if (item.reference_type === "conversation" && item.reference_id) {
      router.push(`/chat/${item.reference_id}`);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity
        className={`flex-row items-start px-5 py-4 ${
          !item.is_read ? "bg-primary/[0.03]" : ""
        }`}
        onPress={() => handleTap(item)}
        activeOpacity={0.6}
      >
        <View className="w-10 h-10 rounded-lg items-center justify-center overflow-hidden">
          <Image
            source={require("@/assets/images/icon.png")}
            className="w-10 h-10 rounded-lg"
            resizeMode="cover"
          />
        </View>
        <View className="flex-1 ml-3">
          <Text
            className={`text-body font-sans-medium ${
              item.is_read ? "text-text-secondary" : "text-text-primary"
            }`}
          >
            {item.title}
          </Text>
          <Text className="text-body-sm text-text-tertiary mt-0.5">
            {item.body}
          </Text>
        </View>
        {!item.is_read && (
          <View className="bg-primary w-2 h-2 rounded-full mt-2" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg-base">
        <View className="px-5 pt-14 pb-4">
          <Text className="text-h1 text-text-primary font-sans-bold">
            {t("notifications.title")}
          </Text>
        </View>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonNotificationItem key={i} />
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-base">
      <View className="px-5 pt-14 pb-4">
        <Text className="text-h1 text-text-primary font-sans-bold">
          {t("notifications.title")}
        </Text>
      </View>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => (
          <View className="h-px bg-border mx-5" />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor="#059669"
          />
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <View className="bg-bg-surface w-16 h-16 rounded-full items-center justify-center mb-4">
              <FontAwesome name="bell-slash-o" size={24} color="#4B5563" />
            </View>
            <Text className="text-body text-text-tertiary">
              {t("notifications.noNotifications")}
            </Text>
          </View>
        }
      />
    </View>
  );
}
