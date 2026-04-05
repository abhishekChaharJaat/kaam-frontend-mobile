import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/useThemeColors";
import { ChatWebSocket } from "@/lib/websocket";
import { useTranslation } from "react-i18next";
import { useUserStore } from "@/store/user";
import { useToast } from "@/lib/toast";

interface Message {
  id: string;
  conversation_id: string;
  sender_user_id?: string;
  message_type: string;
  text?: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationInfo {
  id: string;
  job_id: string;
  job_title?: string;
  poster_user_id: string;
  poster_name?: string;
  responder_user_id: string;
  responder_name?: string;
  is_assigned: boolean;
  is_disabled: boolean;
}

interface MeResponse {
  id: string;
  clerk_user_id: string;
}

export default function ChatRoom() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<ConversationInfo | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myMongoId, setMyMongoId] = useState<string | null>(null);
  const { getToken } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { usagePreference } = useUserStore();
  const { showToast } = useToast();
  const isEmployer = usagePreference === "find_worker";
  const [nudging, setNudging] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const wsRef = useRef<ChatWebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const myMongoIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mergeMessages = useCallback(
    (prev: Message[], incoming: Message[]): Message[] => {
      const ids = new Set(prev.map((m) => m.id));
      const newMsgs = incoming.filter((m) => !ids.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...prev, ...newMsgs];
    },
    []
  );

  useEffect(() => {
    let ws: ChatWebSocket | null = null;

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const [convData, messagesData, meData] = await Promise.all([
          api<ConversationInfo>(`/conversations/${chatId}`, { token }),
          api<Message[]>(`/conversations/${chatId}/messages`, { token }),
          api<MeResponse>("/auth/me", { token }),
        ]);

        setConv(convData);
        setMessages(messagesData);
        setMyMongoId(meData.id);
        myMongoIdRef.current = meData.id;

        ws = new ChatWebSocket(chatId ?? "", token, (msg) => {
          if (msg.error) return;
          if (msg.sender_user_id === myMongoIdRef.current) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        });
        ws.connect();
        wsRef.current = ws;

        pollRef.current = setInterval(async () => {
          try {
            const freshToken = await getToken();
            const fresh = await api<Message[]>(
              `/conversations/${chatId}/messages`,
              { token: freshToken }
            );
            setMessages((prev) => mergeMessages(prev, fresh));
          } catch {}
        }, 5000);
      } catch {
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      ws?.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || conv?.is_disabled || sending) return;

    setInputText("");
    setSending(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: chatId ?? "",
      sender_user_id: myMongoId || "",
      message_type: "text",
      text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const token = await getToken();
      const saved = await api<Message>(
        `/conversations/${chatId}/messages?text=${encodeURIComponent(text)}`,
        { method: "POST", token }
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? saved : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [inputText, conv, sending, myMongoId, chatId, getToken]);

  const getOtherName = useCallback(() => {
    if (!conv) return t("chat.chat");
    if (myMongoId === conv.poster_user_id) {
      return conv.responder_name || t("chat.user");
    }
    return conv.poster_name || t("chat.user");
  }, [conv, myMongoId, t]);

  const handleNudge = useCallback(async () => {
    if (!conv || nudging) return;
    setNudging(true);
    try {
      const token = await getToken();
      const msg = await api<Message>(
        `/conversations/${chatId}/nudge`,
        { method: "POST", token }
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      showToast(t("chat.nudgeSent"), "success");
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setNudging(false);
    }
  }, [conv, nudging, chatId, getToken, showToast, t]);

  const handleAssign = useCallback(() => {
    if (!conv) return;
    const workerName = getOtherName();
    Alert.alert(
      t("chat.assignConfirmTitle"),
      t("chat.assignConfirmMessage", { name: workerName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.assignConfirm"),
          style: "default",
          onPress: async () => {
            setAssigning(true);
            try {
              const token = await getToken();
              await api(
                `/jobs/${conv.job_id}/assign?conversation_id=${conv.id}`,
                { method: "POST", token }
              );
              setConv((prev) => prev ? { ...prev, is_assigned: true } : prev);
              showToast(t("chat.jobAssigned"), "success");
            } catch {
              showToast(t("common.error"), "error");
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  }, [conv, getToken, getOtherName, showToast, t]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isSystem = item.message_type === "system";
    const isNudge = item.message_type === "nudge";
    const isMine = item.sender_user_id === myMongoId;

    if (isSystem) {
      let displayText = item.text ?? "";
      if (isEmployer && conv?.is_assigned) {
        const workerName = conv.responder_name || conv.poster_name || t("chat.user");
        if (displayText.toLowerCase().includes("assigned to you")) {
          displayText = `${t("chat.jobAssignedTo", { name: workerName })}`;
        }
      }
      return (
        <View className="items-center my-2 px-4">
          <Text className="text-caption text-text-secondary bg-bg-surface px-3 py-1 rounded-full">
            {displayText}
          </Text>
        </View>
      );
    }

    if (isNudge) {
      return (
        <View className="items-center my-3 px-4">
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              maxWidth: "90%",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: "#FDE68A",
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#F59E0B",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="hand-pointer-o" size={14} color="#FFFFFF" />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: "#92400E",
                lineHeight: 18,
              }}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View
        className={`flex-row mb-2 px-4 ${isMine ? "justify-end" : "justify-start"}`}
      >
        <View
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
            isMine
              ? "bg-primary rounded-br-sm"
              : "bg-bg-surface border border-border rounded-bl-sm"
          }`}
        >
          <Text
            className={`text-body ${
              isMine ? "text-text-on-primary" : "text-text-primary"
            }`}
          >
            {item.text}
          </Text>
          <Text
            className={`text-caption mt-1 ${
              isMine ? "text-white/60" : "text-text-secondary"
            }`}
          >
            {item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg-base items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg-base"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View className="flex-row items-center px-4 pt-12 pb-3 border-b border-border bg-bg-base">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1"
          activeOpacity={isEmployer && conv ? 0.6 : 1}
          onPress={() => {
            if (!isEmployer || !conv) return;
            const otherUserId =
              myMongoId === conv.poster_user_id
                ? conv.responder_user_id
                : conv.poster_user_id;
            router.push(`/user/${otherUserId}`);
          }}
        >
          <Text className="text-body font-sans-semibold text-text-primary">
            {getOtherName()}
          </Text>
          {conv?.job_title && (
            <Text className="text-caption text-text-secondary" numberOfLines={1}>
              {conv.job_title}
            </Text>
          )}
        </TouchableOpacity>
        {isEmployer && conv && (
          <TouchableOpacity
            onPress={() => {
              const otherUserId =
                myMongoId === conv.poster_user_id
                  ? conv.responder_user_id
                  : conv.poster_user_id;
              router.push(`/user/${otherUserId}`);
            }}
            style={{ marginRight: 10 }}
          >
            <FontAwesome name="user" size={18} color="#059669" />
          </TouchableOpacity>
        )}
        {conv && !conv.is_disabled && (
          <TouchableOpacity
            onPress={() => router.push(`/job/${conv.job_id}`)}
          >
            <FontAwesome name="briefcase" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {conv?.is_disabled && !conv?.is_assigned && (
        <View
          style={{
            backgroundColor: "#FEE2E2",
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <FontAwesome name="ban" size={14} color="#DC2626" />
          <Text style={{ fontSize: 13, color: "#DC2626", fontWeight: "500" }}>
            {t("chat.jobClosedWithOther")}
          </Text>
        </View>
      )}

      {conv?.is_assigned && !isEmployer && (
        <View
          style={{
            backgroundColor: "#D1FAE5",
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <FontAwesome name="check-circle" size={14} color="#059669" />
          <Text style={{ fontSize: 13, color: "#059669", fontWeight: "600" }}>
            {t("chat.jobAssignedToYou")}
          </Text>
        </View>
      )}

      {conv?.is_assigned && isEmployer && (
        <View
          style={{
            backgroundColor: "#DBEAFE",
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <FontAwesome name="check-circle" size={14} color="#2563EB" />
          <Text style={{ fontSize: 13, color: "#2563EB", fontWeight: "600" }}>
            {t("chat.jobAssignedSuccess")}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 8 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {!conv?.is_disabled && !conv?.is_assigned && conv && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bgSurface,
            gap: 12,
          }}
        >
          {isEmployer ? (
            <TouchableOpacity
              onPress={handleAssign}
              disabled={assigning}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "#059669",
                paddingVertical: 10,
                borderRadius: 10,
                opacity: assigning ? 0.6 : 1,
              }}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FontAwesome name="check-circle" size={16} color="#FFFFFF" />
              )}
              <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
                {t("chat.closeWithWorker")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNudge}
              disabled={nudging}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: "#F59E0B",
                paddingVertical: 10,
                borderRadius: 10,
                opacity: nudging ? 0.6 : 1,
              }}
            >
              {nudging ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FontAwesome name="hand-pointer-o" size={16} color="#FFFFFF" />
              )}
              <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
                {t("chat.sendNudge")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!conv?.is_disabled && (
        <View className="flex-row items-end px-4 py-3 border-t border-border bg-bg-base">
          <TextInput
            className="flex-1 bg-bg-surface border border-border rounded-full px-4 py-2.5 text-body text-text-primary mr-2"
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("chat.typeMessage")}
            placeholderTextColor="#94A3B8"
            multiline
            style={{ maxHeight: 100 }}
          />
          <TouchableOpacity
            className="bg-primary w-10 h-10 rounded-full items-center justify-center"
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={{ opacity: !inputText.trim() || sending ? 0.6 : 1 }}
          >
            <FontAwesome name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
