import { View, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface Review {
  id: string;
  reviewer_name?: string;
  rating: number;
  comment?: string;
  created_at?: string;
}

interface ReviewsListProps {
  reviews: Review[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <FontAwesome
          key={star}
          name={star <= rating ? "star" : "star-o"}
          size={14}
          color="#F59E0B"
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-body-sm text-text-secondary">No reviews yet</Text>
      </View>
    );
  }

  return (
    <View>
      {reviews.map((review) => (
        <View
          key={review.id}
          className="bg-bg-surface border border-border rounded-xl p-4 mb-3"
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-body font-sans-medium text-text-primary">
              {review.reviewer_name || "Anonymous"}
            </Text>
            <StarRating rating={review.rating} />
          </View>
          {review.comment && (
            <Text className="text-body-sm text-text-secondary">
              {review.comment}
            </Text>
          )}
          {review.created_at && (
            <Text className="text-caption text-text-secondary mt-2">
              {new Date(review.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
