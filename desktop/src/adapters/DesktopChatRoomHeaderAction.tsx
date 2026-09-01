import { GroupRoomAction } from "@/components/chat/GroupRoomAction";
import { VoiceRoomButton } from "@/components/chat/voice/VoiceRoomButton";

export function DesktopChatRoomHeaderAction({
  chatId,
  chatName,
  chatType,
  isRootGroup,
  canCreatePinned,
  onOpenProfile,
}: {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  isRootGroup: boolean;
  canCreatePinned: boolean;
  onOpenProfile: (username: string) => void;
}) {
  if (isRootGroup) {
    return (
      <GroupRoomAction
        groupId={chatId}
        groupName={chatName}
        canCreatePinned={canCreatePinned}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  return <VoiceRoomButton chatId={chatId} chatName={chatName} chatType={chatType} />;
}
