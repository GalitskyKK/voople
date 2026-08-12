import { BellRing, CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import {
  refreshDesktopNotificationPermission,
  showDesktopNotification,
} from "../notifications/native";

type PermissionState = "idle" | "checking" | "granted" | "denied";

export function DesktopNotificationSettings() {
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [testing, setTesting] = useState(false);

  const checkPermission = async () => {
    setPermission("checking");
    const granted = await refreshDesktopNotificationPermission();
    setPermission(granted ? "granted" : "denied");
    return granted;
  };

  const sendTest = async () => {
    setTesting(true);
    const granted = permission === "granted" || (await checkPermission());
    if (granted) {
      const shown = await showDesktopNotification({
        title: "Voople работает в фоне",
        body: "Нажмите «Открыть», чтобы вернуться к уведомлениям.",
        href: "/notifications",
        group: "voople-test",
        sound: false,
      });
      if (!shown) setPermission("denied");
    }
    setTesting(false);
  };

  return (
    <div className="settings-notification-diagnostics">
      <div className="flex min-w-0 items-start gap-3">
        <span className="settings-notification-diagnostics__icon" aria-hidden="true">
          {permission === "checking" ? (
            <LoaderCircle className="animate-spin" />
          ) : permission === "granted" ? (
            <CheckCircle2 />
          ) : permission === "denied" ? (
            <CircleAlert />
          ) : (
            <BellRing />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Уведомления Windows</p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]" role="status">
            {permission === "granted"
              ? "Разрешение получено. Проверьте тестовое уведомление вне окна Voople."
              : permission === "denied"
                ? "Windows блокирует уведомления. Разрешите их в системных настройках и проверьте снова."
                : permission === "checking"
                  ? "Проверяем системное разрешение…"
                  : "Проверьте разрешение и действие системного уведомления до первого важного звонка."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={permission === "checking" || testing}
          onClick={() => void checkPermission()}
        >
          Проверить разрешение
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={permission === "checking" || testing}
          onClick={() => void sendTest()}
        >
          {testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          Отправить тест
        </Button>
      </div>
    </div>
  );
}
