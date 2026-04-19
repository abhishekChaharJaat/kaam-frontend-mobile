import { useState, useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "@/store/user";
import { api } from "@/lib/api";

interface BackendUser {
  full_name?: string;
  usage_preference?: string;
  city?: string;
  locality?: string;
  state?: string;
  work_title?: string;
  work_range_km?: number;
  location?: { coordinates: [number, number] };
}

export default function AuthLayout() {
  const { isSignedIn, getToken } = useAuth();
  const {
    isOnboardingComplete,
    setOnboardingComplete,
    setUsagePreference,
    setLocation,
    setOnboardingStep,
  } = useUserStore();
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!isSignedIn || isOnboardingComplete) return;

    // Local state says onboarding not complete — verify with backend
    setVerifying(true);
    (async () => {
      try {
        const token = await getToken();
        const me = await api<BackendUser>("/auth/me", { token });

        const hasName = !!me.full_name && me.full_name !== "User";
        const hasCoords =
          me.location?.coordinates &&
          (me.location.coordinates[0] !== 0 || me.location.coordinates[1] !== 0);
        const hasLocation = !!me.city || !!hasCoords;
        const hasPreference = !!me.usage_preference;
        const isWorkerAccount = me.usage_preference === "find_work";
        const hasWorkTitle = !isWorkerAccount || !!me.work_title;
        const hasWorkRange = !isWorkerAccount || me.work_range_km != null;

        if (hasName && hasLocation && hasPreference && hasWorkTitle && hasWorkRange) {
          setUsagePreference(me.usage_preference as "find_worker" | "find_work");
          const coords = me.location?.coordinates;
          setLocation({
            latitude: coords?.[1] ?? 0,
            longitude: coords?.[0] ?? 0,
            city: me.city,
            locality: me.locality,
            state: me.state,
          });
          setOnboardingComplete(true);
          setOnboardingStep(null);
        }
      } catch {
        // Network error — fall through to local state
      }
      setVerifying(false);
    })();
  }, [isSignedIn, isOnboardingComplete]);

  if (verifying) return null;

  if (isSignedIn && !isOnboardingComplete) {
    return <Redirect href="/(onboarding)/basic-info" />;
  }

  if (isSignedIn && isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="login">
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
