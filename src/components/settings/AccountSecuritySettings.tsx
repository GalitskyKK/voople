"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Mail, MonitorSmartphone, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { TrustedDeviceView } from "@/lib/auth/trusted-device-client";

type AccountSecuritySettingsProps = {
  currentEmail: string | null;
  requestReauthentication: () => Promise<void>;
  updateEmail: (email: string, nonce: string) => Promise<void>;
  updatePassword: (password: string, nonce: string) => Promise<void>;
  loadTrustedDevices: () => Promise<TrustedDeviceView[]>;
  revokeTrustedDevice: (deviceRecordId: string) => Promise<void>;
};

export function AccountSecuritySettings({
  currentEmail,
  requestReauthentication,
  updateEmail,
  updatePassword,
  loadTrustedDevices,
  revokeTrustedDevice,
}: AccountSecuritySettingsProps) {
  const [nonce, setNonce] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState<"code" | "email" | "password" | "devices" | null>(null);
  const [devices, setDevices] = useState<TrustedDeviceView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const validNonce = /^\d{6,8}$/.test(nonce.trim());

  useEffect(() => {
    let active = true;
    void loadTrustedDevices().then((next) => {
      if (active) setDevices(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loadTrustedDevices]);

  const run = async (
    action: "code" | "email" | "password" | "devices",
    operation: () => Promise<void>,
  ) => {
    if (pending) return;
    setPending(action);
    setError(null);
    setNotice(null);
    try {
      await operation();
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "Не удалось выполнить защищённое действие",
      );
    } finally {
      setPending(null);
    }
  };

  const consumeNonce = () => {
    setNonce("");
    setCodeSent(false);
  };

  return (
    <div className="space-y-4">
      <div className="settings-security-card">
        <ShieldCheck className="h-5 w-5 text-(--theme-accent)" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Подтвердите личность</p>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Код придёт на текущую подтверждённую почту
            {currentEmail ? ` ${currentEmail}` : " аккаунта"}. Он нужен перед сменой
            email или пароля.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            disabled={pending !== null}
            onClick={() => void run("code", async () => {
              await requestReauthentication();
              setCodeSent(true);
              setNotice("Код подтверждения отправлен");
            })}
          >
            {pending === "code" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {codeSent ? "Отправить код ещё раз" : "Получить код"}
          </Button>
        </div>
      </div>

      <div className="settings-security-card items-start">
        <MonitorSmartphone className="mt-1 h-5 w-5 text-(--theme-accent)" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Доверенные устройства</p>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            На новом устройстве Voople попросит подтвердить вход кодом из письма.
          </p>
          <div className="mt-3 space-y-2">
            {devices.length === 0 ? (
              <p className="text-xs text-[var(--app-muted)]">Список появится после подтверждённого входа.</p>
            ) : devices.map((device) => (
              <div key={device.id} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{device.label}{device.current ? " · это устройство" : ""}</span>
                  <span className="block text-xs text-[var(--app-muted)]">Последний вход: {new Date(device.lastUsedAt).toLocaleString("ru-RU")}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Удалить устройство ${device.label}`}
                  disabled={pending !== null}
                  className="rounded-lg p-2 text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  onClick={() => void run("devices", async () => {
                    await revokeTrustedDevice(device.id);
                    setDevices((current) => current.filter((item) => item.id !== device.id));
                    setNotice("Устройство удалено. Следующий вход потребует код из письма.");
                  })}
                >
                  {pending === "devices" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {codeSent ? (
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Код из письма</span>
          <input
            value={nonce}
            onChange={(event) => setNonce(event.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="profile-editor-input max-w-xs font-mono tracking-[0.2em]"
            placeholder="000000"
          />
        </label>
      ) : null}

      <form
        className="settings-security-card items-start"
        onSubmit={(event) => {
          event.preventDefault();
          void run("email", async () => {
            await updateEmail(newEmail.trim(), nonce.trim());
            setNewEmail("");
            consumeNonce();
            setNotice("Письма подтверждения отправлены на старый и новый адреса");
          });
        }}
      >
        <Mail className="mt-2 h-5 w-5 text-(--theme-accent)" />
        <div className="min-w-0 flex-1 space-y-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Новая почта</span>
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              autoComplete="email"
              required
              className="profile-editor-input"
            />
          </label>
          <Button type="submit" size="sm" disabled={!validNonce || pending !== null}>
            {pending === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Сменить почту
          </Button>
        </div>
      </form>

      <form
        className="settings-security-card items-start"
        onSubmit={(event) => {
          event.preventDefault();
          if (newPassword !== passwordConfirmation) {
            setError("Пароли не совпадают");
            return;
          }
          void run("password", async () => {
            await updatePassword(newPassword, nonce.trim());
            setNewPassword("");
            setPasswordConfirmation("");
            consumeNonce();
            setNotice("Пароль изменён");
          });
        }}
      >
        <KeyRound className="mt-2 h-5 w-5 text-(--theme-accent)" />
        <div className="min-w-0 flex-1 space-y-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Новый пароль</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={10}
              autoComplete="new-password"
              required
              className="profile-editor-input"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Повторите пароль</span>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              minLength={10}
              autoComplete="new-password"
              required
              className="profile-editor-input"
            />
          </label>
          <Button type="submit" size="sm" disabled={!validNonce || pending !== null}>
            {pending === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Сменить пароль
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-500" role="status">{notice}</p> : null}
    </div>
  );
}
