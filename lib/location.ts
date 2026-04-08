import * as Location from "expo-location";

export interface LocationResult {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  locality?: string;
  country?: string;
}

export async function checkLocationPermission(): Promise<"granted" | "denied" | "blocked"> {
  const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
  if (status === "granted") return "granted";
  if (!canAskAgain) return "blocked";
  return "denied";
}

export async function getCurrentLocation(): Promise<LocationResult | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const result: LocationResult = {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };

  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });

    if (address) {
      const city = address.city || address.subregion || address.district || undefined;
      result.city = city;
      result.state = address.region || undefined;
      // Use the most specific area name available, but skip if it's same as city
      const area = address.name || address.street || address.district || address.subregion || undefined;
      result.locality = area && area.toLowerCase() !== city?.toLowerCase() ? area : undefined;
      result.country = address.country || undefined;
    }
  } catch {}

  return result;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Partial<LocationResult>> {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const city = address?.city || address?.subregion || address?.district || undefined;
    const area = address?.name || address?.street || address?.district || address?.subregion || undefined;
    return {
      city,
      state: address?.region || undefined,
      locality: area && area.toLowerCase() !== city?.toLowerCase() ? area : undefined,
      country: address?.country || undefined,
    };
  } catch {
    return {};
  }
}

export const SEARCH_RADIUS_OPTIONS = [
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "20 km", value: 20 },
];
