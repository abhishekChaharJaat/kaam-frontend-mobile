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
import { useGoogleAuth } from "@/lib/oauth";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signInWithGoogle } = useGoogleAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!isLoaded || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Login failed. Please try again.");
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
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="bg-primary w-16 h-16 rounded-2xl items-center justify-center mb-4">
              <FontAwesome name="briefcase" size={28} color="#FFF" />
            </View>
            <Text className="text-h1 text-text-primary font-sans-bold">
              KaamApp
            </Text>
            <Text className="text-body text-text-secondary mt-1">
              Find work. Find workers.
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View className="bg-error-ghost rounded-lg px-4 py-3 mb-4">
              <Text className="text-body-sm text-error">{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View className="mb-4">
            <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
              {t("auth.email")}
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
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-2">
            <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
              {t("auth.password")}
            </Text>
            <View className="flex-row items-center bg-bg-surface border border-border rounded-xl px-4">
              <FontAwesome name="lock" size={18} color="#6B7280" />
              <TextInput
                className="flex-1 py-3.5 px-3 text-body text-text-primary font-sans"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome
                  name={showPassword ? "eye-slash" : "eye"}
                  size={16}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot */}
          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text className="text-body-sm text-primary font-sans-medium">
              {t("auth.forgotPassword")}
            </Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center mb-4"
            onPress={handleLogin}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-body-lg text-text-on-primary font-sans-semibold">
                {t("auth.login")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-caption text-text-tertiary mx-4 uppercase tracking-wider">
              or continue with
            </Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* Google */}
          <TouchableOpacity
            className="bg-bg-surface border border-border rounded-xl py-3.5 flex-row items-center justify-center mb-8"
            onPress={async () => {
              setGoogleLoading(true);
              setError("");
              const result = await signInWithGoogle();
              if (!result.success && result.error) {
                setError(result.error);
              }
              setGoogleLoading(false);
            }}
            disabled={googleLoading}
            style={{ opacity: googleLoading ? 0.7 : 1 }}
          >
            {googleLoading ? (
              <ActivityIndicator color="#9CA3AF" />
            ) : (
              <>
                <FontAwesome name="google" size={18} color="#DB4437" />
                <Text className="text-body text-text-primary font-sans-medium ml-3">
                  {t("auth.continueGoogle")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sign Up */}
          <View className="flex-row justify-center">
            <Text className="text-body text-text-secondary">
              {t("auth.noAccount")}{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text className="text-body text-primary font-sans-semibold">
                {t("auth.signup")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
