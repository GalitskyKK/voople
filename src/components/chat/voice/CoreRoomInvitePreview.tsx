"use client";

import { useState } from "react";

import { RoomInviteNotificationActions } from "@/components/notifications/RoomInviteNotificationActions";
import { useCoreRoomInvitePreview } from "@/hooks/useCoreRoomInvitePreview";

import { CoreRoomInvitePreviewView } from "./CoreRoomInvitePreviewView";

export function CoreRoomInvitePreview({
  inviteId,
  onSwitchAccount,
}: {
  inviteId: string;
  onSwitchAccount?: () => Promise<void>;
}) {
  return (
    <CoreRoomInvitePreviewController
      key={inviteId}
      inviteId={inviteId}
      onSwitchAccount={onSwitchAccount}
    />
  );
}

function CoreRoomInvitePreviewController({
  inviteId,
  onSwitchAccount,
}: {
  inviteId: string;
  onSwitchAccount?: () => Promise<void>;
}) {
  const { state, retry } = useCoreRoomInvitePreview(inviteId);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [switchAccountError, setSwitchAccountError] = useState(false);

  const switchAccount = async () => {
    if (!onSwitchAccount || switchingAccount) return;
    setSwitchAccountError(false);
    setSwitchingAccount(true);
    try {
      await onSwitchAccount();
      setSwitchingAccount(false);
    } catch {
      setSwitchAccountError(true);
      setSwitchingAccount(false);
    }
  };

  return (
    <CoreRoomInvitePreviewView
      state={state}
      onRetry={retry}
      actions={state.kind === "ready" ? <RoomInviteNotificationActions invite={state.invite} /> : null}
      switchAccountAction={state.kind === "unavailable" && onSwitchAccount
        ? {
            error: switchAccountError,
            pending: switchingAccount,
            onSelect: () => { void switchAccount(); },
          }
        : null}
    />
  );
}
