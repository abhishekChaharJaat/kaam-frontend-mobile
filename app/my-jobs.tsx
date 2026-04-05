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
import { useTranslation } from "react-i18next";

interface Job {
  id: string;
  title: string;
  status: string;
  urgency: string;
  city?: string;
  locality?: string;
  conversation_count: number;
  created_at: string;
}

const STATUS_TABS = ["open", "assigned", "completed", "cancelled"];

export default function MyJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("open");
  const { getToken } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();

  const fetchJobs = async (status: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api<Job[]>(`/jobs/mine?status=${status}`, { token });
      setJobs(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(activeTab);
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-success";
      case "assigned":
        return "text-primary";
      case "completed":
        return "text-text-secondary";
      case "cancelled":
        return "text-error";
      default:
        return "text-text-secondary";
    }
  };

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      className="bg-bg-surface border border-border rounded-xl p-4 mb-3 mx-4"
      onPress={() => router.push(`/job/${item.id}`)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-body text-text-primary font-sans-semibold flex-1 mr-2">
          {item.title}
        </Text>
        <Text className={`text-caption font-sans-medium capitalize ${getStatusColor(item.status)}`}>
          {item.status}
        </Text>
      </View>
      <View className="flex-row items-center">
        <FontAwesome name="comments-o" size={12} color="#94A3B8" />
        <Text className="text-caption text-text-secondary ml-1">
          {item.conversation_count} {t("jobs.responses").toLowerCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="flex-row items-center px-4 mb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-h3 text-text-primary font-sans-bold">
          {t("jobs.myJobs")}
        </Text>
      </View>

      <View className="flex-row px-4 mb-4">
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`mr-2 px-3 py-2 rounded-lg ${
              activeTab === tab ? "bg-primary" : "bg-bg-surface"
            }`}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              className={`text-body-sm capitalize ${
                activeTab === tab ? "text-text-on-primary" : "text-text-secondary"
              }`}
            >
              {t(`jobs.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" className="mt-8" />
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center py-12">
              <FontAwesome name="folder-open-o" size={40} color="#94A3B8" />
              <Text className="text-body text-text-secondary mt-3">
                {t("jobs.noJobs", { status: activeTab })}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
