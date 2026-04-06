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
import { useSignUp } from "@clerk/clerk-expo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import KaamSpotLogo from "@/components/KaamSpotLogo";
import { useGoogleAuth } from "@/lib/oauth";
import { useTranslation } from "react-i18next";

export default function SignupScreen() {
  const { t } = useTranslation();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { signInWithGoogle } = useGoogleAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async () => {
    if (!isLoaded || !email.trim() || !password || !name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        firstName: name.trim(),
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !code) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || "Verification failed.");
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
          <View className="items-center mb-10">
            <KaamSpotLogo size="lg" />
            <Text className="text-body text-text-secondary mt-1">
              Join your local work community
            </Text>
          </View>

          {error ? (
            <View className="bg-error-ghost rounded-lg px-4 py-3 mb-4">
              <Text className="text-body-sm text-error">{error}</Text>
            </View>
          ) : null}

          {!pendingVerification ? (
            <>
              <View className="mb-4">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  {t("auth.fullName")}
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-full px-4">
                  <FontAwesome name="user-o" size={16} color="#6B7280" />
                  <TextInput
                    className="flex-1 py-3.5 px-3 text-body text-text-primary font-sans"
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    placeholderTextColor="#4B5563"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  {t("auth.email")}
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-full px-4">
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

              <View className="mb-6">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  {t("auth.password")}
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-full px-4">
                  <FontAwesome name="lock" size={18} color="#6B7280" />
                  <TextInput
                    className="flex-1 py-3.5 px-3 text-body text-text-primary font-sans"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#4B5563"
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                className="bg-primary rounded-full py-4 items-center mb-4"
                onPress={handleSignup}
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text className="text-body-lg text-text-on-primary font-sans-semibold">
                    {t("auth.signup")}
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center my-5">
                <View className="flex-1 h-px bg-border" />
                <Text className="text-caption text-text-tertiary mx-4 uppercase tracking-wider">
                  or
                </Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              <TouchableOpacity
                className="bg-bg-surface border border-border rounded-full py-3.5 flex-row items-center justify-center mb-8"
                onPress={async () => {
                  setLoading(true);
                  setError("");
                  const result = await signInWithGoogle();
                  if (!result.success && result.error) {
                    setError(result.error);
                  }
                  setLoading(false);
                }}
              >
                <FontAwesome name="google" size={18} color="#DB4437" />
                <Text className="text-body text-text-primary font-sans-medium ml-3">
                  Sign up with Google
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="bg-primary-ghost rounded-full p-4 mb-6">
                <Text className="text-body text-primary text-center">
                  We sent a verification code to{"\n"}
                  <Text className="font-sans-semibold">{email}</Text>
                </Text>
              </View>

              <View className="mb-6">
                <Text className="text-body-sm text-text-secondary font-sans-medium mb-1.5">
                  {t("auth.verificationCode")}
                </Text>
                <View className="flex-row items-center bg-bg-surface border border-border rounded-full px-4">
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

              <TouchableOpacity
                className="bg-primary rounded-full py-4 items-center"
                onPress={handleVerify}
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text className="text-body-lg text-text-on-primary font-sans-semibold">
                    Verify Email
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <View className="flex-row justify-center mt-6">
            <Text className="text-body text-text-secondary">
              {t("auth.haveAccount")}{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text className="text-body text-primary font-sans-semibold">
                {t("auth.login")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
