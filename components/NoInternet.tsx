import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface NoInternetProps {
  onRetry?: () => void;
}

export function NoInternet({ onRetry }: NoInternetProps) {
  return (
    <View className="flex-1 bg-bg-base items-center justify-center px-8">
      <View className="bg-warning/10 w-20 h-20 rounded-full items-center justify-center mb-4">
        <FontAwesome name="wifi" size={32} color="#F59E0B" />
      </View>
      <Text className="text-body text-text-primary font-sans-semibold text-center mb-2">
        No Internet Connection
      </Text>
      <Text className="text-body-sm text-text-secondary text-center mb-6">
        Please check your internet connection and try again.
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl"
          onPress={onRetry}
        >
          <Text className="text-body-sm text-text-on-primary font-sans-medium">
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
