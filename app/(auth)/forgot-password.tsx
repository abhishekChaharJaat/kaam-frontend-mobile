import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pendingReset, setPendingReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRequestReset = async () => {
    if (!isLoaded || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setPendingReset(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!isLoaded || !code || !newPassword) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-base"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-16">
          <TouchableOpacity
            className="w-10 h-10 bg-bg-surface border border-border rounded-xl items-center justify-center mb-8"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          >
            <FontAwesome name="arrow-left" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <Text className="text-h1 text-text-primary font-sans-bold mb-2">
            Reset Password
          </Text>
          <Text className="text-body text-text-secondary mb-8">
            {pendingReset
              ? "Enter the code we sent to your email"
              : "Enter your email to receive a reset code"}
          </Text>

          {error ? (
            <View className="bg-error-ghost rounded-lg px-4 py-3 mb-4">
              <Text className="text-body-sm text-error">{error}</Text>
            </View>
          ) : null}

          {!pendingReset ? (
            <>
              <View className="mb-6">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  Email
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-xl px-4">
                  <FontAwesome name="envelope-o" size={16} color="#6B7280" />
                  <TextInput
                    className="flex-1 py-3.5 px-3 text-body text-text-primary font-sans"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#4B5563"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                className="bg-primary rounded-xl py-4 items-center"
                onPress={handleRequestReset}
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text className="text-body-lg text-text-on-primary font-sans-semibold">
                    Send Reset Code
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="mb-4">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  Verification Code
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-xl px-4">
                  <FontAwesome name="shield" size={16} color="#6B7280" />
                  <TextInput
                    className="flex-1 py-3.5 px-3 text-body text-text-primary font-sans text-center tracking-widest"
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    placeholderTextColor="#4B5563"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  New Password
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-xl px-4">
                  <FontAwesome name="lock" size={18} color="#6B7280" />
                  <TextInput
                    className="flex-1 py-3.5 px-3 text-body text-text-primary font-sans"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#4B5563"
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                className="bg-primary rounded-xl py-4 items-center"
                onPress={handleReset}
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text className="text-body-lg text-text-on-primary font-sans-semibold">
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
