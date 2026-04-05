import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

interface CompressOptions {
  maxWidth?: number;
  quality?: number;
}

const PROFILE_OPTIONS: CompressOptions = { maxWidth: 500, quality: 0.7 };
const GENERAL_OPTIONS: CompressOptions = { maxWidth: 1200, quality: 0.8 };

export async function pickAndCompressImage(
  type: "profile" | "general" = "general",
  source: "gallery" | "camera" = "gallery"
): Promise<string | null> {
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: type === "profile" ? [1, 1] : undefined,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: type === "profile" ? [1, 1] : undefined,
          quality: 1,
        });

  if (result.canceled || !result.assets?.[0]) return null;

  const opts = type === "profile" ? PROFILE_OPTIONS : GENERAL_OPTIONS;
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: opts.maxWidth } }],
    {
      compress: opts.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return manipulated.uri;
}

export async function uploadImage(
  uri: string,
  token: string,
  entityType: string = "general",
  entityId?: string
): Promise<string> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: "image.jpg",
    type: "image/jpeg",
  } as any);
  formData.append("entity_type", entityType);
  if (entityId) formData.append("entity_id", entityId);

  const res = await fetch(`${API_URL}/uploads/image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}
