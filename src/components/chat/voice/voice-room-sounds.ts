type VoiceRoomSound = "join" | "leave";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export async function playVoiceRoomSound(sound: VoiceRoomSound) {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;

  try {
    const context = getAudioContext();
    if (context.state === "suspended") await context.resume();

    const now = context.currentTime;
    const frequencies = sound === "join" ? [440, 660] : [520, 330];
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    gain.connect(context.destination);

    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + 0.24);
    });
  } catch {
    // Browser autoplay policy may block non-essential room feedback.
  }
}
