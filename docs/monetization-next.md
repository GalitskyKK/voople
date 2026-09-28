# Monetization: next contract

`PRODUCT.md` and the accepted direction in `docs/product-monetization.md` govern the next release. This note reconciles them with the older personal subscription and boost model; it authorizes no runtime entitlement change.

1. **Free core communication.** Basic Groups and Rooms, messages, voice, standard screen share, Split, Switch, Voop, invitations and Room guest entry stay useful without payment. Paid status grants no moderation or membership privilege.
2. **Voople+ and Group+.** Personal Voople+ remains a separate personal identity/utility offer where currently implemented. The next Group offer is Group-owned `Group+ Month` or a 24-hour `Group+ Day`. Higher supported media quality, more history/storage/presets and persistent Group identity are candidate Group+ value as specified in the accepted document. Shared contributions are later work; a payer is a funding source, not an owner.
3. **Grades.** No concrete Grades entitlement or progression contract appears in the accepted direction. Treat Grades as a proposed earned status layer reflecting real Group history, without a paid shortcut or grind mechanic. Define its data, abuse and presentation rules separately before implementation.
4. **Group Night.** A later event/acquisition layer, contingent on demand and the Night feature itself. Do not promise it in current purchase UI.
5. **Permanent packs.** Small permanent Group identity packs are part of the first planned monetization release. They remain with the Group after Group+ expires; personal cosmetics remain separate.

## Existing boost/level code

- **Reusable:** the pure limits and quality decision helpers in `src/lib/group-perks.ts` can inform cost and capability analysis. Identity assets and preview components can be reused after their entitlements are remapped to the accepted Group-owned model.
- **Legacy presentation:** `src/components/subscription/VooplePlusGroupLevels.tsx` and the personal-boost offer in `MONETIZATION.md` explain the existing 1/3/6/12/24 boost ladder. They are not the next Group+ sales contract.
- **Incompatible as next entitlement rules:** boost counts, slot allocation and milestone-locked Group perks in `src/lib/group-perks.ts` cannot determine Group+ Day/Month or permanent pack ownership. Existing runtime behavior remains until a separate migration is designed; do not silently swap its rules in this polish pass.

The prices in the accepted document are experiments, not product constants. No new price, Grade threshold or entitlement rule is set here.
