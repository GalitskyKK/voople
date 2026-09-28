export function canRetryWithDefaultMicrophone(error: unknown, selectedInputDeviceId: string) {
  if (selectedInputDeviceId === "default" || !error || typeof error !== "object") return false;
  const name = "name" in error ? error.name : null;
  return name === "OverconstrainedError" || name === "NotFoundError";
}

export function shouldResetMissingMicrophone(
  selectedInputDeviceId: string,
  devices: readonly Pick<MediaDeviceInfo, "deviceId" | "label">[],
) {
  if (selectedInputDeviceId === "default") return false;
  // Before permission, browsers may expose empty labels or unstable IDs.
  if (!devices.length || devices.some((device) => !device.deviceId || !device.label.trim())) return false;
  return !devices.some((device) => device.deviceId === selectedInputDeviceId);
}
