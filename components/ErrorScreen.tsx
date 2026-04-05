import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorScreen({
  message = "Something went wrong",
  onRetry,
}: ErrorScreenProps) {
  return (
    <View className="flex-1 bg-bg-base items-center justify-center px-8">
      <View className="bg-error/10 w-20 h-20 rounded-full items-center justify-center mb-4">
        <FontAwesome name="exclamation-triangle" size={32} color="#EF4444" />
      </View>
      <Text className="text-body text-text-primary font-sans-semibold text-center mb-2">
        Oops!
      </Text>
      <Text className="text-body-sm text-text-secondary text-center mb-6">
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl"
          onPress={onRetry}
        >
          <Text className="text-body-sm text-text-on-primary font-sans-medium">
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
