import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/lib/api";

type ConversationRow = {
  poster_user_id: string;
  unread_count_poster: number;
  unread_count_responder: number;
};

type ChatUnreadValue = {
  totalUnread: number;
  refresh: () => Promise<void>;
};

const ChatUnreadContext = createContext<ChatUnreadValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setTotalUnread(0);
        return;
      }
      const [me, convs] = await Promise.all([
        api<{ id: string }>("/auth/me", { token }),
        api<ConversationRow[]>("/conversations", { token }),
      ]);
      const myId = me.id;
      let sum = 0;
      for (const c of convs) {
        if (c.poster_user_id === myId) {
          sum += c.unread_count_poster ?? 0;
        } else {
          sum += c.unread_count_responder ?? 0;
        }
      }
      setTotalUnread(sum);
    } catch {
      /* ignore */
    }
  }, [getToken]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(
    () => ({ totalUnread, refresh }),
    [totalUnread, refresh]
  );

  return (
    <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) {
    throw new Error("useChatUnread must be used within ChatUnreadProvider");
  }
  return ctx;
}
