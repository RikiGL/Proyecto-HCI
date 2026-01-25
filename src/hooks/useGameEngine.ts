// src/hooks/useGameEngine.ts
import { useState, useRef, useEffect, useCallback } from "react"; import { toast } from "@/components/ui/use-toast";
import { startCountdown, CancelFn } from "@/lib/utils";
import { gameApi } from "@/services/api"; // Importamos el servicio
import { playTone, successSound, errorSound, unlockAudio } from "@/services/audio"; // Importamos audio
import { playAlarm } from "@/services/audio"; // Importamos la alarma
export type GameState = "idle" | "playing" | "paused";
const ROUND_DURATION = 10;
export const useGameEngine = (initialLevel: number = 1) => {
    /* ---------- State ---------- */
    const [gameState, setGameState] = useState<GameState>("idle");
    const [level, setLevel] = useState(initialLevel);
    const [score, setScore] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerResetKey, setTimerResetKey] = useState(0);
    // Estadísticas
    const [currentHits, setCurrentHits] = useState(0);
    const [currentErrors, setCurrentErrors] = useState(0);
    const [streak, setStreak] = useState(0);
    const [totalHits, setTotalHits] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);

    // Mensajes UI
    const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
    const [prepMessage, setPrepMessage] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    /* ---------- Refs ---------- */
    const prevHits = useRef(0);
    const prevErrors = useRef(0);
    const prevLevel = useRef(level);
    const cancelRef = useRef<CancelFn | null>(null);
    const roundStart = useRef(0);

    /* ---------- Helpers ---------- */
    const showOverlay = (msg: string, duration = 2000) => {
        setOverlayMessage(msg);
        setTimeout(() => setOverlayMessage(null), duration);
    };

    const hardReset = () => {
        gameApi.reset(); // Reseteamos backend también
        setGameState("idle");
        setLevel(initialLevel);
        setScore(0);
        setCurrentHits(0);
        setCurrentErrors(0);
        setStreak(0);
        setTotalHits(0);
        setTotalErrors(0);
        setPrepMessage(null);
        setCountdown(null);
        setResultMessage(null);

        prevHits.current = 0;
        prevErrors.current = 0;
        prevLevel.current = initialLevel;
    };

    const waitCountdown = (from: number, onTick: (v: number) => void) =>
        new Promise<void>((resolve) => {
            cancelRef.current?.();
            cancelRef.current = startCountdown(from, onTick, () => {
                cancelRef.current = null;
                resolve();
            });
        });

    /* ---------- Effects (Level Feedback) ---------- */
    useEffect(() => {
        if (level > prevLevel.current) {
            playTone(950);
            showOverlay(`🚀 Subiste a nivel ${level}`);
        }
        if (level < prevLevel.current) {
            playTone(300);
            showOverlay(`💪 Puedes recuperar el nivel ${level}`);
        }
        prevLevel.current = level;
    }, [level]);

    /* ---------- Effects (Score Feedback) ---------- */
    useEffect(() => {
        if (score === 50) showOverlay("🎉 Llegaste a 50 puntos");
        if (score === 100) showOverlay("🏆 ¡100 puntos!");
    }, [score]);

    /* ---------- Effects (Polling) ---------- */
    useEffect(() => {
        if (gameState !== "playing") return;

        const interval = setInterval(async () => {
            try {
                const data = await gameApi.getStatus();
                const hits = data.user_input?.length ?? 0;
                const errors = data.errors ?? 0;

                setLevel(data.level);
                setStreak(data.streak);
                setCurrentHits(hits);
                setCurrentErrors(errors);

                const deltaHits = hits - prevHits.current;
                const deltaErrors = errors - prevErrors.current;

                if (deltaHits > 0) {
                    setScore((s) => s + deltaHits * 10);
                    successSound();
                }
                if (deltaErrors > 0) {
                    setScore((s) => Math.max(0, s - deltaErrors * 5));
                    errorSound();
                }

                setTotalHits((t) => t + Math.max(0, deltaHits));
                setTotalErrors((t) => t + Math.max(0, deltaErrors));

                prevHits.current = hits;
                prevErrors.current = errors;
            } catch {
                console.warn("Backend no responde");
            }
        }, 500);

        return () => clearInterval(interval);
    }, [gameState]);

    /* ---------- Main Flow Function ---------- */
    const handlePlaySequence = async () => {
        unlockAudio();
        playTone(523.25);
        setGameState("playing");
        setResultMessage(null);
        setIsTimerActive(false); // Timer apagado mientras memoriza
        // Preparación
        setPrepMessage("Preparando...");
        await waitCountdown(3, setCountdown);
        setCountdown(null);

        await gameApi.startGame(level);
        roundStart.current = Date.now();
        toast({ title: "🎮 Juego iniciado" }); // Ajuste para shadcn toast standard
        await gameApi.startGame(level);
        // Memorizar
        setPrepMessage("Memoriza el patrón");
        await waitCountdown(5, () => { });

        // Repetir
        setPrepMessage("¡Repite el patrón!");
        setTimerResetKey(prev => prev + 1); // Reinicia la barra visual al 100%
        setIsTimerActive(true);

        // Predicción
        setResultMessage("Pendiente...");
        try {
            const res = await gameApi.predict({
                nivel: level,
                aciertos: totalHits,
                errores: totalErrors,
                tiempo: (Date.now() - roundStart.current) / 1000,
                racha: streak,
            });

            const data = await res.json();
            setResultMessage(data?.accion ?? "Resultado recibido");
        } catch {
            setResultMessage("Pendiente");
        }
    };
    /* =========================
     Manejador de Fin de Tiempo
  ========================= */
    const handleTimeUp = useCallback(async () => {
        if (gameState !== "playing") return;

        // 1. Sonido y UI
        playAlarm();
        showOverlay("⏰ ¡Tiempo Agotado!", 1500);
        setIsTimerActive(false); // Detener barra

        // 2. Penalización (Opcional, si quieres bajar puntos por lentitud)
        setScore(s => Math.max(0, s - 5));

        // 3. Reiniciar Ronda (Llamada al Backend como pediste)
        // Usamos start_game con el nivel actual para generar nuevo patrón
        try {
            console.log("Reiniciando ronda por timeout...");
            await gameApi.startGame(level);

            // Reiniciamos timestamp de inicio para que el backend mida bien el tiempo de la nueva ronda
            roundStart.current = Date.now();

            // Opcional: Dar un respiro antes de reactivar el timer
            setTimeout(() => {
                setTimerResetKey(prev => prev + 1);
                setIsTimerActive(true);
            }, 2000); // 2 segundos para ver el nuevo patrón (ajusta según tu UX)

        } catch (e) {
            console.error("Error reiniciando ronda", e);
        }
    }, [gameState, level]);
    useEffect(() => {
        // Si detectamos que los hits completaron el patrón (usando tu lógica de polling)
        // Podrías necesitar saber el largo del patrón actual para esto con precisión
        // O simplemente, cuando el backend cambie de nivel o mande status success:
        if (currentHits > 0 && currentHits === prevLevel.current /* lógica aprox */) {
            setIsTimerActive(false);
        }
    }, [currentHits]);
    return {
        gameState,
        setGameState,
        level,
        score,
        stats: { currentHits, currentErrors, streak, totalHits, totalErrors },
        ui: { overlayMessage, prepMessage, countdown, resultMessage },
        actions: { handlePlaySequence, hardReset },
        timer: {
            isActive: isTimerActive,
            duration: ROUND_DURATION,
            onTimeUp: handleTimeUp,
            resetKey: timerResetKey
        }
    };
};