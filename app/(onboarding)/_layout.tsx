import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "@/store/user";

export default function OnboardingLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isOnboardingComplete, onboardingStep } = useUserStore();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (isOnboardingComplete) return <Redirect href="/(tabs)" />;

  // Redirect directly to the first missing step determined by the backend check
  const step = onboardingStep ?? "basic-info";
  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={step}
    >
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="usage-preference" />
      <Stack.Screen name="category-selection" />
    </Stack>
  );
}
