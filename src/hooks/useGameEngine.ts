import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { startCountdown, CancelFn } from "@/lib/utils";
import { gameApi } from "@/services/api";
import { playTone, successSound, errorSound, unlockAudio, playAlarm } from "@/services/audio";

export type GameState = "idle" | "playing" | "paused";

// Duración del turno del usuario (para responder)
const USER_TURN_DURATION = 10; 
// Duración para memorizar (mientras el patrón se muestra)
const MEMORIZE_DURATION = 5000; 

export const useGameEngine = (initialLevel: number = 1) => {
    /* ---------- State ---------- */
    const [gameState, setGameState] = useState<GameState>("idle");
    const [level, setLevel] = useState(initialLevel);
    const [score, setScore] = useState(0);
    
    // Timer
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerResetKey, setTimerResetKey] = useState(0);

    // Stats
    const [currentHits, setCurrentHits] = useState(0);
    const [currentErrors, setCurrentErrors] = useState(0);
    const [streak, setStreak] = useState(0);
    const [totalHits, setTotalHits] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);

    // UI Messages
    const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
    const [prepMessage, setPrepMessage] = useState<string | null>(null); // "Memoriza", "Tu turno"
    const [countdown, setCountdown] = useState<number | null>(null); // 3, 2, 1 inicial
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    /* ---------- Refs ---------- */
    const prevHits = useRef(0);
    const prevErrors = useRef(0);
    const prevLevel = useRef(level);
    const prevBackendStatus = useRef<string>("idle"); // Para detectar cambios de ciclo
    
    const cancelRef = useRef<CancelFn | null>(null);
    const roundStart = useRef(0);
    const flowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /* ---------- Helpers ---------- */
    const showOverlay = (msg: string, duration = 2000) => {
        setOverlayMessage(msg);
        setTimeout(() => setOverlayMessage(null), duration);
    };

    const hardReset = () => {
        gameApi.reset();
        if (flowTimeoutRef.current) clearTimeout(flowTimeoutRef.current);
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
        setIsTimerActive(false);

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

    /* ---------- CICLO VISUAL DE LA RONDA ---------- */
    // Esta función maneja SOLO la parte visual: "Memoriza" -> Espera -> "Tu turno"
    const startRoundFlow = useCallback(() => {
        // 1. Fase de Memorización
        setIsTimerActive(false); // Timer apagado
        setPrepMessage("👀 ¡Memoriza el patrón!");
        
        // Limpiamos cualquier timeout anterior
        if (flowTimeoutRef.current) clearTimeout(flowTimeoutRef.current);

        // 2. Esperar X segundos (mientras el hardware muestra las luces)
        flowTimeoutRef.current = setTimeout(() => {
            // 3. Fase de Tu Turno
            playTone(800, 0.1); // Sonido "Ding" de inicio
            setPrepMessage("⚡ ¡Tu turno!");
            setTimerResetKey(k => k + 1); // Reset barra
            setIsTimerActive(true); // 🔥 ACTIVAR BARRA DESCENDENTE
            roundStart.current = Date.now(); // Marcar inicio para estadísticas
        }, MEMORIZE_DURATION);

    }, []);

    /* ---------- POLLING (Sincronización con Backend) ---------- */
    useEffect(() => {
        if (gameState !== "playing") return;

        const interval = setInterval(async () => {
            try {
                const data = await gameApi.getStatus(); // { status, user_input, level, ... }
                
                const hits = data.user_input?.length ?? 0;
                const errors = data.errors ?? 0;
                const backendStatus = data.status;

                // Actualizar datos básicos
                setLevel(data.level);
                setStreak(data.streak);
                setCurrentHits(hits);
                setCurrentErrors(errors);

                // --- DETECCIÓN DE CAMBIO DE CICLO ---
                // Si el backend pasó de 'success' (o 'idle') a 'playing', significa que empezó una nueva ronda
                if (prevBackendStatus.current === "success" && backendStatus === "playing") {
                    // ¡Ciclo nuevo detectado!
                    startRoundFlow(); 
                }

                // Si el backend reporta éxito (ronda terminada)
                if (backendStatus === "success" && prevBackendStatus.current !== "success") {
                     setIsTimerActive(false); // Parar barra inmediatamente (se llena o detiene)
                     successSound();
                     setPrepMessage("✅ ¡Correcto!");
                     showOverlay("🌟 Atento al siguiente patrón...", 2500);
                     // No llamamos a startRoundFlow aquí, esperamos a que el backend cambie a 'playing' de nuevo
                }

                // Si el backend reporta fallo
                if (backendStatus === "failed" && prevBackendStatus.current !== "failed") {
                    setIsTimerActive(false);
                    errorSound();
                    showOverlay("❌ Error en el patrón", 2000);
                }

                // Cálculo de Puntos (Feedback inmediato)
                const deltaHits = hits - prevHits.current;
                const deltaErrors = errors - prevErrors.current;

                if (deltaHits > 0 && backendStatus === "playing") {
                    setScore((s) => s + deltaHits * 10);
                    playTone(600 + (hits * 50), 0.1); // Sonido ascendente por cada acierto
                }
                
                // Actualizar Refs
                prevHits.current = hits;
                prevErrors.current = errors;
                prevLevel.current = data.level;
                prevBackendStatus.current = backendStatus;

            } catch {
                console.warn("Backend sync error");
            }
        }, 300); // Polling un poco más rápido para mejor respuesta

        return () => clearInterval(interval);
    }, [gameState, startRoundFlow]);


    /* ---------- INICIO DEL JUEGO (Botón Jugar) ---------- */
    const handlePlaySequence = async () => {
        unlockAudio();
        playTone(523.25);
        
        setGameState("playing");
        setResultMessage(null);
        setIsTimerActive(false); 
        prevBackendStatus.current = "idle"; // Reset status tracker

        // 1. Cuenta regresiva 3, 2, 1
        setPrepMessage("Preparando...");
        await waitCountdown(3, setCountdown);
        setCountdown(null);

        // 2. Llamada a Backend (SOLO UNA VEZ)
        // Esto hace que el hardware muestre las luces inmediatamente
        try {
            await gameApi.startGame(level);
            toast({ title: "🎮 Juego iniciado" });
            
            // 3. Iniciar el flujo visual (Memoriza -> Tu Turno)
            startRoundFlow();
        } catch (e) {
            console.error("Error iniciando juego", e);
            setGameState("idle");
        }
    };

    /* ---------- TIMEOUT (Fin de la barra) ---------- */
    const handleTimeUp = useCallback(async () => {
        if (gameState !== "playing") return;
        
        // El usuario no respondió a tiempo
        playAlarm();
        showOverlay("⏰ ¡Tiempo Agotado!", 1500);
        setIsTimerActive(false);
        setPrepMessage("⏳ Tiempo fuera...");

        // Forzamos reinicio de ronda en backend para mantener el ciclo
        // (Aunque lo ideal sería mandar un 'fail' al backend, start_game reinicia el estado)
        try {
            setTimeout(async () => {
                await gameApi.startGame(level);
                // Al llamar startGame, el backend pasará a playing, nuestro polling lo detectará
                // o forzamos el flujo visual:
                startRoundFlow(); 
            }, 2000);
        } catch (e) {
            console.error(e);
        }
    }, [gameState, level, startRoundFlow]);

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
            duration: USER_TURN_DURATION,
            onTimeUp: handleTimeUp,
            resetKey: timerResetKey
        }
    };
};