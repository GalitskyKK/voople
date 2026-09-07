import { GroupLobbyAction } from "@/components/chat/GroupLobbyAction";
import { VoiceRoomButton } from "@/components/chat/voice/VoiceRoomButton";

export function DesktopChatRoomHeaderAction({
  chatId,
  chatName,
  chatType,
  isRootGroup,
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
      <GroupLobbyAction
        groupId={chatId}
        groupName={chatName}
      />
    );
  }

  return <VoiceRoomButton chatId={chatId} chatName={chatName} chatType={chatType} />;
}
