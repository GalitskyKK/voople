# Voople monetization direction

Status: accepted product direction; prices are hypotheses, and this document does not authorize billing or entitlement changes in the beta polish release. `PRODUCT.md` remains the canonical source for current product behavior.

## Free core

Basic Groups and Rooms, ordinary voice and screen share, Split, Switch, Voop, invitations and guest entry remain useful without payment. Payment never grants ownership, admin, moderation or other governance permissions.

## Personal plans and Group charges

- **Voople+ Style:** personal identity and styling benefits; approximately 149 RUB per month is a price hypothesis.
- **Voople+:** personal premium capabilities across Voople; approximately 299 RUB per month is a price hypothesis. It includes exactly **one active Group charge**.
- **Additional Group charge:** a standalone contribution to one Group; approximately 99 RUB per month is a price hypothesis. The UI concept is **«Добавить заряд группе»**.

An included Voople+ charge is assigned to one Group and remains active only while that Voople+ subscription is active. Its owner may reassign it no more often than once every seven days. A charge is a contribution to the Group, not a purchase of control over it.

**Voople+ = мои premium-возможности везде. Grade = premium-возможности всех участников здесь, внутри этой Group.** For example, a personal Voople+ capability may provide 1080p60 to that user everywhere, while Grade III may provide 1080p60 to everyone while inside that Group. The specific media entitlement still requires a separate technical and cost decision before implementation.

## Charge-derived Grades

| Active Group charges | Derived Grade |
| --- | --- |
| 0 | Basic |
| 1–2 | Grade I |
| 3–4 | Grade II |
| 5 or more | Grade III (maximum) |

The Group Grade is derived from its active charges. It is not an earned progression track or a separate Group subscription. A purchase cannot bypass safety, privacy or moderation rules.

## Group Night and downgrade

**Group Night** is a qualified referral/use acquisition trial, not a product SKU. A qualifying milestone temporarily grants Grade III. At expiry, the Group returns to the Grade derived from its real active charges. Eligibility, abuse resistance and duration require a separate product and server contract before launch.

Downgrade never deletes Group assets, identity, Room presets, vanity preference or customization data. Grade-dependent capabilities can become inactive or read-only and reactivate when the Grade rises again. Preserve settings and saved content through expiry, reassignment and payment recovery.

## Legacy and implementation boundary

The former `Group+ Day` and `Group+ Month` offers and 1/3/6/12/24 boost ladder are **legacy/deprecated product proposals**, not the accepted sales or Grade contract. Existing runtime boosts and entitlements remain technical migration context only; do not infer the new Grades from those legacy levels. `MONETIZATION.md` records historical strategy. Neither the trial nor the hypothetical prices should be hardcoded into domain logic.

The Group Grade runtime foundation stores independent charges and derives Grade
through a protected member-only read API. It does not issue charges from existing
subscriptions or convert legacy Boosts. Billing, YooKassa, recurring payments,
charge issuance/reassignment, Group Night runtime and paywalls still require
separate implementation and review. Premium Grade capabilities remain explicitly
unconfigured until an accepted benefit matrix exists.
