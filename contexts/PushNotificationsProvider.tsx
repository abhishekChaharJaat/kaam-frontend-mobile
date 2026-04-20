import { useEffect, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

import { api } from "@/lib/api";
import { registerForExpoPushTokenAsync } from "@/lib/push-notifications";
import { useChatUnread } from "@/contexts/ChatUnreadContext";

type NotificationData = {
  reference_id?: string;
  reference_type?: "job" | "conversation" | string;
};

const TOKEN_REGISTRATION_KEY = "@expo_push_token_registered";

async function readCachedToken(): Promise<string | null> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    return await AsyncStorage.getItem(TOKEN_REGISTRATION_KEY);
  } catch {
    return null;
  }
}

async function writeCachedToken(token: string): Promise<void> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(TOKEN_REGISTRATION_KEY, token);
  } catch {
    /* ignore */
  }
}

async function clearCachedToken(): Promise<void> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.removeItem(TOKEN_REGISTRATION_KEY);
  } catch {
    /* ignore */
  }
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const { refresh: refreshChatUnread } = useChatUnread();

  const receivedSub = useRef<Notifications.EventSubscription | null>(null);
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;

    (async () => {
      try {
        const expoPushToken = await registerForExpoPushTokenAsync();
        if (cancelled) return;
        if (!expoPushToken) {
          console.warn("[push] no token returned, skipping backend registration");
          return;
        }

        const cached = await readCachedToken();
        if (cached === expoPushToken) {
          console.log("[push] token unchanged since last register, skipping POST");
          return;
        }

        const authToken = await getToken();
        if (!authToken) {
          console.warn("[push] no auth token, skipping push-token POST");
          return;
        }

        console.log("[push] POST /users/me/push-token", expoPushToken);
        await api("/users/me/push-token", {
          method: "POST",
          token: authToken,
          body: { expo_push_token: expoPushToken, platform: Platform.OS },
        });
        await writeCachedToken(expoPushToken);
        console.log("[push] token saved to backend");
      } catch (err) {
        console.warn("[push] register failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    receivedSub.current = Notifications.addNotificationReceivedListener(() => {
      void refreshChatUnread();
    });

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as NotificationData;
        if (!data?.reference_id || !data.reference_type) return;

        if (data.reference_type === "job") {
          router.push(`/job/${data.reference_id}` as never);
        } else if (data.reference_type === "conversation") {
          router.push(`/chat/${data.reference_id}` as never);
        }
      }
    );

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
      receivedSub.current = null;
      responseSub.current = null;
    };
  }, [router, refreshChatUnread]);

  useEffect(() => {
    if (isSignedIn) return;
    Notifications.setBadgeCountAsync(0).catch(() => {});
    void clearCachedToken();
  }, [isSignedIn]);

  return <>{children}</>;
}
