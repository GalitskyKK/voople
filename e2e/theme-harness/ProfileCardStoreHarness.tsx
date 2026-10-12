import React from "react";
import { CustomizationEditor } from "@/components/customization/CustomizationEditor";
import { trpc } from "@/lib/trpc/client";

export function ProfileCardStoreHarness() {
  const utils = trpc.useUtils();
  const equipped = trpc.customization.getEquipped.useQuery(undefined, { retry: false });
  return <>
    <button onClick={() => void utils.customization.getEquipped.invalidate()}>Refresh card access</button>
    {equipped.data ? <CustomizationEditor items={[]} equipped={equipped.data} onEquip={() => {}} onClearSlot={() => {}} /> : null}
  </>;
}
