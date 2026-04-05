import * as Location from "expo-location";

export interface LocationResult {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  locality?: string;
  country?: string;
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
      result.city = address.city || undefined;
      result.state = address.region || undefined;
      result.locality = address.district || address.subregion || undefined;
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

    return {
      city: address?.city || undefined,
      state: address?.region || undefined,
      locality: address?.district || address?.subregion || undefined,
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
