import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useUserStore } from "@/store/user";

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  const { isOnboardingComplete } = useUserStore();

  if (isSignedIn && !isOnboardingComplete) {
    return <Redirect href="/(onboarding)/basic-info" />;
  }

  if (isSignedIn && isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
