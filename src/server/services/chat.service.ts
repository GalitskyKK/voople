export type { ChatListItem } from "@/types/chat";
export type { ChatMessageView } from "@/types/chat";
import { sendMessageRest } from "@/server/data/chat-rest";
import {
  getGroupCommunityRest,
  updateGroupCustomizationRest,
} from "@/server/data/chat-community-rest";
import {
  isAnimatedPublicImageKey,
  resolvePublicMediaKey,
} from "@/server/services/upload.service";
import { prepareMessageContentRest } from "@/server/data/chat-content-rest";
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

export { getMessageNotificationRest as getMessageNotification } from "@/server/data/chat-message-actions-rest";

export async function sendMessage(
  input: Parameters<typeof sendMessageRest>[0],
) {
  if (input.mediaKey) {
    await resolvePublicMediaKey(input.mediaKey, input.senderId, "chat", {
      chatId: input.chatId,
    });
  }
  const prepared = input.content?.length
    ? await prepareMessageContentRest(input.chatId, input.senderId, input.content)
    : null;
  return sendMessageRest({
    ...input,
    text: prepared?.fallback ?? input.text,
    storedContent: prepared?.stored,
  });
}

export {
  deleteGroupRest as deleteGroup,
  getSectionAccessRest as getSectionAccess,
  leaveGroupRest as leaveGroup,
  listChatContactsRest as listChatContacts,
  listGroupContactsRest as listGroupContacts,
  removeGroupMemberRest as removeGroupMember,
  setGroupVisibilityRest as setGroupVisibility,
  setSectionAccessRest as setSectionAccess,
  setGroupTopicsRest as setGroupTopics,
} from "@/server/data/chat-management-rest";
export { setGroupNameRest as setGroupName } from "@/server/data/chat-group-identity-rest";
export { listGroupMembersRest as listGroupMembers } from "@/server/data/chat-group-members-rest";
export { getGroupNow } from "@/server/services/group-now.service";
export {
  archiveGroupRoom,
  createAndJoinGroupRoom,
  createGroupRoomMediaToken,
  createGroupRoom,
  expireGroupRoomGrace,
  heartbeatGroupRoom,
  joinGroupRoom,
  leaveGroupRoom,
  setGroupRoomKind,
} from "@/server/services/group-room-mutations.service";
export {
  listGroupJoinRequestsRest as listGroupJoinRequests,
  resolveGroupJoinRequestRest as resolveGroupJoinRequest,
} from "@/server/data/chat-join-requests-rest";

export { listGroupAuditRest as listGroupAudit } from "@/server/data/chat-group-audit-rest";
export {
  setGroupMemberRoleRest as setGroupMemberRole,
  transferGroupOwnershipRest as transferGroupOwnership,
} from "@/server/data/chat-group-roles-rest";

export {
  getPublicGroupBySlugRest as getPublicGroupBySlug,
  joinPublicGroupRest as joinPublicGroup,
  listPublicGroupsRest as listPublicGroups,
} from "@/server/data/chat-discovery-rest";

export {
  getGroupCommunityRest as getGroupCommunity,
  setUserGroupProfileTagRest as setUserGroupProfileTag,
  setGroupBoostRest as setGroupBoost,
  setGroupPerkAllocationRest as setGroupPerkAllocation,
} from "@/server/data/chat-community-rest";
export {
  createGroupEmojiRest as createGroupEmoji,
  deleteGroupEmojiRest as deleteGroupEmoji,
  listGroupEmojisRest as listGroupEmojis,
} from "@/server/data/group-emojis-rest";
export {
  createGroupSoundRest as createGroupSound,
  deleteGroupSoundRest as deleteGroupSound,
  listGroupSoundsRest as listGroupSounds,
} from "@/server/data/group-sounds-rest";

export async function updateGroupCustomization(
  chatId: string,
  userId: string,
  patch: Parameters<typeof updateGroupCustomizationRest>[2],
) {
  const avatarKey =
    patch.avatarKey === undefined
      ? undefined
      : await resolvePublicMediaKey(patch.avatarKey, userId, "group-avatar");
  const bannerKey =
    patch.bannerKey === undefined
      ? undefined
      : await resolvePublicMediaKey(patch.bannerKey, userId, "banner");
  if (avatarKey || bannerKey) {
    const community = await getGroupCommunityRest(chatId, userId);
    if (
      avatarKey &&
      !community.animatedIconEnabled &&
      await isAnimatedPublicImageKey(avatarKey)
    ) {
      throw new Error("Сначала включите Boost-перк «Живой значок»");
    }
    if (
      bannerKey &&
      !community.animatedBannerEnabled &&
      await isAnimatedPublicImageKey(bannerKey)
    ) {
      throw new Error("Сначала включите Boost-перк «Живой баннер»");
    }
  }
  return updateGroupCustomizationRest(chatId, userId, {
    ...patch,
    avatarKey,
    bannerKey,
  });
}

export {
  acceptChatInviteRest as acceptChatInvite,
  createChatInviteRest as createChatInvite,
  enterChatRoomRest as enterChatRoom,
  getChatRoomRest as getChatRoom,
  heartbeatChatRoomRest as heartbeatChatRoom,
  leaveChatRoomRest as leaveChatRoom,
  previewChatInviteRest as previewChatInvite,
  revokeChatInviteRest as revokeChatInvite,
  setChatRoomAccessRest as setChatRoomAccess,
} from "@/server/data/chat-rooms-rest";

export {
  createChatRoomMediaTokenRest as createChatRoomMediaToken,
  createChatRoomScreenAudioTokenRest as createChatRoomScreenAudioToken,
} from "@/server/data/chat-room-media-rest";

export {
  declineChatRoomCallRest as declineChatRoomCall,
  listIncomingCallsRest as listIncomingCalls,
} from "@/server/data/chat-calls-rest";
