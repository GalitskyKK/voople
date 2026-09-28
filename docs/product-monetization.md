# Voople monetization decision

Status: accepted direction, beta scope is explicitly limited below.

## Product rule

Voople monetizes the repeated value and identity of a stable Group. It does not
sell access to the social graph or to the basic communication loop.

The following remain free:

- Groups and basic Room creation;
- voice and standard screen share;
- Split, Switch and Voop;
- planned Rooms;
- person, Group and guest-link invitations;
- guest web entry;
- basic Group identity;
- enough recent history to make the free product complete.

No early coins, loot boxes, battle pass, energy, paid streaks, random drops or
per-member requirement are permitted.

## Launch model

The first monetization release contains only:

1. `Group+ Month` owned by one Group;
2. `Group+ Day` for the same Group for 24 hours;
3. a small catalog of permanent Group identity packs.

Example price points (`€1.99 / day`, `€6.99–7.49 / month`) are experiments,
not product constants.

`Group+ Day` is the low-friction product trial. A Group may earn one card-free
Day only after qualified, repeated use. The exact eligibility thresholds are
configurable server-side and require production evidence before being fixed as
product constants. The trial unlocks the full Group+ experience,
not a reduced demo. Choices made during the trial remain saved after expiry,
but paid presentation and utility become inactive.

Monthly value must be cumulative and recurring:

- persistent Group identity across Rooms, sidebar, invitations and guest entry;
- 1080p60 screen share and higher supported media quality;
- longer Group and session history;
- larger media storage;
- more saved Room presets and identity slots;
- one Group Night per paid month only after Night itself is shipped.

The product may show an exact usage comparison after repeated Day purchases,
and may credit a recent Day purchase toward the first month where the payment
provider supports that safely. It must not use false countdowns or takeover
modals.

## Promotional Group+ acquisition — design only

Do not issue a promotional reward for signup, creating a Group or sending one
invite. A qualified `Group+ Day` unlock should require server-configured
milestones such as distinct participants, a meaningful simultaneous voice
session, useful shared duration and activity on two distinct days or a second
useful session. Promotion policy controls one-time issuance and cooldown. The
illustrative values below are UI examples, **not fixed eligibility thresholds**:

```text
Group+ на 24 часа
2/3 участников
24/30 минут вместе
1/2 совместных дней
[progress]
```

Show only understandable, positive milestones. Do not reveal device
fingerprints, IP/network risk, account/payment signals or the internal risk
score. Do not use fake countdowns or FOMO. Product progress is not an
anti-abuse decision: visible milestones can be complete while the server
withholds a promotional reward for abuse.

Future anti-abuse issuance is Group-bound, idempotent and subject to cooldown.
It must deduplicate repeatedly recreated cohorts; a suspicious new Group does
not reset eligibility. Device, account, payment and network risk signals belong
only to the protected server decision, not product analytics or UI. This section
does **not** authorize fingerprinting or a reward engine in the current beta
slice.

## Ownership

An entitlement belongs to the Group. The payer is only the payment source.
Leaving the Group does not transfer or revoke the paid period. Payment never
grants owner or admin permissions.

Permanent Group assets stay with the Group after Group+ ends. Personal assets
remain a separate economy for profile and personal expression.

## Contributions

Shared recurring contributions are a follow-up slice, not beta scope. The
eventual model is independent provider subscriptions whose active share counts
produce one Group entitlement. There is no internal wallet and no member-to-
member transfer.

Requirements before shipping contributions:

- one payer can fund all required shares;
- multiple members can fund the threshold;
- a grace period prevents immediate Group+ loss when one share ends;
- each member controls only their payment;
- entitlement calculation is idempotent and provider-webhook authoritative;
- cancellation and Group departure have explicit ownership behaviour.

## Later layers

The following require proven retention or demand and are not beta promises:

- Group Night as a gift/acquisition session;
- gifts for Day, Month and permanent packs;
- relationship-owned cosmetics for two recurring Groups;
- creator marketplace and brand packs;
- additional storage add-ons;
- advanced contribution levels;
- session-only premium passes.

Earned identity may reflect real Group history (age, useful sessions, recurring
Group-to-Group use). It must not become a grind or daily-quest system.

## Product surfaces

Purchase UI lives in context:

- Group header opens a short `Group+` sheet;
- quality selection can show standard and Group+ streaming options;
- customization previews an asset inside the current Group or Room;
- invite and guest pages display identity already owned by that Group.

The app does not need a permanent in-product pricing page for the initial
release.

## Metrics

The primary monetization denominator is retained active Groups, not users.

Required funnels:

- qualified Group → first Day activation;
- Day → Month conversion after 24 hours and 7 days;
- Day → second Day → Month;
- paid active Groups / retained active Groups;
- Group+ churn and entitlement recovery;
- one-payer versus multi-contributor funding;
- average contributors per paid Group;
- Night opened → qualified session → saved Group → second session → paid,
  only once Night ships.

Raw payment identifiers, provider payloads, private Room identifiers and member
lists must not enter product analytics.
