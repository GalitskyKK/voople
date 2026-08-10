# Voice and video release test

Run this checklist before publishing a desktop release that changes calls,
devices, camera, screen sharing, heartbeat or the media stage. A local preview
is not sufficient: use two different accounts on two physical devices and, if
possible, different networks.

## Preparation

- Device A: current desktop production candidate.
- Device B: deployed web client in a Chromium browser.
- Two accounts that can open the same direct chat and group.
- DevTools/terminal available on both sides, but do not log LiveKit tokens.
- Record app version, Windows/browser version, input/output device names and
  whether VPN/proxy is active.

## Direct-call matrix

1. A calls B; B sees one incoming call and answers.
2. Repeat with B calling A.
3. Decline, cancel before answer and let one call become missed.
4. Verify the timer starts from the authoritative room start and agrees on both
   clients within two seconds.
5. Toggle A and B microphones independently. The remote mute indicator must
   match the actual published audio every time.
6. Change microphone and output device during the call. Audio must continue
   without rejoining.
7. Set the other participant volume to 0%, 100% and 200%; local recording or
   system volume must not change.
8. Minimize the room and navigate through feed, profile, shop and settings. The
   mini stage remains movable, controls still work and opening it restores the
   room.

## Camera and screen sharing

1. Publish each camera separately, then both simultaneously.
2. Confirm video uses `contain` when cropping would remove content and that a
   participant can switch between grid and focused size.
3. Share the entire screen and one application window from each supported
   client. The remote side must not show a permanent black frame.
4. Publish camera and screen together. Select each tile as focused and return to
   the grid without stopping either track.
5. Stop sharing from the operating-system picker and from Voople. The remote
   tile must disappear in both cases.

## Network and lifecycle

1. Disable network on A for 10 seconds, restore it and verify reconnect without
   duplicate participants or stale mute state.
2. Suspend/minimize the desktop app long enough to miss heartbeats, restore it
   and verify reconciliation.
3. Close A normally, then terminate it once through Task Manager. B must remove
   the stale participant after the configured timeout.
4. Rejoin the same room three times and confirm there is one audio element,
   camera track and screen track per participant, with no echo.
5. Leave from B, then A. The server room becomes empty and the call dock closes.

## Audio quality sample

For every input-device mode, record the same 30-second script on the remote
side: five seconds silence, normal speech, keyboard typing while speaking,
speech from a loudspeaker and a clipped loud phrase. Compare noise suppression,
speech loss, pumping, echo and latency with RNNoise disabled/enabled. Keep the
raw samples; subjective memory is not a repeatable quality test.

## Failure report

Include: exact step, local/remote account role, connection state, published and
subscribed track kinds, server heartbeat response status, device labels and a
timestamp. Never include access tokens, LiveKit credentials or private media
URLs.
