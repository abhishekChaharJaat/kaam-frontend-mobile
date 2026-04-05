import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { useOAuth } from "@clerk/clerk-expo";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const signInWithGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return { success: true };
      }
      return { success: false, error: "OAuth flow was cancelled" };
    } catch (err: any) {
      return {
        success: false,
        error: err?.errors?.[0]?.message || "Google sign-in failed",
      };
    }
  }, [startOAuthFlow]);

  return { signInWithGoogle };
}
