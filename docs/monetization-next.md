# Monetization direction for the next release

`PRODUCT.md` defines current beta behavior. The accepted future monetization contract is in [`product-monetization.md`](./product-monetization.md).

- Voople+ Style is a personal styling plan (~149 RUB/month hypothesis).
- Voople+ is a personal premium plan (~299 RUB/month hypothesis) with exactly one active, assignable Group charge. Reassignment is limited to once per seven days while the plan remains active.
- Users can contribute additional standalone Group charges (~99 RUB/month hypothesis) with the UI action «Добавить заряд группе».
- Active charge counts derive the Group Grade: 0 Basic, 1–2 Grade I, 3–4 Grade II, 5+ Grade III. Grade benefits apply inside the Group to its participants; personal Voople+ benefits apply to the subscriber everywhere.
- Group Night is a qualified, temporary Grade III acquisition trial, not a SKU. At expiry the Group returns to its charge-derived Grade.
- Downgrade keeps assets, Group identity, Room presets, vanity preference and customization data. Grade-dependent use may pause or become read-only.
- Buying a plan or charge grants no Group governance permission.

`Group+ Day`, `Group+ Month` and the 1/3/6/12/24 boost ladder are legacy/deprecated proposals. Existing boost code is migration context, not the new Grade contract. These are documentation decisions only; this PR does not implement billing, Grades or paywalls.
