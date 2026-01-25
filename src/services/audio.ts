const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const unlockAudio = () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
};

export const playTone = (freq: number, duration = 0.18) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.value = freq;
    osc.type = "triangle";

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

export const successSound = () => {
    playTone(700);
    setTimeout(() => playTone(1000), 120);
};
export const playAlarm = () => {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, now); // Nota alta
    osc.frequency.linearRampToValueAtTime(440, now + 0.5); // Baja de tono (efecto sirena)

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
};
export const errorSound = () => playTone(250, 0.25);