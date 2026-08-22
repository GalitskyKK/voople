import { getAdminClient } from "@/lib/supabase/admin";

type RowFilter = {
  column: string;
  value: string;
};

const PAGE_SIZE = 500;

async function fetchOwnedRows(
  table: string,
  columns: string,
  filter: RowFilter,
) {
  const admin = getAdminClient();
  const rows: unknown[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .eq(filter.column, filter.value)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function buildAccountDataExport(input: {
  userId: string;
  email: string | null;
  authCreatedAt: string | null;
  lastSignInAt: string | null;
}) {
  const userId = input.userId;
  const [
    profile,
    customization,
    currentStatus,
    statusHistory,
    posts,
    comments,
    likes,
    cardReactions,
    drawings,
    receivedQuestions,
    askedQuestions,
    followsFrom,
    followsTo,
    playlist,
    memberships,
    sentMessages,
    messageReactions,
    inventory,
    badges,
    subscription,
    wallet,
    walletTransactions,
    paymentIntents,
    notifications,
    legalConsents,
    deletionRequests,
    interests,
    privacySettings,
    contactPins,
  ] = await Promise.all([
    fetchOwnedRows("users", "id, username, display_name, bio, pinned_thought, show_online_status, created_at, updated_at", { column: "id", value: userId }),
    fetchOwnedRows("profile_customization", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("user_status", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("status_history", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("posts", "*", { column: "author_id", value: userId }),
    fetchOwnedRows("post_comments", "*", { column: "author_id", value: userId }),
    fetchOwnedRows("likes", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("card_reactions", "*", { column: "reactor_user_id", value: userId }),
    fetchOwnedRows("profile_canvas_strokes", "*", { column: "author_id", value: userId }),
    fetchOwnedRows("profile_questions", "id, profile_user_id, question_text, answer_text, answered_at, is_hidden, created_at", { column: "profile_user_id", value: userId }),
    fetchOwnedRows("profile_questions", "id, profile_user_id, question_text, answer_text, answered_at, is_hidden, created_at", { column: "asker_id", value: userId }),
    fetchOwnedRows("follows", "*", { column: "follower_id", value: userId }),
    fetchOwnedRows("follows", "*", { column: "following_id", value: userId }),
    fetchOwnedRows("playlist_tracks", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("chat_members", "chat_id, role, joined_at", { column: "user_id", value: userId }),
    fetchOwnedRows("messages", "*", { column: "sender_id", value: userId }),
    fetchOwnedRows("message_reactions", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("user_inventory", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("user_badges", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("subscriptions", "user_id, tier, started_at, expires_at, payment_provider", { column: "user_id", value: userId }),
    fetchOwnedRows("user_wallets", "balance_coins, updated_at", { column: "user_id", value: userId }),
    fetchOwnedRows("wallet_transactions", "id, amount, balance_after, kind, reference_type, reference_id, note, created_at", { column: "user_id", value: userId }),
    fetchOwnedRows("payment_intents", "id, kind, amount_rub, status, provider, metadata, created_at, updated_at", { column: "user_id", value: userId }),
    fetchOwnedRows("notifications", "*", { column: "user_id", value: userId }),
    fetchOwnedRows("user_legal_consents", "privacy_version, terms_version, source, recorded_at", { column: "user_id", value: userId }),
    fetchOwnedRows("account_deletion_requests", "status, requested_at, execute_after, cancelled_at, completed_at", { column: "user_id", value: userId }),
    fetchOwnedRows("user_interests", "interest_slug, selected_at", { column: "user_id", value: userId }),
    fetchOwnedRows("user_privacy_settings", "online_scope, gaming_scope, music_scope, rooms_scope, invite_scope, connection_request_scope, appear_in_recommendations, show_interests, updated_at", { column: "user_id", value: userId }),
    fetchOwnedRows("user_contact_pins", "pinned_user_id, position, created_at", { column: "user_id", value: userId }),
  ]);

  return {
    format: "voople-account-export",
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    account: {
      id: userId,
      email: input.email,
      authCreatedAt: input.authCreatedAt,
      lastSignInAt: input.lastSignInAt,
    },
    explanation: {
      media: "Медиафайлы не дублируются в архиве; сохранены принадлежащие аккаунту ссылки.",
      chats: "Экспорт содержит ваши членства и отправленные вами сообщения, но не копирует сообщения других участников.",
      anonymousQuestions: "Идентификаторы авторов входящих анонимных вопросов намеренно исключены.",
      secrets: "Пароли, сессионные токены и внутренние платёжные идентификаторы исключены.",
    },
    data: {
      profile,
      customization,
      currentStatus,
      statusHistory,
      posts,
      comments,
      likes,
      cardReactions,
      drawings,
      receivedQuestions,
      askedQuestions,
      follows: { outgoing: followsFrom, incoming: followsTo },
      playlist,
      chats: { memberships, sentMessages, reactions: messageReactions },
      purchases: {
        inventory,
        badges,
        subscription,
        wallet,
        walletTransactions,
        paymentIntents,
      },
      notifications,
      legalConsents,
      deletionRequests,
      interests,
      privacySettings,
      contactPins,
    },
  };
}
