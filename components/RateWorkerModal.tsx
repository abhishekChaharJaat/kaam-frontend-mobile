import { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { useToast } from "@/lib/toast";

interface RateWorkerModalProps {
  visible: boolean;
  jobId: string;
  revieweeUserId: string;
  revieweeName?: string;
  targetRole?: "worker" | "employer";
  onClose: () => void;
  onSubmitted?: () => void;
}

const MAX_COMMENT = 500;

export function RateWorkerModal({
  visible,
  jobId,
  revieweeUserId,
  revieweeName,
  targetRole = "worker",
  onClose,
  onSubmitted,
}: RateWorkerModalProps) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const isDark = colors.bgBase === "#0A0F1A";

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setRating(0);
    setComment("");
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    reset();
    onClose();
  }, [submitting, reset, onClose]);

  const handleSubmit = useCallback(async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await api("/reviews", {
        method: "POST",
        token,
        body: {
          job_id: jobId,
          reviewed_user_id: revieweeUserId,
          rating,
          comment: comment.trim() ? comment.trim() : undefined,
        },
      });
      showToast(t("rating.submitted"), "success");
      reset();
      onSubmitted?.();
      onClose();
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    rating,
    submitting,
    getToken,
    jobId,
    revieweeUserId,
    comment,
    showToast,
    t,
    reset,
    onSubmitted,
    onClose,
  ]);

  const ratingLabels = [
    t("rating.label1"),
    t("rating.label2"),
    t("rating.label3"),
    t("rating.label4"),
    t("rating.label5"),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={{
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 24,
            paddingTop: 8,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 4, paddingBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
              }}
            />
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "DMSans_700Bold",
                color: colors.textPrimary,
                textAlign: "center",
              }}
            >
              {targetRole === "employer" ? t("rating.titleEmployer") : t("rating.title")}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              {revieweeName
                ? t("rating.subtitleWithName", { name: revieweeName })
                : t("rating.subtitle")}
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                gap: 10,
                marginTop: 24,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  disabled={submitting}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <FontAwesome
                    name={star <= rating ? "star" : "star-o"}
                    size={40}
                    color={star <= rating ? "#F59E0B" : isDark ? "#4B5563" : "#D1D5DB"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                textAlign: "center",
                marginTop: 10,
                fontSize: 13,
                fontFamily: "DMSans_500Medium",
                color: rating > 0 ? "#F59E0B" : colors.textTertiary,
                minHeight: 18,
              }}
            >
              {rating > 0 ? ratingLabels[rating - 1] : t("rating.tapToRate")}
            </Text>

            <View style={{ marginTop: 20 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "DMSans_500Medium",
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                {t("rating.commentLabel")}
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={t("rating.commentPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={MAX_COMMENT}
                editable={!submitting}
                style={{
                  minHeight: 90,
                  maxHeight: 140,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  color: colors.textPrimary,
                  backgroundColor: isDark ? "#0A0F1A" : "#F9FAFB",
                  textAlignVertical: "top",
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {comment.length}/{MAX_COMMENT}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={rating < 1 || submitting}
              activeOpacity={0.85}
              style={{
                marginTop: 20,
                backgroundColor: rating < 1 ? "#94A3B8" : "#059669",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FontAwesome name="paper-plane" size={14} color="#FFFFFF" />
              )}
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "DMSans_700Bold",
                  fontSize: 15,
                }}
              >
                {t("rating.submit")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.7}
              style={{
                marginTop: 10,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: "DMSans_500Medium",
                  fontSize: 14,
                }}
              >
                {t("rating.skip")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
