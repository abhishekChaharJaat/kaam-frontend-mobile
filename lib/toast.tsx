import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Animated,
  Platform,
  TouchableOpacity,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

type ToastType = "success" | "error" | "info";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentProps<typeof FontAwesome>["name"];
    iconColor: string;
    iconBg: string;
  }
> = {
  success: {
    icon: "check-circle",
    iconColor: "#059669",
    iconBg: "rgba(5,150,105,0.12)",
  },
  error: {
    icon: "exclamation-circle",
    iconColor: "#EF4444",
    iconBg: "rgba(239,68,68,0.12)",
  },
  info: {
    icon: "info-circle",
    iconColor: "#3B82F6",
    iconBg: "rgba(59,130,246,0.12)",
  },
};

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({
  toast,
  onDismiss,
  isDark,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
  isDark: boolean;
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const config = TOAST_CONFIG[toast.type];

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
    ]).start();

    const timer = setTimeout(() => {
      dismiss();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY }, { scale }],
        opacity,
        marginBottom: 8,
      }}
    >
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.95}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.5 : 0.18,
          shadowRadius: 20,
          elevation: 12,
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: config.iconBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <FontAwesome name={config.icon} size={18} color={config.iconColor} />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontFamily: "DMSans_500Medium",
            color: isDark ? "#F1F5F9" : "#1E293B",
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {toast.message}
        </Text>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
          }}
        >
          <FontAwesome
            name="times"
            size={10}
            color={isDark ? "#64748B" : "#94A3B8"}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: Platform.OS === "ios" ? 54 : 38,
          left: 16,
          right: 16,
          zIndex: 9999,
        }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            isDark={isDark}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}
