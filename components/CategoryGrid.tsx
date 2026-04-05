import { View, Text, TouchableOpacity, FlatList } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>["name"]> = {
  plumber: "wrench",
  electrician: "bolt",
  carpenter: "cube",
  painter: "paint-brush",
  mason: "building",
  labour: "users",
  "ac-repair": "snowflake-o",
  "ro-repair": "tint",
  cctv: "video-camera",
  welder: "fire",
  "tile-worker": "th-large",
  "pop-false-ceiling": "columns",
  "house-cleaning": "home",
  "appliance-repair": "cogs",
  "pest-control": "bug",
  furniture: "archive",
  borewell: "tint",
  "civil-contractor": "building-o",
  interior: "object-group",
  "packer-mover": "truck",
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryGridProps {
  categories: Category[];
  onSelect: (category: Category) => void;
  columns?: number;
}

export function CategoryGrid({
  categories,
  onSelect,
  columns = 4,
}: CategoryGridProps) {
  const renderItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      className="items-center py-3 flex-1"
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
      style={{ maxWidth: `${100 / columns}%` }}
    >
      <View className="bg-primary-ghost border border-primary/20 rounded-2xl w-14 h-14 items-center justify-center mb-2">
        <FontAwesome
          name={CATEGORY_ICONS[item.slug] || "briefcase"}
          size={20}
          color="#059669"
        />
      </View>
      <Text
        className="text-caption text-text-secondary text-center font-sans-medium"
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={categories}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      scrollEnabled={false}
    />
  );
}
