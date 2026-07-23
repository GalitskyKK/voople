import { getAdminClient } from "@/lib/supabase/admin";
import { creditWalletRest } from "@/server/data/shop-rest";
import { extendVooplePlusRest, getSubscriptionStatusRest } from "@/server/data/subscription-rest";

async function resolveUser(usernameInput: string) {
  const username = usernameInput.trim().replace(/^@/, "");
  if (!username) throw new Error("Укажите username пользователя");

  const { data, error } = await getAdminClient()
    .from("users")
    .select("id, username, display_name")
    .ilike("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Пользователь не найден");
  return { id: data.id as string, username: data.username as string, displayName: data.display_name as string };
}

export async function getAdminUserSummaryRest(username: string) {
  const user = await resolveUser(username);
  const admin = getAdminClient();
  const [walletResult, subscription] = await Promise.all([
    admin
      .from("user_wallets")
      .select("balance_coins")
      .eq("user_id", user.id)
      .maybeSingle(),
    getSubscriptionStatusRest(user.id),
  ]);
  if (walletResult.error) throw new Error(walletResult.error.message);

  return {
    ...user,
    wallet: { balanceCoins: Number(walletResult.data?.balance_coins ?? 0) },
    subscription,
  };
}

export async function grantAdminCurrencyRest(input: {
  username: string;
  amount: number;
  adminUserId: string;
  note?: string;
}) {
  const user = await resolveUser(input.username);
  await creditWalletRest(user.id, input.amount, {
    type: "admin_grant",
    id: input.adminUserId,
    note: input.note?.trim() || `Начисление администратором для @${user.username}`,
  });
  return getAdminUserSummaryRest(user.username);
}

export async function grantAdminSubscriptionRest(input: {
  username: string;
  days: number;
  adminUserId: string;
}) {
  const user = await resolveUser(input.username);
  await extendVooplePlusRest(
    user.id,
    `admin:${input.adminUserId}:${crypto.randomUUID()}`,
    input.days,
    "admin",
  );
  return getAdminUserSummaryRest(user.username);
}
