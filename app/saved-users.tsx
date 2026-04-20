import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";

interface SavedUser {
  id: string;
  saved_user_id: string;
  full_name: string;
  profile_photo_url?: string;
  city?: string;
}

export default function SavedUsersScreen() {
  const [users, setUsers] = useState<SavedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const data = await api<SavedUser[]>("/saved-users", { token });
        setUsers(data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUnsave = async (id: string) => {
    try {
      const token = await getToken();
      await api(`/saved-users/${id}`, { method: "DELETE", token });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg-base items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="flex-row items-center px-4 mb-4">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          className="w-[38px] h-[38px] rounded-full bg-bg-surface border border-border items-center justify-center mr-3.5 shadow-sm"
        >
          <FontAwesome name="chevron-left" size={15} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-h3 text-text-primary font-sans-bold">
          Saved Users
        </Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-b border-border"
            onPress={() => router.push(`/user/${item.saved_user_id}`)}
          >
            <View className="bg-primary/10 w-12 h-12 rounded-full items-center justify-center">
              <FontAwesome name="user" size={20} color="#059669" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-body font-sans-medium text-text-primary">
                {item.full_name}
              </Text>
              {item.city && (
                <Text className="text-caption text-text-secondary">
                  {item.city}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleUnsave(item.id)}
              className="p-2"
            >
              <FontAwesome name="heart" size={18} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <FontAwesome name="heart-o" size={40} color="#94A3B8" />
            <Text className="text-body text-text-secondary mt-3">
              No saved users
            </Text>
          </View>
        }
      />
    </View>
  );
}
