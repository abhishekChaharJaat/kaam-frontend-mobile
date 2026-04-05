import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface EmptyStateProps {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="bg-bg-surface border border-border w-20 h-20 rounded-full items-center justify-center mb-4">
        <FontAwesome name={icon} size={32} color="#94A3B8" />
      </View>
      <Text className="text-body text-text-primary font-sans-semibold text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text className="text-body-sm text-text-secondary text-center mb-4">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-xl"
          onPress={onAction}
        >
          <Text className="text-body-sm text-text-on-primary font-sans-medium">
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
