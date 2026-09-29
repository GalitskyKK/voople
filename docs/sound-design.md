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

Pairs share pitches and envelope shapes, while direction and weight distinguish
their meaning. Asset levels leave headroom; catalog gains remain below 0.5.
Presence events share a 350 ms cooldown. Local mic/output pairs replace their
previous cue, and notifications share an 800 ms cooldown.

The committed original files are in `public/sounds/ui/*.wav`. Regenerate them
with `node scripts/generate-voople-sounds.mjs`; the generator uses deterministic
noise, 48 kHz mono 16-bit PCM, and no third-party sound samples. Run
`node --test tests/sound-foundation.test.mjs` to verify headers, duration,
levels, endpoints, and byte-for-byte reproducibility. The WAV files can be
opened directly in any local audio player for listening review.

To add a product cue, add a `ProductSoundId` and its catalog entry, add a named
generator definition, regenerate and commit its WAV, update this document and
the intended preference policy, then test it in the relevant event burst. Avoid
adding sound when state is already clear visually or a frequent action would
make the interface noisy.

Group Soundboard files are user media. They use an HTML media transport with
sequential playback, are resolved from the authorized Group list, and never
enter the trusted product asset cache. Upload and anti-spam rules remain owned
by their existing server and LiveKit paths.

The desktop renderer uses Voople cues for focused notifications and requests a
silent native toast in that case. Background native notifications retain the
Windows sound; they do not also trigger a WebView cue. The web notification
transport has no equivalent safe event owner yet. Incoming-call ringtone and
its native lifecycle remain separate from this catalog.
