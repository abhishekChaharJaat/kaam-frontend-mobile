import { useState, useRef, useCallback, memo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { getCurrentLocation, reverseGeocode, checkLocationPermission } from "@/lib/location";
import { useUserStore } from "@/store/user";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import MapView from "react-native-maps";

interface CenterCoords {
  latitude: number;
  longitude: number;
}

const LocationMap = memo(function LocationMap({
  initialCoords,
  onCenterChanged,
}: {
  initialCoords: CenterCoords;
  onCenterChanged: (coords: CenterCoords) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const userTouched = useRef(false);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: initialCoords.latitude,
          longitude: initialCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPanDrag={() => { userTouched.current = true; }}
        onRegionChangeComplete={(region) => {
          if (!userTouched.current) return;
          userTouched.current = false;
          onCenterChanged({ latitude: region.latitude, longitude: region.longitude });
        }}
        showsUserLocation
        showsMyLocationButton={false}
      />
      {/* Fixed center pin */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome
          name="map-marker"
          size={44}
          color="#059669"
          style={{ marginBottom: 44 }}
        />
      </View>
    </View>
  );
});

export default function LocationPermissionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const { setLocation } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [initialCoords, setInitialCoords] = useState<CenterCoords | null>(null);
  const coordsRef = useRef<CenterCoords | null>(null);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onAllowLocation = async () => {
    setLoading(true);
    try {
      const permStatus = await checkLocationPermission();

      if (permStatus === "blocked") {
        Linking.openSettings();
        setLoading(false);
        return;
      }

      const loc = await getCurrentLocation();
      if (loc) {
        coordsRef.current = { latitude: loc.latitude, longitude: loc.longitude };
        setInitialCoords({ latitude: loc.latitude, longitude: loc.longitude });
        setLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city,
          locality: loc.locality,
          state: loc.state,
        });
        setDetected(
          loc.locality
            ? `${loc.locality}, ${loc.city || ""}`
            : loc.city || t("onboarding.locationDetected")
        );
        setShowMap(true);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const onCenterChanged = useCallback((newCoords: CenterCoords) => {
    coordsRef.current = newCoords;

    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const geo = await reverseGeocode(newCoords.latitude, newCoords.longitude);
        setLocation({
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
          city: geo.city,
          locality: geo.locality,
          state: geo.state,
        });
        setDetected(
          geo.locality
            ? `${geo.locality}, ${geo.city || ""}`
            : geo.city || t("onboarding.locationDetected")
        );
      } catch {
      } finally {
        setGeocoding(false);
      }
    }, 500);
  }, [setLocation, t]);

  const onContinue = async () => {
    const c = coordsRef.current;
    if (c) {
      try {
        const token = await getToken();
        const loc = useUserStore.getState().location;
        await api("/users/me", {
          method: "PATCH",
          token,
          body: {
            city: loc?.city || null,
            locality: loc?.locality || null,
            state: loc?.state || null,
            location: {
              type: "Point",
              coordinates: [c.longitude, c.latitude],
            },
          },
        });
      } catch {}
    }
    router.push("/(onboarding)/usage-preference");
  };

  return (
    <View className="flex-1 bg-bg-base">
      {!showMap ? (
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-8">
            <View className="bg-primary-ghost rounded-full p-6 mb-6">
              <FontAwesome name="map-marker" size={48} color="#059669" />
            </View>
            <Text className="text-h1 font-sans-bold text-text-primary text-center mb-2">
              {t("onboarding.enableLocation")}
            </Text>
            <Text className="text-body text-text-secondary text-center">
              {t("onboarding.locationDesc")}
            </Text>
          </View>

          <TouchableOpacity
            className="bg-primary rounded-lg py-4 items-center mb-3"
            onPress={onAllowLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-text-on-primary text-body-lg font-sans-semibold">
                {t("onboarding.allowLocationAccess")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-3"
            onPress={() => router.push("/(onboarding)/usage-preference")}
          >
            <Text className="text-text-tertiary text-body font-sans-medium">
              {t("onboarding.setManuallyLater")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : initialCoords ? (
        <View className="flex-1">
          <View className="pt-14 px-5 pb-3">
            <Text className="text-h2 font-sans-bold text-text-primary mb-1">
              {t("onboarding.confirmLocation")}
            </Text>
            <Text className="text-body-sm text-text-secondary">
              {t("onboarding.moveMapToAdjust")}
            </Text>
          </View>

          <View style={{ flex: 1, marginHorizontal: 20, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
            <LocationMap
              initialCoords={initialCoords}
              onCenterChanged={onCenterChanged}
            />
          </View>

          {/* Detected location label */}
          <View className="px-5 mb-4">
            {geocoding ? (
              <View className="bg-bg-surface rounded-xl px-4 py-3 flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#059669" />
                <Text className="text-body-sm text-text-secondary ml-2">
                  {t("onboarding.detectingLocation")}
                </Text>
              </View>
            ) : detected ? (
              <View className="bg-success-ghost rounded-xl px-4 py-3 flex-row items-center justify-center">
                <FontAwesome name="check-circle" size={16} color="#10B981" />
                <Text className="text-body text-success font-sans-medium ml-2">
                  {detected}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Bottom button */}
          <View className="px-5 pb-8">
            <TouchableOpacity
              className={`rounded-lg py-4 items-center ${geocoding ? "bg-gray-300" : "bg-primary"}`}
              onPress={onContinue}
              disabled={geocoding}
            >
              <Text className={`text-body-lg font-sans-semibold ${geocoding ? "text-gray-500" : "text-text-on-primary"}`}>
                {t("common.continue")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
