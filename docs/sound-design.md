# Voople sound design

Voople earcons use **soft glass, warm pulse, and air**: a gentle attack, a warm
tonal body, and a short tail. They are short and conservative because Room
controls and messages recur throughout the day. Sound signals a meaningful
state; ordinary clicks, hover, navigation, typing, and panel opening stay quiet.

## Catalog

| Event | Meaning and contour |
| --- | --- |
| `room.join` | two soft layers open upward as someone enters |
| `room.leave` | the related layers settle downward |
| `room.mute` | brief damped, descending mic pulse |
| `room.unmute` | brief ascending mic pulse |
| `room.deafen` | heavier pair closes inward |
| `room.undeafen` | related pair opens outward |
| `notification.message` | small translucent message pulse |
| `notification.mention` | message family with a second, later note for priority |
| `notification.social` | the lightest, quietest cue |
| `call.incoming` | calm three-part motif for the receiver; repeats every 3 s |
| `call.outgoing` | quieter two-part waiting motif; repeats every 2.6 s |
| `call.connected` | short, upward resolution after media connects |
| `call.ended` | neutral downward closure after a confirmed conversation ends |
| `call.declined` | related two-step closure after an explicit decline |

Pairs share pitches and envelope shapes, while direction and weight distinguish
their meaning. Asset levels leave headroom; catalog gains remain below 0.5.
Presence events share a 350 ms cooldown. Repeated identical mic/output events
are suppressed briefly, while the opposite state replaces the previous cue.
Notifications share an 800 ms cooldown; higher-priority mentions can replace
social cues. Incoming and outgoing call motifs have managed stop handles and
silence between repeats.

## Packs and playback

The available packs are **Voople** (`default`: soft glass, warm pulse, air),
**Halo** (more air, a delayed translucent layer, slightly longer tails), and
**Velvet** (darker pitch, slower attack, quiet low-mid body). Each contains the
same 14 semantic sounds. Pack selection is stored with app preferences and
applies to product cues only. The shared policy owns gain, cooldown, priority,
concurrency, and loop interval; the pack selects the asset path.

The committed original files are in `public/sounds/packs/{default,halo,velvet}/*.wav`. Regenerate them
with `node scripts/generate-voople-sounds.mjs`; the generator uses deterministic
noise, 48 kHz mono 16-bit PCM, and no third-party sound samples. Run
`node --test tests/sound-foundation.test.mjs` to verify headers, duration,
levels, endpoints, and byte-for-byte reproducibility. The WAV files can be
opened directly in any local audio player for listening review.

To add a product cue, add a `ProductSoundId`, asset name and shared policy, add
a named generator definition, regenerate and commit the WAV in every pack, update this document and
the intended preference policy, then test it in the relevant event burst. Avoid
adding sound when state is already clear visually or a frequent action would
make the interface noisy.

Group Soundboard files are user media. They use an HTML media transport with
sequential playback, are resolved from the authorized Group list, and never
enter the trusted product asset cache. Upload and anti-spam rules remain owned
by their existing server and LiveKit paths.

The desktop renderer uses the selected pack for focused notifications and requests a
silent native toast in that case. Background native notifications retain the
Windows sound; they do not also trigger a WebView cue. The web notification
transport has no equivalent safe event owner yet.

For Direct Calls, the foreground receiver overlay owns `call.incoming`; the
caller controller owns `call.outgoing` while the existing phase is dialing.
Both stop on state change or unmount. `call.connected` plays once after the
existing server phase is active and local media is connected with two
participants. Confirmed local leave or an observed remote end can play
`call.ended`; explicit local or observed remote decline can play
`call.declined`. Cancelled and missed reasons remain quiet because this legacy
client boundary cannot consistently distinguish their intent. A later Direct
Call audit must verify all cross-device terminal transitions with two accounts.
On desktop, visible focused calls use the selected Voople motif; background
calls retain native Windows notification sound without layering a WebView loop.
