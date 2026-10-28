const preferenceKey = "neighbourly-sounds-enabled";
let audioContext;

export function soundsEnabled() {
  return localStorage.getItem(preferenceKey) !== "false";
}

export function setSoundsEnabled(enabled) {
  localStorage.setItem(preferenceKey, String(enabled));
}

export function playUiSound(kind = "tap") {
  if (!soundsEnabled() || typeof window.AudioContext !== "function") return;

  try {
    audioContext ||= new window.AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();

    const notes = {
      cafe: [523.25, 659.25],
      grocery: [392, 493.88],
      stationery: [440, 554.37],
      add: [659.25],
      toggle: [587.33],
      tap: [493.88]
    }[kind] || [493.88];
    const start = audioContext.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = start + index * 0.055;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.035, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.105);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.11);
    });
  } catch (error) {
    console.warn("Could not play the interface sound.", error);
  }
}
