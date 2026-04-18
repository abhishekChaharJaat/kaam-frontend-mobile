import { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { useThemeStore } from "@/store/theme";
import { useUserStore } from "@/store/user";
import { api } from "@/lib/api";
import { getCurrentLocation, checkLocationPermission, reverseGeocode } from "@/lib/location";
import MapView from "react-native-maps";
import { Platform } from "react-native";
import i18n from "@/i18n";
import { useThemeColors } from "@/lib/useThemeColors";
import { useTranslation } from "react-i18next";

interface CenterCoords {
  latitude: number;
  longitude: number;
}

const SettingsLocationMap = memo(function SettingsLocationMap({
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

const LANG_STORAGE_KEY = "@app_language";

async function persistLang(lang: string) {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

function SettingRow({
  icon,
  title,
  value,
  onPress,
  danger,
  iconBg,
  iconColor,
  textColor,
  subtextColor,
  readonly,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
  textColor: string;
  subtextColor: string;
  readonly?: boolean;
}) {
  const content = (
    <>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          backgroundColor: danger
            ? "rgba(239,68,68,0.1)"
            : iconBg || "rgba(5,150,105,0.1)",
        }}
      >
        <FontAwesome
          name={icon}
          size={15}
          color={danger ? "#EF4444" : iconColor || "#059669"}
        />
      </View>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontFamily: "DMSans_500Medium",
            color: danger ? "#EF4444" : textColor,
          }}
        >
          {title}
        </Text>
      </View>
      {value && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontFamily: "DMSans_400Regular",
            color: subtextColor,
            marginRight: 6,
            flexShrink: 0,
            maxWidth: "45%",
          }}
        >
          {value}
        </Text>
      )}
      {!readonly && (
        <FontAwesome
          name="chevron-right"
          size={11}
          color={danger ? "#EF4444" : subtextColor}
        />
      )}
    </>
  );

  if (readonly) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
      }}
    >
      {content}
    </TouchableOpacity>
  );
}

