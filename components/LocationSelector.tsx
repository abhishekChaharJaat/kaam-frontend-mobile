import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getCurrentLocation, LocationResult } from "@/lib/location";

interface LocationSelectorProps {
  onLocationSelected: (location: LocationResult) => void;
  currentCity?: string;
  currentLocality?: string;
}

export function LocationSelector({
  onLocationSelected,
  currentCity,
  currentLocality,
}: LocationSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState(currentCity || "");
  const [locality, setLocality] = useState(currentLocality || "");
  const [mode, setMode] = useState<"gps" | "manual">("gps");

  const onDetectGPS = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        setCity(loc.city || "");
        setLocality(loc.locality || "");
        onLocationSelected(loc);
      }
    } finally {
      setLoading(false);
    }
  };

  const onManualSave = () => {
    if (city.trim()) {
      onLocationSelected({
        latitude: 0,
        longitude: 0,
        city: city.trim(),
        locality: locality.trim() || undefined,
      });
    }
  };

  return (
    <View>
      <View className="flex-row mb-4">
        <TouchableOpacity
          className={`flex-1 py-2 items-center rounded-l-lg border ${
            mode === "gps"
              ? "bg-primary border-primary"
              : "bg-bg-surface border-border"
          }`}
          onPress={() => setMode("gps")}
        >
          <Text
            className={`text-body-sm font-sans-medium ${
              mode === "gps" ? "text-text-on-primary" : "text-text-secondary"
            }`}
          >
            GPS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 items-center rounded-r-lg border ${
            mode === "manual"
              ? "bg-primary border-primary"
              : "bg-bg-surface border-border"
          }`}
          onPress={() => setMode("manual")}
        >
          <Text
            className={`text-body-sm font-sans-medium ${
              mode === "manual" ? "text-text-on-primary" : "text-text-secondary"
            }`}
          >
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "gps" ? (
        <TouchableOpacity
          className="bg-bg-surface border border-border rounded-lg p-4 flex-row items-center justify-center"
          onPress={onDetectGPS}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#059669" />
          ) : (
            <>
              <FontAwesome name="crosshairs" size={18} color="#059669" />
              <Text className="text-primary text-body font-sans-medium ml-2">
                {city ? `${city}${locality ? `, ${locality}` : ""}` : "Detect My Location"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View>
          <View className="mb-3">
            <Text className="text-body-sm text-text-secondary mb-1">City</Text>
            <TextInput
              className="bg-bg-surface border border-border rounded-lg px-4 py-3 text-body text-text-primary"
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Mathura"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View className="mb-3">
            <Text className="text-body-sm text-text-secondary mb-1">
              Area / Locality
            </Text>
            <TextInput
              className="bg-bg-surface border border-border rounded-lg px-4 py-3 text-body text-text-primary"
              value={locality}
              onChangeText={setLocality}
              placeholder="e.g. Krishna Nagar"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 items-center"
            onPress={onManualSave}
            disabled={!city.trim()}
          >
            <Text className="text-text-on-primary text-body font-sans-semibold">
              Save Location
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
