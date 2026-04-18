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

/** Returns a human-readable area name, filtering out Plus Codes and numeric-only strings */
function isPlusCodeOrJunk(value: string): boolean {
  // Plus Codes look like "CM9W+98" or "CM9W+98 Mathura"
  if (/^[A-Z0-9]{4}\+/.test(value)) return true;
  // Pure numbers / postal codes
  if (/^\d+$/.test(value.trim())) return true;
  return false;
}

function pickAreaName(
  address: Location.LocationGeocodedAddress | null | undefined,
  city?: string,
): string | undefined {
  if (!address) return undefined;
  // Candidates in order of preference: street, district, subregion, name
  const candidates = [
    address.street,
    address.district,
    address.subregion,
    address.name,
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      !isPlusCodeOrJunk(candidate) &&
      candidate.toLowerCase() !== city?.toLowerCase()
    ) {
      return candidate;
    }
  }
  return undefined;
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
      // Use the most specific area name available, skip Plus Codes and duplicates of city
      const area = pickAreaName(address, city);
      result.locality = area;
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
    return {
      city,
      state: address?.region || undefined,
      locality: pickAreaName(address, city),
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
