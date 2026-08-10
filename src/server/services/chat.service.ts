export type { ChatListItem } from "@/types/chat";
export type { ChatMessageView } from "@/types/chat";
import { sendMessageRest } from "@/server/data/chat-rest";
import { updateGroupCustomizationRest } from "@/server/data/chat-community-rest";
import { resolvePublicMediaKey } from "@/server/services/upload.service";

export {
  addGroupMembersRest as addGroupMembers,
  deleteMessageRest as deleteMessage,
  editMessageRest as editMessage,
  createGroupChatRest as createGroupChat,
  createSubchatRest as createSubchat,
  getDirectChatByUsernameRest as getDirectChatByUsername,
  listChatsRest as listChats,
  listMessagesRest as listMessages,
  markMessagesReadRest as markMessagesRead,
  toggleMessageReactionRest as toggleMessageReaction,
} from "@/server/data/chat-rest";

export async function sendMessage(
  input: Parameters<typeof sendMessageRest>[0],
) {
  if (input.mediaKey) {
    await resolvePublicMediaKey(input.mediaKey, input.senderId, "chat");
  }
  return sendMessageRest(input);
}

export {
  deleteGroupRest as deleteGroup,
  getSectionAccessRest as getSectionAccess,
  leaveGroupRest as leaveGroup,
  listChatContactsRest as listChatContacts,
  listGroupContactsRest as listGroupContacts,
  listGroupMembersRest as listGroupMembers,
  removeGroupMemberRest as removeGroupMember,
  setGroupVisibilityRest as setGroupVisibility,
  setSectionAccessRest as setSectionAccess,
  setGroupTopicsRest as setGroupTopics,
} from "@/server/data/chat-management-rest";

export {
  joinPublicGroupRest as joinPublicGroup,
  listPublicGroupsRest as listPublicGroups,
} from "@/server/data/chat-discovery-rest";

export {
  getGroupCommunityRest as getGroupCommunity,
  setGroupBoostRest as setGroupBoost,
} from "@/server/data/chat-community-rest";

export async function updateGroupCustomization(
  chatId: string,
  userId: string,
  patch: Parameters<typeof updateGroupCustomizationRest>[2],
) {
  const avatarKey =
    patch.avatarKey === undefined
      ? undefined
      : await resolvePublicMediaKey(patch.avatarKey, userId, "group-avatar");
  return updateGroupCustomizationRest(chatId, userId, { ...patch, avatarKey });
}

export {
  acceptChatInviteRest as acceptChatInvite,
  createChatInviteRest as createChatInvite,
  createChatRoomMediaTokenRest as createChatRoomMediaToken,
  enterChatRoomRest as enterChatRoom,
  getChatRoomRest as getChatRoom,
  heartbeatChatRoomRest as heartbeatChatRoom,
  leaveChatRoomRest as leaveChatRoom,
  previewChatInviteRest as previewChatInvite,
  revokeChatInviteRest as revokeChatInvite,
  setChatRoomAccessRest as setChatRoomAccess,
} from "@/server/data/chat-rooms-rest";

export {
  declineChatRoomCallRest as declineChatRoomCall,
  listIncomingCallsRest as listIncomingCalls,
} from "@/server/data/chat-calls-rest";
