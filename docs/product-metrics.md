# Voople product metrics

Updated: 2026-09-21. This document defines product decisions, not a catalogue
of UI clicks. Metrics are computed only from server-authoritative milestones;
client telemetry remains useful for performance and reliability diagnostics.

## Product question

Voople succeeds when an existing company of friends can start a useful voice
conversation with little coordination and returns to do it again. The primary
unit is therefore the **Group**, not a page view, account or message.

## North-star and guardrails

| Metric | Definition | Why it matters |
| --- | --- | --- |
| Weekly recurring voice Groups | Unique Groups with server voice activity on at least two distinct days in one week | Measures a repeated group habit rather than launch traffic |
| Social voice Groups | Unique Groups where at least two distinct members joined voice during the period | Excludes solo setup/testing |
| Group voice activation | New Groups with at least two distinct members joining voice within 24 hours | Measures time-to-first shared value |
| W1 Group retention | New Groups with server product activity during days 7–13 after creation | Measures whether the company survives its first week |
| Room Switch rate | Server-confirmed Switch transitions / successful Room joins | Validates multi-Room navigation without treating button clicks as success |

Guardrails are join failure rate, reconnect failure rate, median time from
invite open to media connection, guest abuse reports, client error rate and
p75 Core Web Vitals. Growth must not improve by making Rooms less reliable or
weakening privacy.

## Core funnels

1. **Group:** created/joined → first Room join → second distinct member joins →
   activity on another day → W1 return.
2. **Invite:** invite issued → opened → accepted/joined → media connected →
   useful participation with another person for at least three minutes →
   optional account conversion.
3. **Split / Switch / Voop:** action offered → server mutation succeeds → target
   accepts where required → both participants reach media → conversation lasts
   long enough to be useful.
4. **Frequent Room:** eligible recurring composition detected → suggestion shown
   → `Собрать` used → invite acceptance → useful voice session. Detection alone
   is not success and never creates a Group.

## Privacy and correctness

- Raw user, Group, Room, Invite, media and message identifiers are forbidden in
  analytics properties.
- `actor_key` and `subject_key` are independently domain-separated HMAC values.
- Conversion and retention use server events and idempotency keys. Client
  clicks may explain UX friction but cannot declare a successful join.
- Message text, filenames, URLs, auth payloads, voice content and private media
  addresses are never recorded.
- Product views are available only to `service_role`; browser roles have no
  table or view grants.

## Current implementation

Migration 71 introduces privacy-safe Group subjects and three query-ready
views: weekly Group health, 24-hour Group voice activation and W1 Group
retention. Core Group creation and Room create/join/switch mutations emit the
server milestones. Invite, deferred Split acceptance, Frequent Room and Group+
economy funnels remain follow-up slices and must extend this contract rather
than add parallel telemetry.
