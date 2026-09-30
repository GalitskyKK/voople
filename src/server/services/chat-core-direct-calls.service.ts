import "server-only";

import {
  getDirectRecipientForPreviewRest,
  startCoreDirectCallRest,
} from "@/server/data/core-direct-calls-rest";

export async function startCoreDirectCall(input: {
  conversationId: string; callerId: string; requestId: string;
}) {
  const recipientId = await getDirectRecipientForPreviewRest(input.conversationId, input.callerId);
  const previewUsers = new Set((process.env.VOOPLE_INTERNAL_USER_IDS ?? "")
    .split(",").map((id) => id.trim().toLowerCase()).filter(Boolean));
  if (!previewUsers.has(input.callerId.toLowerCase()) || !previewUsers.has(recipientId.toLowerCase())) {
    throw new Error("Личный звонок пока недоступен собеседнику");
  }
  return startCoreDirectCallRest({ ...input, expectedRecipientId: recipientId });
}

export {
  answerCoreDirectCallRest as answerCoreDirectCall,
  coreDirectCallRoomViewRest as coreDirectCallRoomView,
  expireCoreDirectCallsRest as expireCoreDirectCalls,
  finishCoreDirectCallRest as finishCoreDirectCall,
  getActiveCoreDirectCallRest as getActiveCoreDirectCall,
  getCoreDirectCallRest as getCoreDirectCall,
  listCoreIncomingCallsRest as listCoreIncomingCalls,
} from "@/server/data/core-direct-calls-rest";
export { createCoreDirectCallMediaTokenRest as createCoreDirectCallMediaToken }
  from "@/server/data/chat-room-media-rest";
export { createCoreDirectCallScreenAudioTokenRest as createCoreDirectCallScreenAudioToken }
  from "@/server/data/chat-room-media-rest";
export { heartbeatGroupRoomRest as heartbeatCoreDirectCall }
  from "@/server/data/group-room-mutations-rest";
