import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { SEARCH_RADIUS_OPTIONS } from "@/lib/location";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

type SearchMode = "jobs" | "providers";

interface SearchResult {
  id: string;
  title?: string;
  name?: string;
  headline?: string;
  city?: string;
  locality?: string;
  category_id?: string;
  urgency?: string;
  rating_avg?: number;
  is_available?: boolean;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("jobs");
  const [radius, setRadius] = useState(10);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();

  const search = async () => {
    if (!query.trim() && mode === "jobs") {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      let endpoint: string;
      if (mode === "jobs") {
        endpoint = `/jobs?limit=30`;
      } else {
        endpoint = `/service-profiles/search?limit=30&radius_km=${radius}`;
      }
      const data = await api<SearchResult[]>(endpoint, { token });
      setResults(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      search();
    }, 400);
    return () => clearTimeout(timer);
  }, [query, mode, radius]);

  const renderJobResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      className="bg-bg-surface border border-border rounded-xl p-4 mb-3 mx-4"
      onPress={() => router.push(`/job/${item.id}`)}
    >
      <Text className="text-body text-text-primary font-sans-semibold mb-1">
        {item.title}
      </Text>
      <View className="flex-row items-center">
        <FontAwesome name="map-marker" size={12} color="#94A3B8" />
        <Text className="text-caption text-text-secondary ml-1">
          {item.locality ? `${item.locality}, ` : ""}
          {item.city || t("common.unknown")}
        </Text>
        {item.urgency && (
          <>
            <Text className="text-caption text-text-secondary mx-1">•</Text>
            <Text className="text-caption text-text-secondary capitalize">
              {item.urgency}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderProviderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      className="bg-bg-surface border border-border rounded-xl p-4 mb-3 mx-4"
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <View className="flex-row items-center">
        <View className="bg-primary/10 w-10 h-10 rounded-full items-center justify-center">
          <FontAwesome name="user" size={18} color="#059669" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-body text-text-primary font-sans-semibold">
            {item.name || item.headline || t("search.serviceProviders")}
          </Text>
          {item.headline && (
            <Text className="text-caption text-text-secondary" numberOfLines={1}>
              {item.headline}
            </Text>
          )}
        </View>
        {item.rating_avg !== undefined && item.rating_avg > 0 && (
          <View className="flex-row items-center">
            <FontAwesome name="star" size={12} color="#F59E0B" />
            <Text className="text-caption text-text-secondary ml-1">
              {item.rating_avg.toFixed(1)}
            </Text>
          </View>
        )}
        {item.is_available && (
          <View className="bg-success/10 px-2 py-0.5 rounded-full ml-2">
            <Text className="text-caption text-success">{t("search.available")}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-bg-base pt-12">
      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-bg-surface border border-border rounded-xl px-4">
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} className="mr-2">
            <FontAwesome name="arrow-left" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <FontAwesome name="search" size={16} color="#94A3B8" />
          <TextInput
            className="flex-1 py-3 px-3 text-body text-text-primary"
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.searchPlaceholder")}
            placeholderTextColor="#94A3B8"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <FontAwesome name="times-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="flex-row px-4 mb-4">
        <TouchableOpacity
          className={`flex-1 py-2 items-center rounded-l-lg border ${
            mode === "jobs"
              ? "bg-primary border-primary"
              : "bg-bg-surface border-border"
          }`}
          onPress={() => setMode("jobs")}
        >
          <Text
            className={`text-body-sm font-sans-medium ${
              mode === "jobs" ? "text-text-on-primary" : "text-text-secondary"
            }`}
          >
            {t("search.jobs")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 items-center rounded-r-lg border ${
            mode === "providers"
              ? "bg-primary border-primary"
              : "bg-bg-surface border-border"
          }`}
          onPress={() => setMode("providers")}
        >
          <Text
            className={`text-body-sm font-sans-medium ${
              mode === "providers"
                ? "text-text-on-primary"
                : "text-text-secondary"
            }`}
          >
            {t("search.serviceProviders")}
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "providers" && (
        <View className="flex-row px-4 mb-4">
          {SEARCH_RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              className={`mr-2 px-3 py-1.5 rounded-full border ${
                radius === opt.value
                  ? "bg-primary border-primary"
                  : "bg-bg-surface border-border"
              }`}
              onPress={() => setRadius(opt.value)}
            >
              <Text
                className={`text-caption ${
                  radius === opt.value
                    ? "text-text-on-primary"
                    : "text-text-secondary"
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#059669" className="mt-8" />
      ) : (
        <FlatList
          data={results}
          renderItem={mode === "jobs" ? renderJobResult : renderProviderResult}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center py-12">
              <FontAwesome name="search" size={40} color="#94A3B8" />
              <Text className="text-body text-text-secondary mt-3">
                {query ? t("search.noResults") : t("search.startSearching")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
