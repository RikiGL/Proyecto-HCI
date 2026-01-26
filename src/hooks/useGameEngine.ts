import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { startCountdown, CancelFn } from "@/lib/utils";
import { gameApi } from "@/services/api";
import { playTone, successSound, errorSound, unlockAudio, playAlarm } from "@/services/audio";

export type GameState = "idle" | "playing" | "paused";

const USER_TURN_DURATION = 15;

const getMemorizeTime = (level: number) => {
    switch (level) {
        case 1: return 2000;
        case 2: return 2500;
        case 3: return 3000;
        default: return 4000;
    }
};

export const useGameEngine = (initialLevel: number = 1) => {
    // --- ESTADOS ---
    const [gameState, setGameState] = useState<GameState>("idle");
    const [level, setLevel] = useState(initialLevel);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [lossStreak, setLossStreak] = useState(0);
    const [isInputAllowed, setIsInputAllowed] = useState(false);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerResetKey, setTimerResetKey] = useState(0);
    const [isPausedForMessage, setIsPausedForMessage] = useState(false);

    // Stats
    const [currentHits, setCurrentHits] = useState(0);
    const [currentErrors, setCurrentErrors] = useState(0);
    const [totalHits, setTotalHits] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);

    // UI
    const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
    const [prepMessage, setPrepMessage] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    // Refs
    const prevHits = useRef(0);
    const prevErrors = useRef(0);
    const prevLevel = useRef(level);
    const prevBackendStatus = useRef<string>("idle");
    const cancelRef = useRef<CancelFn | null>(null);
    const roundStart = useRef(0);
    const flowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const roundPending = useRef(false);
    const showOverlay = (msg: string, duration = 2000) => {
        setOverlayMessage(msg);
        setTimeout(() => setOverlayMessage(null), duration);
    };

    // --- SISTEMA DE MENSAJES MOTIVACIONALES ---
    const triggerMotivation = (type: "win" | "loss", value: number) => {
        let message = "";
        const pauseDuration = 3000;

        if (type === "win") {
            if ([3, 5, 10, 15, 20].includes(value)) {
                const texts = ["¡ESTÁS EN FUEGO! 🔥", "¡IMPARABLE! 🚀", "¡GENIO TOTAL! 🧠", "¡LEYENDA! 🏆"];
                message = texts[Math.min(Math.floor(value / 5), texts.length - 1)];
            }
        }

        if (type === "loss") {
            // Mensajes cada 2 derrotas seguidas (2, 4, 6...)
            if (value % 2 === 0 && value > 0) {
                const texts = ["RESPIRA HONDO 🧘", "TÚ PUEDES 💪", "NO TE RINDAS 🛡️", "INTENTA DE NUEVO 🔄"];
                message = texts[Math.min(Math.floor(value / 2) - 1, texts.length - 1)];
            }
        }

        if (message) {
            setIsPausedForMessage(true);
            showOverlay(message, pauseDuration);
            setTimeout(() => {
                setIsPausedForMessage(false);
            }, pauseDuration);
            return true;
        }
        return false;
    };

    const hardReset = () => {
        gameApi.reset();
        if (flowTimeoutRef.current) clearTimeout(flowTimeoutRef.current);
        setGameState("idle");
        setLevel(initialLevel);
        setScore(0);
        setStreak(0);
        setLossStreak(0);
        setCurrentHits(0);
        setCurrentErrors(0);
        setTotalHits(0);
        setTotalErrors(0);
        setPrepMessage(null);
        setCountdown(null);
        setResultMessage(null);
        setIsTimerActive(false);
        setIsInputAllowed(false);
        setIsPausedForMessage(false);
        roundPending.current = false; // Reset pending
        prevHits.current = 0;
        prevErrors.current = 0;
        prevLevel.current = initialLevel;
        prevBackendStatus.current = "idle";
    };

    const waitCountdown = (from: number, onTick: (v: number) => void) =>
        new Promise<void>((resolve) => {
            cancelRef.current?.();
            cancelRef.current = startCountdown(from, onTick, () => {
                cancelRef.current = null;
                resolve();
            });
        });

    const startRoundFlow = useCallback(() => {
        setIsTimerActive(false);
        setIsInputAllowed(false);
        setPrepMessage("👀 Memoriza");

        if (flowTimeoutRef.current) clearTimeout(flowTimeoutRef.current);
        const duration = getMemorizeTime(level);

        flowTimeoutRef.current = setTimeout(async () => {
            try { await gameApi.startTurn(); } catch (e) { console.error(e); }

            playTone(800, 0.1);
            setPrepMessage("TU TURNO");
            setTimerResetKey(k => k + 1);
            setIsTimerActive(true);
            setIsInputAllowed(true);
            roundStart.current = Date.now();
        }, duration);
    }, [level]);

    /* ---------- POLLING CORREGIDO ---------- */
    useEffect(() => {
        if (gameState !== "playing") return;

        const interval = setInterval(async () => {
            try {
                const data = await gameApi.getStatus();
                const backendStatus = data.status;

                setCurrentHits(data.user_input?.length ?? 0);
                setCurrentErrors(data.errors ?? 0);

                // 1. ÉXITO
                if (backendStatus === "success" && prevBackendStatus.current !== "success") {
                    setIsTimerActive(false);
                    setIsInputAllowed(false);
                    successSound();

                    // Scores
                    setScore(s => s + 10);

                    // 🔥 CORRECCIÓN VICTORIA: Si venía de negativa, salta a 1. Si no, suma 1.
                    setStreak(prev => prev < 0 ? 1 : prev + 1);
                    setLossStreak(0); // Reset racha de pérdidas

                    // Para el mensaje motivacional usamos el valor calculado (prev + 1 aprox)
                    // Como setStreak es asíncrono, usamos streak + 1 de la variable del scope si era positiva
                    const estimatedStreak = streak < 0 ? 1 : streak + 1;
                    const hasMessage = triggerMotivation("win", estimatedStreak);

                    setPrepMessage("¡CORRECTO!");
                    if (!hasMessage) showOverlay("🌟 ¡Bien hecho!", 1500);

                    try {
                        const payload = {
                            nivel: level,
                            aciertos: data.user_input.length,
                            errores: data.errors,
                            tiempo: (Date.now() - roundStart.current) / 1000,
                            racha: estimatedStreak
                        };
                        const res = await gameApi.predict(payload);
                        const mlData = await res.json();
                        if (mlData.nuevo_nivel !== undefined) {
                            setLevel(mlData.nuevo_nivel);
                            prevLevel.current = mlData.nuevo_nivel;
                        }
                    } catch (e) { console.error(e); }
                }

                // 2. FALLO
                if (backendStatus === "failed" && prevBackendStatus.current !== "failed") {
                    setIsTimerActive(false);
                    setIsInputAllowed(false);
                    errorSound();

                    setScore(s => Math.max(0, s - 5));

                    // 🔥 CORRECCIÓN DERROTA: Baja a negativos (-1, -2, -3...)
                    setStreak(prev => prev > 0 ? -1 : prev - 1);

                    const newLossStreak = lossStreak + 1;
                    setLossStreak(newLossStreak);

                    const hasMessage = triggerMotivation("loss", newLossStreak);

                    setPrepMessage("❌ FALLASTE");
                    if (!hasMessage) showOverlay("❌ Vamos que se puede", 2000);

                    gameApi.predict({
                        nivel: level,
                        aciertos: data.user_input?.length || 0,
                        errores: data.errors || 1,
                        tiempo: (Date.now() - roundStart.current) / 1000,
                        racha: -newLossStreak
                    });
                }

                // 3. NUEVA RONDA

                const isBackendTransition =
                    (prevBackendStatus.current === "success" || prevBackendStatus.current === "failed") &&
                    (backendStatus === "playing" || backendStatus === "memorizing");
                if (isBackendTransition) {
                    if (isPausedForMessage) {
                        // Si estamos leyendo mensaje, GUARDAMOS la ronda para después
                        console.log("Ronda nueva detectada, pero estamos en pausa. Guardando...");
                        roundPending.current = true;
                    } else {
                        // Si no hay pausa, iniciamos normal
                        if (data.level !== level) setLevel(data.level);
                        startRoundFlow();
                    }
                }

                // 4. REINTENTO DE RONDA PENDIENTE
                // Si ya no hay pausa Y tenemos una ronda pendiente -> EJECUTARLA
                if (!isPausedForMessage && roundPending.current) {
                    console.log("Reanudando ronda pendiente...");
                    if (data.level !== level) setLevel(data.level);
                    startRoundFlow();
                    roundPending.current = false; // Limpiar bandera
                }

                prevHits.current = data.user_input?.length ?? 0;
                prevBackendStatus.current = backendStatus;

            } catch { console.warn("Backend sync error"); }
        }, 300);

        return () => clearInterval(interval);

        // 🔥 IMPORTANTE: lossStreak y isPausedForMessage AÑADIDOS AQUI
    }, [gameState, streak, lossStreak, level, isPausedForMessage, startRoundFlow]);

    /* ---------- HANDLERS ---------- */
    const handlePlaySequence = async () => {
        unlockAudio();
        playTone(523.25);
        setGameState("playing");
        setResultMessage(null);
        setIsTimerActive(false);
        setIsInputAllowed(false);
        prevBackendStatus.current = "idle";
        setPrepMessage("Preparando...");
        await waitCountdown(3, setCountdown);
        setCountdown(null);
        try {
            await gameApi.startGame(level);
            toast({ title: "🎮 Juego iniciado" });
            startRoundFlow();
        } catch (e) {
            console.error(e);
            setGameState("idle");
        }
    };

    const handleTimeUp = useCallback(async () => {
        if (gameState !== "playing") return;
        playAlarm();
        showOverlay("⏰ ¡Tiempo Agotado!", 1500);
        setIsTimerActive(false);
        setIsInputAllowed(false);
        setPrepMessage("⏳ Tiempo fuera...");

        // 🔥 CORRECCIÓN TIMEOUT: También baja la racha a negativo
        setStreak(prev => prev > 0 ? -1 : prev - 1);

        const newLoss = lossStreak + 1;
        setLossStreak(newLoss);
        triggerMotivation("loss", newLoss);

        try {
            setTimeout(async () => {
                if (!isPausedForMessage) {
                    await gameApi.startGame(level);
                    startRoundFlow();
                }
            }, 2000);
        } catch (e) { console.error(e); }

    }, [gameState, level, startRoundFlow, lossStreak, isPausedForMessage]);

    return {
        gameState, setGameState, level, score,
        stats: { currentHits, currentErrors, streak, lossStreak, totalHits, totalErrors },
        ui: { overlayMessage, prepMessage, countdown, resultMessage },
        actions: { handlePlaySequence, hardReset },
        timer: { isActive: isTimerActive, duration: USER_TURN_DURATION, onTimeUp: handleTimeUp, resetKey: timerResetKey },
        controls: { isInputAllowed }
    };
};