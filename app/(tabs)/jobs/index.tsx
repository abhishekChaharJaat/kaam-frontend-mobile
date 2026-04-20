import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";

interface Job {
  id: string;
  title: string;
  category_id: string;
  budget_type: string;
  budget_min?: number;
  budget_max?: number;
  urgency: string;
  status: string;
  city?: string;
  locality?: string;
  conversation_count: number;
  created_at: string;
}

export default function JobsFeed() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();

  const fetchJobs = async () => {
    try {
      const token = await getToken();
      const data = await api<Job[]>("/jobs", { token });
      setJobs(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const formatBudget = (job: Job) => {
    if (job.budget_type === "discuss") return t("jobs.discuss");
    if (job.budget_min != null && job.budget_max != null) {
      if (job.budget_min === job.budget_max) return `₹${job.budget_min}`;
      return `₹${job.budget_min} - ₹${job.budget_max}`;
    }
    if (job.budget_min != null) return `₹${job.budget_min}+`;
    if (job.budget_type === "negotiable") return t("jobs.negotiable");
    if (job.budget_type === "fixed") return t("jobs.fixedPrice");
    return "";
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg-base items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      className="bg-bg-surface border border-border rounded-xl p-4 mb-3 mx-5"
      onPress={() => router.push(`/job/${item.id}`)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-body-lg text-text-primary font-sans-semibold flex-1 mr-2">
          {item.title}
        </Text>
        <Text className="text-caption text-text-tertiary font-sans-regular">
          {timeAgo(item.created_at)}
        </Text>
        <View
          className={`px-2 py-0.5 rounded-full ${
            item.urgency === "urgent"
              ? "bg-error-ghost"
              : item.urgency === "today"
              ? "bg-warning-ghost"
              : "bg-bg-elevated"
          }`}
        >
          <Text
            className={`text-caption font-sans-medium capitalize ${
              item.urgency === "urgent"
                ? "text-error"
                : item.urgency === "today"
                ? "text-warning"
                : "text-text-tertiary"
            }`}
          >
            {item.urgency}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <FontAwesome name="map-marker" size={12} color="#6B7280" />
        <Text className="text-body-sm text-text-secondary ml-1.5">
          {item.locality ? `${item.locality}, ` : ""}
          {item.city || t("common.nearby")}
        </Text>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-body-sm text-primary font-sans-semibold">
          {formatBudget(item)}
        </Text>
        <View className="flex-row items-center">
          <FontAwesome name="comments-o" size={12} color="#6B7280" />
          <Text className="text-caption text-text-tertiary ml-1">
            {item.conversation_count}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="flex-row justify-between items-center px-5 mb-4">
        <Text className="text-h3 text-text-primary font-sans-bold">
          {t("jobs.nearbyJobs")}
        </Text>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <FontAwesome name="briefcase" size={40} color="#9CA3AF" />
            <Text className="text-body text-text-secondary mt-3">
              {t("jobs.noJobsNearby")}
            </Text>
          </View>
        }
      />
    </View>
  );
}
