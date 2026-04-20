import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const ANDROID_DEFAULT_CHANNEL_ID = "default";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#059669",
    sound: "default",
  });
}

function resolveProjectId(): string | undefined {
  const expoConfig = Constants.expoConfig as
    | { extra?: { eas?: { projectId?: unknown } } }
    | null
    | undefined;
  const easConfig = (Constants as unknown as { easConfig?: { projectId?: unknown } })
    .easConfig;

  const candidate = expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId;
  return typeof candidate === "string" ? candidate : undefined;
}

export async function registerForExpoPushTokenAsync(): Promise<string | null> {
  console.log("[push] registerForExpoPushTokenAsync: start", {
    isDevice: Device.isDevice,
    osName: Device.osName,
    osVersion: Device.osVersion,
  });

  if (!Device.isDevice && Platform.OS === "ios") {
    console.warn("[push] iOS Simulator cannot receive remote pushes. Skipping.");
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  console.log("[push] existing permission:", existing);
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("[push] requested permission, result:", status);
  }
  if (finalStatus !== "granted") {
    console.warn("[push] permission not granted. status:", finalStatus);
    return null;
  }

  const projectId = resolveProjectId();
  console.log("[push] projectId:", projectId ?? "(missing)");
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    console.log("[push] got token:", tokenResponse.data);
    return tokenResponse.data ?? null;
  } catch (err) {
    console.warn("[push] getExpoPushTokenAsync threw:", err);
    return null;
  }
}
