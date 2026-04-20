import { useState, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Keyboard,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ExpoLocation from "expo-location";
import MapView from "react-native-maps";
import { reverseGeocode } from "@/lib/location";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

interface LocationPickerModalProps {
  visible: boolean;
  initialCoords: { latitude: number; longitude: number } | null;
  initialLabel?: string | null;
  onClose: () => void;
  onConfirm: (coords: { latitude: number; longitude: number }, geo: { city?: string; locality?: string; state?: string }) => void;
  saving?: boolean;
}

const LocationMap = memo(function LocationMap({
  initialCoords,
  onCenterChanged,
  mapRef,
}: {
  initialCoords: { latitude: number; longitude: number };
  onCenterChanged: (coords: { latitude: number; longitude: number }) => void;
  mapRef: React.RefObject<MapView | null>;
}) {
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
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome name="map-marker" size={44} color="#059669" style={{ marginBottom: 44 }} />
      </View>
    </View>
  );
});

export default function LocationPickerModal({
  visible,
  initialCoords,
  initialLabel,
  onClose,
  onConfirm,
  saving = false,
}: LocationPickerModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isDark = colors.bgBase === "#0A0F1A";

  const mapRef = useRef<MapView>(null);
  const coordsRef = useRef(initialCoords);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mapLabel, setMapLabel] = useState<string | null>(initialLabel || null);
  const [geocoding, setGeocoding] = useState(false);
  const [pincode, setPincode] = useState("");
  const [pincodeSearching, setPincodeSearching] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  // Keep coordsRef in sync with initialCoords when modal opens
  if (initialCoords && (!coordsRef.current || coordsRef.current.latitude !== initialCoords.latitude || coordsRef.current.longitude !== initialCoords.longitude)) {
    coordsRef.current = initialCoords;
  }

  const onMapCenterChanged = useCallback((newCoords: { latitude: number; longitude: number }) => {
    coordsRef.current = newCoords;
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const geo = await reverseGeocode(newCoords.latitude, newCoords.longitude);
        setMapLabel(
          geo.locality ? `${geo.locality}, ${geo.city || ""}` : geo.city || t("onboarding.locationDetected")
        );
      } catch {} finally {
        setGeocoding(false);
      }
    }, 500);
  }, [t]);

  const onPincodeSearch = async () => {
    const trimmed = pincode.trim();
    if (trimmed.length < 4) return;
    Keyboard.dismiss();
    setPincodeSearching(true);
    setPincodeError(null);
    try {
      const results = await ExpoLocation.geocodeAsync(`${trimmed}, India`);
      if (results.length === 0) {
        setPincodeError(t("onboarding.pincodeNotFound"));
        return;
      }
      const { latitude, longitude } = results[0];
      coordsRef.current = { latitude, longitude };
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
      const geo = await reverseGeocode(latitude, longitude);
      setMapLabel(geo.locality ? `${geo.locality}, ${geo.city || ""}` : geo.city || t("onboarding.locationDetected"));
    } catch {
      setPincodeError(t("onboarding.pincodeNotFound"));
    } finally {
      setPincodeSearching(false);
    }
  };

  const handleConfirm = async () => {
    const c = coordsRef.current;
    if (!c) return;
    const geo = await reverseGeocode(c.latitude, c.longitude);
    onConfirm(c, geo);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
        {/* Header */}
        <View style={{ paddingTop: Platform.OS === "ios" ? 56 : 16, paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="chevron-left" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
              {t("settings.updateLocation")}
            </Text>
            <View style={{ width: 18 }} />
          </View>
          <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.textSecondary, textAlign: "center" }}>
            {t("onboarding.moveMapToAdjust")}
          </Text>

          {/* Pincode search */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 }}>
            <View style={{
              flex: 1,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
              paddingHorizontal: 14,
              height: 44,
              justifyContent: "center",
            }}>
              <TextInput
                placeholder={t("onboarding.enterPincode")}
                placeholderTextColor={colors.textTertiary}
                value={pincode}
                onChangeText={(text) => { setPincode(text.replace(/[^0-9]/g, "")); setPincodeError(null); }}
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="search"
                onSubmitEditing={onPincodeSearch}
                style={{ fontSize: 14, fontFamily: "DMSans_500Medium", color: colors.textPrimary }}
              />
            </View>
            <TouchableOpacity
              onPress={onPincodeSearch}
              disabled={pincodeSearching || pincode.trim().length < 4}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: pincode.trim().length >= 4 ? "#059669" : (isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB"),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pincodeSearching ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <FontAwesome name="search" size={16} color={pincode.trim().length >= 4 ? "#FFF" : colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
          {pincodeError && (
            <Text style={{ fontSize: 12, fontFamily: "DMSans_400Regular", color: "#EF4444", marginTop: 4 }}>{pincodeError}</Text>
          )}
        </View>

        {/* Map */}
        {initialCoords && (
          <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
            <LocationMap
              initialCoords={initialCoords}
              onCenterChanged={onMapCenterChanged}
              mapRef={mapRef}
            />
          </View>
        )}

        {/* Location label */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          {geocoding ? (
            <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.textSecondary, marginLeft: 8 }}>
                {t("onboarding.detectingLocation")}
              </Text>
            </View>
          ) : mapLabel ? (
            <View style={{ backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <FontAwesome name="check-circle" size={16} color="#10B981" />
              <Text style={{ fontSize: 14, fontFamily: "DMSans_500Medium", color: "#10B981", marginLeft: 8 }}>
                {mapLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Confirm button */}
        <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 20 }}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={geocoding || saving}
            activeOpacity={0.8}
            style={{
              backgroundColor: geocoding || saving ? "#D1D5DB" : "#059669",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ fontSize: 16, fontFamily: "DMSans_600SemiBold", color: "#FFF" }}>
                {t("settings.confirmLocation")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
