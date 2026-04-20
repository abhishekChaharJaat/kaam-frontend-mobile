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

type NotificationRow = {
  id: string;
  is_read: boolean;
};

type NotificationUnreadValue = {
  totalUnread: number;
  refresh: () => Promise<void>;
};

const NotificationUnreadContext =
  createContext<NotificationUnreadValue | null>(null);

export function NotificationUnreadProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setTotalUnread(0);
        return;
      }
      const notifications = await api<NotificationRow[]>("/notifications", {
        token,
      });
      setTotalUnread(notifications.filter((n) => !n.is_read).length);
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
    <NotificationUnreadContext.Provider value={value}>
      {children}
    </NotificationUnreadContext.Provider>
  );
}

export function useNotificationUnread() {
  const ctx = useContext(NotificationUnreadContext);
  if (!ctx) {
    throw new Error(
      "useNotificationUnread must be used within NotificationUnreadProvider"
    );
  }
  return ctx;
}
