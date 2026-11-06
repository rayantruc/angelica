let audioContext;
const NOTES = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];

function audio() {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  } catch (_) { /* Audio is optional; the game remains playable without it. */ }
}

function note(index, volume = 0.07) {
  if (!audioContext) return;
  try {
    const frequency = NOTES[index % NOTES.length] * Math.pow(2, Math.floor(index / NOTES.length));
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.65);
  } catch (_) { /* Ignore browser audio restrictions. */ }
}
