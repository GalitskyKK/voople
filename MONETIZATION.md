# Monetization strategy

Voople monetizes identity and the shared experience of a small circle. Core
messaging, safe calls and basic profiles remain useful without payment. Paid
features must either make the user visibly recognizable or fund a measurable
increase in storage/media/voice cost.

## Current offer

- Voople+: 199 ₽ for 30 days or 1,990 ₽ for 365 days. The annual plan saves
  398 ₽ compared with twelve monthly purchases.
- The subscription currently requires manual renewal. UI and the offer must not
  imply automatic renewal until YooKassa recurring payments, consent and a
  cancellation flow are implemented end to end.
- Included value: app and chat themes, profile media/frames/name effects, the
  public Voople+ pin, expanded avatar history and one active group boost.
- A group boost follows the active subscription and unlocks group identity; it
  must never buy feed reach or bypass moderation.

## Revenue priorities

1. **Make existing value legible.** Use one `VooplePlusFeatureSurface` and
   `VooplePlusBadge` wherever a paid option appears. Show the real preview next
   to the upgrade action; never hide the value in a separate price page.
2. **Measure the purchase funnel.** Compare `vooplus_offer_viewed`,
   `vooplus_checkout_started`, `vooplus_checkout_ready` and authoritative
   successful YooKassa payment intents. No user identifier belongs in client
   telemetry.
3. **Improve retention before adding another catalog.** Add expiry reminders,
   safe recurring renewal with explicit consent, and a clear cancellation
   path. The annual plan should be recommended, not preselected deceptively.
4. **Strengthen group value.** Expand the single boost into a documented set of
   group identity perks (accent, banner, public tag, richer room appearance)
   only after active groups use the first boost. Keep moderation and privacy
   controls free.
5. **Sell cost-aligned quality.** After measuring LiveKit and storage cost, test
   higher screen-share quality, larger uploads and longer media retention for
   Voople+. Base voice quality and noise suppression remain available to all.

## Entitlement language

Paid surfaces use one visual grammar across web and desktop:

- `VooplePlusFeatureSurface` groups controls that are unlocked by Voople+;
- `VooplePlusBadge` marks an individual option or catalog item;
- the shop distinguishes `requiresSubscription` from ownership and one-time
  purchase. An item may be owned but still require an active subscription to
  equip;
- a locked feature should show a real preview and a direct route to the offer,
  not a vague disabled control.

The first non-cosmetic convenience benefit is expanded avatar history: three
recent avatars remain free, while an active Voople+ subscription keeps up to
twelve. Existing messages, calls, privacy, moderation and base voice quality
must not be downgraded to create artificial subscription pressure.

## Candidate benefits after measurement

Build these only behind a validated entitlement and after measuring demand:

- longer personal media history and larger upload limits, priced against real
  object-storage and traffic cost;
- extra saved profile presets and quick switching between them;
- richer group identity for the one boosted group (banner, accent and room
  appearance), never admin rights or moderation advantages;
- provider-neutral activity card styling and more profile activity slots;
- higher screen-share presets when the desktop capture pipeline and LiveKit
  cost are measured. Noise suppression and usable base quality remain free.

## Integration decision

Build provider-neutral Windows media presence first. It can show an opted-in
current track from compatible Spotify, Yandex Music or browser sessions without
provider OAuth. Basic presence should be free because it improves the network;
Voople+ may add card styling, additional profile slots and longer personal
history, not access to the user's own playback data.

Next, add opt-in local game detection against a signed Voople catalog. Spotify
OAuth is deferred until public quota access is viable. Do not use reverse-
engineered Yandex Music APIs and do not rebroadcast third-party audio.

## Decision gates

- Establish a two-week baseline before changing price or benefits.
- Track conversion by plan and payment completion, plus 30/90-day renewal.
- Compare subscription revenue with incremental media/voice/storage cost.
- Do not build marketplace complexity, advertisements or paid reach until the
  core small-circle retention loop is demonstrated.