function SectionCard({
  children,
  isDark,
  bgSurface,
}: {
  children: React.ReactNode;
  isDark: boolean;
  bgSurface: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bgSurface,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 4,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.03)",
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-border" />;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut, getToken } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const colors = useThemeColors();
  const { usagePreference, location, setLocation } = useUserStore();
  const [language, setLanguage] = useState(i18n.language);
  const [loggingOut, setLoggingOut] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [workRangeVisible, setWorkRangeVisible] = useState(false);
  const [workRange, setWorkRange] = useState<number | null>(null);
  const [savingRange, setSavingRange] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLabel, setMapLabel] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const isDark = colors.bgBase === "#0A0F1A";
  const isWorker = usagePreference === "find_work";

  const WORK_RANGE_OPTIONS = [
    { label: "Under 1 km", value: 1 },
    { label: "Under 2 km", value: 2 },
    { label: "2–5 km", value: 5 },
    { label: "5–10 km", value: 10 },
    { label: "10–20 km", value: 20 },
    { label: "20+ km", value: 50 },
    { label: t("settings.inMyCity"), value: 0 },
  ];

  // Load current work range from backend
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const me = await api<{ work_range_km?: number }>("/auth/me", { token });
        if (me.work_range_km != null) setWorkRange(me.work_range_km);
      } catch {}
    })();
  }, []);

  const workRangeLabel = WORK_RANGE_OPTIONS.find((o) => o.value === workRange)?.label || t("settings.notSet");

  const locationLabel = location?.locality
    ? `${location.locality}, ${location.city || ""}`
    : location?.city || t("settings.notSet");

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.multiRemove(["@user_state", "@app_theme", "@app_language"]);
      await signOut();
    } catch {
      setLoggingOut(false);
    }
  };

  const toggleLanguage = async () => {
    const newLang = language === "en" ? "hi" : "en";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    await persistLang(newLang);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("settings.deleteAccount"),
      t("auth.deleteAccountConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              await api("/users/me", { method: "DELETE", token });
              await signOut();
            } catch {}
          },
        },
      ]
    );
  };

  const handleUpdateLocation = async () => {
    setUpdatingLocation(true);
    try {
      const permStatus = await checkLocationPermission();
      if (permStatus === "blocked") {
        Linking.openSettings();
        setUpdatingLocation(false);
        return;
      }
      const loc = await getCurrentLocation();
      if (!loc) {
        setUpdatingLocation(false);
        return;
      }
      // Open map with current GPS position
      mapCoordsRef.current = { latitude: loc.latitude, longitude: loc.longitude };
      setMapCoords({ latitude: loc.latitude, longitude: loc.longitude });
      setMapLabel(
        loc.locality
          ? `${loc.locality}, ${loc.city || ""}`
          : loc.city || t("onboarding.locationDetected")
      );
      setMapVisible(true);
    } catch {
      Alert.alert(t("common.error"), t("settings.locationUpdateFailed"));
    } finally {
      setUpdatingLocation(false);
    }
  };

  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const onMapCenterChanged = useCallback((newCoords: CenterCoords) => {
    mapCoordsRef.current = newCoords;

    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const geo = await reverseGeocode(newCoords.latitude, newCoords.longitude);
        setMapLabel(
          geo.locality
            ? `${geo.locality}, ${geo.city || ""}`
            : geo.city || t("onboarding.locationDetected")
        );
      } catch {
      } finally {
        setGeocoding(false);
      }
    }, 500);
  }, [t]);

  const handleConfirmMapLocation = async () => {
    const c = mapCoordsRef.current;
    if (!c) return;
    setSavingLocation(true);
    try {
      const geo = await reverseGeocode(c.latitude, c.longitude);
      setLocation({
        latitude: c.latitude,
        longitude: c.longitude,
        city: geo.city,
        locality: geo.locality,
        state: geo.state,
      });
      const token = await getToken();
      await api("/users/me", {
        method: "PATCH",
        token,
        body: {
          city: geo.city || null,
          locality: geo.locality || null,
          state: geo.state || null,
          location: {
            type: "Point",
            coordinates: [c.longitude, c.latitude],
          },
        },
      });
      setMapVisible(false);
      Alert.alert(
        t("settings.locationUpdated"),
        geo.locality ? `${geo.locality}, ${geo.city || ""}` : geo.city || ""
      );
    } catch {
      Alert.alert(t("common.error"), t("settings.locationUpdateFailed"));
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveWorkRange = async (value: number) => {
    setSavingRange(true);
    setWorkRange(value);
    setWorkRangeVisible(false);
    try {
      const token = await getToken();
      await api("/users/me", {
        method: "PATCH",
        token,
        body: { work_range_km: value },
      });
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setSavingRange(false);
    }
  };

  return (
    <View className="flex-1 bg-bg-base">
      {loggingOut && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <ActivityIndicator size="large" color="#059669" />
        </View>
      )}
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.bgSurface,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          }}
        >
          <FontAwesome name="arrow-left" size={15} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontFamily: "DMSans_700Bold",
            color: colors.textPrimary,
          }}
        >
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textTertiary,
            marginBottom: 10,
            marginLeft: 8,
            letterSpacing: 0.8,
          }}
        >
          {t("settings.preferences")}
        </Text>
        <SectionCard isDark={isDark} bgSurface={colors.bgSurface}>
          <SettingRow
            icon="language"
            title={t("settings.language")}
            value={language === "hi" ? "हिंदी" : "English"}
            onPress={toggleLanguage}
            iconBg="rgba(59,130,246,0.1)"
            iconColor="#3B82F6"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon={isDark ? "moon-o" : "sun-o"}
            title={t("settings.theme")}
            value={theme === "dark" ? t("settings.dark") : t("settings.light")}
            onPress={toggleTheme}
            iconBg={isDark ? "rgba(147,130,220,0.12)" : "rgba(245,158,11,0.1)"}
            iconColor={isDark ? "#9382DC" : "#F59E0B"}
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          {isWorker && (
            <>
              <Divider />
              <SettingRow
                icon="exchange"
                title={t("settings.usagePreference")}
                value={t("settings.findingWork")}
                readonly
                textColor={colors.textPrimary}
                subtextColor={colors.textSecondary}
              />
            </>
          )}
          <Divider />
          <SettingRow
            icon="map-marker"
            title={updatingLocation ? t("settings.updatingLocation") : t("settings.updateLocation")}
            value={locationLabel}
            onPress={handleUpdateLocation}
            iconBg="rgba(239,68,68,0.08)"
            iconColor="#EF4444"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </SectionCard>

        {/* Support */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textTertiary,
            marginBottom: 10,
            marginLeft: 8,
            marginTop: 8,
            letterSpacing: 0.8,
          }}
        >
          {t("settings.support")}
        </Text>
        <SectionCard isDark={isDark} bgSurface={colors.bgSurface}>
          <SettingRow
            icon="question-circle"
            title={t("settings.helpSupport")}
            onPress={() => router.push("/help")}
            iconBg="rgba(245,158,11,0.1)"
            iconColor="#F59E0B"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="file-text-o"
            title={t("settings.termsPrivacy")}
            onPress={() => router.push("/terms")}
            iconBg="rgba(107,114,128,0.1)"
            iconColor="#6B7280"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="info-circle"
            title={t("settings.about")}
            onPress={() => router.push("/about")}
            iconBg="rgba(59,130,246,0.1)"
            iconColor="#3B82F6"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="ban"
            title={t("settings.blockedUsers")}
            onPress={() => {}}
            iconBg="rgba(107,114,128,0.1)"
            iconColor="#6B7280"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </SectionCard>

        {/* Account */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "DMSans_600SemiBold",
            color: colors.textTertiary,
            marginBottom: 10,
            marginLeft: 8,
            marginTop: 8,
            letterSpacing: 0.8,
          }}
        >
          {t("settings.account")}
        </Text>
        <SectionCard isDark={isDark} bgSurface={colors.bgSurface}>
          <SettingRow
            icon="sign-out"
            title={t("auth.logout")}
            onPress={handleLogout}
            iconBg="rgba(245,158,11,0.08)"
            iconColor="#F59E0B"
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
          <Divider />
          <SettingRow
            icon="trash"
            title={t("settings.deleteAccount")}
            onPress={handleDeleteAccount}
            danger
            textColor={colors.textPrimary}
            subtextColor={colors.textSecondary}
          />
        </SectionCard>
      </ScrollView>

      {/* Map Location Picker Modal */}
      <Modal
        visible={mapVisible}
        animationType="slide"
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
          {/* Header */}
          <View style={{ paddingTop: Platform.OS === "ios" ? 56 : 16, paddingHorizontal: 20, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <TouchableOpacity onPress={() => setMapVisible(false)}>
                <FontAwesome name="arrow-left" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: colors.textPrimary }}>
                {t("settings.updateLocation")}
              </Text>
              <View style={{ width: 18 }} />
            </View>
            <Text style={{ fontSize: 13, fontFamily: "DMSans_400Regular", color: colors.textSecondary, textAlign: "center" }}>
              {t("onboarding.moveMapToAdjust")}
            </Text>
          </View>

          {/* Map */}
          {mapCoords && (
            <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
              <SettingsLocationMap
                initialCoords={mapCoords}
                onCenterChanged={onMapCenterChanged}
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
              onPress={handleConfirmMapLocation}
              disabled={geocoding || savingLocation}
              activeOpacity={0.8}
              style={{
                backgroundColor: geocoding || savingLocation ? "#D1D5DB" : "#059669",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              {savingLocation ? (
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

      {/* Work Range Picker Modal */}
      <Modal
        visible={workRangeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWorkRangeVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setWorkRangeVisible(false)}
        />
        <View style={{
          backgroundColor: isDark ? "#111827" : "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 32,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}>
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }} />
          </View>
          <Text style={{ fontSize: 17, fontFamily: "DMSans_700Bold", color: colors.textPrimary, paddingHorizontal: 20, paddingVertical: 14 }}>
            {t("settings.workRange")}
          </Text>
          {WORK_RANGE_OPTIONS.map((opt, i) => {
            const isSelected = workRange === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSaveWorkRange(opt.value)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderBottomWidth: i < WORK_RANGE_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                }}
              >
                <Text style={{
                  fontSize: 15,
                  fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                  color: isSelected ? "#059669" : colors.textPrimary,
                }}>
                  {opt.label}
                </Text>
                {isSelected && <FontAwesome name="check" size={14} color="#059669" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}
