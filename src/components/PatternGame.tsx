import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { startCountdown, CancelFn } from "@/lib/utils";

/* =========================
   TIPOS
========================= */

type GameState = "idle" | "playing" | "paused";

/* =========================
   PROPS
========================= */

interface PatternGameProps {
  initialLevel?: number;
}

/* =========================
   COMPONENTE
========================= */

export const PatternGame = ({ initialLevel = 1 }: PatternGameProps) => {
  const navigate = useNavigate();

  /* =========================
     ESTADOS PRINCIPALES
  ========================= */

  const [level, setLevel] = useState(initialLevel);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);

  /* =========================
     ESTADÍSTICAS
  ========================= */

  // Por ronda
  const [currentHits, setCurrentHits] = useState(0);
  const [currentErrors, setCurrentErrors] = useState(0);

  // Totales
  const [totalHits, setTotalHits] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  const [streak, setStreak] = useState(0);

  /* =========================
     REFERENCIAS
  ========================= */

  const roundStartTime = useRef<number>(0);

  /* =========================
     FUNCIONES
  ========================= */

  const startGame = () => {
    // Actual start: set round time and notify
    roundStartTime.current = Date.now();
    toast("🎮 Juego iniciado");
  };

  const togglePause = () => {
    setGameState((prev) => {
      if (prev === "playing") {
        toast("⏸ Juego en pausa");
        return "paused";
      }
      if (prev === "paused") {
        toast("▶ Juego reanudado");
        return "playing";
      }
      return prev;
    });
  };

  const playSound = (freq: number) => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  /* =========================
     PREPARATION / COUNTDOWNS
  ========================= */

  const cancelRef = useRef<CancelFn | null>(null);
  const [prepMessage, setPrepMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  const notifyBackendReady = async () => {
    try {
      await fetch("http://localhost:8000/predecir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: level, aciertos: totalHits, errores: totalErrors, tiempo: 0, racha: streak }),
      });
      // ignore response; purpose is to signal readiness
    } catch (e) {
      console.warn("Failed to notify backend ready", e);
    }
  };

  const handlePlaySequence = async () => {
    // Show stats and hide rules by setting gameState to playing early
    setGameState("playing");
    setResultMessage(null);

    // helper to await a countdown
    const waitCountdown = (from: number, onTick: (v: number) => void) =>
      new Promise<void>((resolve) => {
        cancelRef.current?.();
        cancelRef.current = startCountdown(from, (v) => onTick(v), () => {
          cancelRef.current = null;
          resolve();
        });
      });

    // 1) Preparación 3s
    setPrepMessage("Preparando...");
    await waitCountdown(3, (v) => setCountdown(v));
    setCountdown(null);

    // notify backend that we're ready (still before memorize)
    await notifyBackendReady();

    // 2) Memorize phase 5s (no countdown visible per UX)
    setPrepMessage("Memoriza el patrón");
    await waitCountdown(5, () => setCountdown((c) => c));
    setCountdown(null);

    // 3) Replicate phase 10s (countdown visible)
    setPrepMessage("Repite el patrón");
    await waitCountdown(10, (v) => setCountdown(v));
    setCountdown(null);
    setPrepMessage(null);

    // After replicate, request backend prediction and show result (Pendiente until response)
    setResultMessage("Pendiente");
    try {
      const res = await fetch("http://localhost:8000/predecir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivel: level, aciertos: totalHits, errores: totalErrors, tiempo: (Date.now() - roundStartTime.current) / 1000, racha: streak }),
      });
      const data = await res.json();
      if (data?.accion) {
        setResultMessage(String(data.accion));
        toast(`Resultado: ${data.accion}`);
      } else {
        setResultMessage(totalErrors === 0 ? "Acertó" : "No acertó");
      }
    } catch (e) {
      // keep pending when backend unreachable
      setResultMessage("Pendiente");
    }

    // finally start the real game loop
    startGame();
  };

  /* =========================
     UI
  ========================= */

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card/60 backdrop-blur-md border border-border rounded-3xl p-8 w-full max-w-lg text-center shadow-xl space-y-6">

          <h1 className="text-4xl font-bold tracking-wider text-glow">
            🧠 Juego de Memoria
          </h1>

          <div>
            <p className="text-accent text-lg font-semibold animate-pulse">
              🍀 Buena suerte
            </p>

            {/* Preparación / contador centrado */}
            {gameState === "paused" ? (
              <div className="mt-4 text-center">
                <p className="text-4xl font-extrabold">Pausa</p>
              </div>
            ) : (
              (prepMessage || countdown !== null || resultMessage) && (
                <div className="mt-4 text-center">
                  {/* show countdown only during 'Preparando...' (3s) or 'Repite el patrón' (replicate 10s) */}
                  {countdown !== null && (prepMessage === "Preparando..." || prepMessage === "Repite el patrón") && (
                    <p className="text-5xl font-extrabold">{countdown}</p>
                  )}
                  {prepMessage && (
                    <div className="text-center">
                      <p className="text-lg font-semibold mt-2">{prepMessage}</p>
                      {prepMessage === "Memoriza el patrón" && (
                        <p className="text-sm text-muted-foreground">Observa y memoriza</p>
                      )}
                    </div>
                  )}

                  {resultMessage && (
                    <div className="mt-3">
                      <p className="text-xl font-bold">{resultMessage}</p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Nivel y puntuación - ocultos hasta iniciar */}
          {gameState !== "idle" && (
            <div className="flex justify-around">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Nivel
                </p>
                <p className="text-3xl font-bold text-primary">{level}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Puntuación
                </p>
                <p className="text-3xl font-bold text-accent">{score}</p>
              </div>
            </div>
          )}

          {/* Estadísticas - ocultas hasta iniciar */}
          {gameState !== "idle" && (
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs uppercase text-muted-foreground">Racha</p>
                <p className="text-2xl font-bold text-green-400">{streak}</p>
              </div>

              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Nivel actual
                </p>
                <p className="text-2xl font-bold text-primary">{level}</p>
              </div>

              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Aciertos actuales
                </p>
                <p className="text-xl font-bold text-green-400">
                  {currentHits}
                </p>
              </div>

              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Errores actuales
                </p>
                <p className="text-xl font-bold text-red-400">
                  {currentErrors}
                </p>
              </div>

              <div className="bg-muted/40 rounded-xl p-3 col-span-2">
                <p className="text-xs uppercase text-muted-foreground text-center">
                  Totales
                </p>
                <div className="flex justify-around mt-1">
                  <p className="text-green-400 font-bold">✔ {totalHits}</p>
                  <p className="text-red-400 font-bold">✖ {totalErrors}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reglas - ocultas una vez inicia la preparación */}
          {gameState === "idle" && (
            <div className="bg-muted/40 rounded-xl p-4 text-sm text-left space-y-1">
              <p className="font-semibold text-center mb-2">
                📋 Reglas básicas
              </p>
              <p>• Observa el patrón en el protoboard físico</p>
              <p>• Repite la secuencia correctamente</p>
              <p>• Cada acierto suma puntos</p>
              <p>• El nivel se ajusta automáticamente</p>
            </div>
          )}

          {/* BOTONES */}
          <div className="flex flex-wrap gap-4 justify-center pt-2">

            {/* JUGAR */}
            <Button
              size="lg"
              onClick={() => {
                playSound(523.25);
                handlePlaySequence();
              }}
            >
              ▶ Jugar
            </Button>

            {/* PAUSAR */}
            <Button
              size="lg"
              variant="secondary"
              onClick={togglePause}
              disabled={gameState === "idle"}
            >
              {gameState === "paused" ? "▶ Reanudar" : "⏸ Pausar"}
            </Button>

            {/* SELECCIONAR NIVEL */}
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setCurrentHits(0);
                setCurrentErrors(0);
                setStreak(0);
                navigate("/levels");
              }}
            >
              🔄 Seleccionar nivel
            </Button>

            {/* SALIR */}
            <Button
              size="lg"
              variant="destructive"
              onClick={() => {
                toast("👋 Regresando al inicio");
                navigate("/home");
              }}
            >
              🚪 Salir
            </Button>

          </div>
        </div>
      </div>
    </>
  );
};
