// --- igual imports ---
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type GameState = "idle" | "playing" | "paused";

interface PatternGameProps {
  initialLevel?: number;
}

const API_URL = "http://192.168.0.108:8000";

// ================= AUDIO =================
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const unlockAudio = () => {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
};

const playTone = (freq: number, duration = 0.18) => {
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

const successSound = () => {
  playTone(700);
  setTimeout(() => playTone(1000), 120);
};

const errorSound = () => {
  playTone(250, 0.25);
};

// ================= BACKEND =================
const startGameBackend = async (level: number) => {
  await fetch(`${API_URL}/start_game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level }),
  });
};

const getStatus = async () => {
  const res = await fetch(`${API_URL}/status`);
  return await res.json();
};

const pauseBackend = async () => {
  await fetch(`${API_URL}/pause`, { method: "POST" });
};

// ================= COMPONENT =================
export const PatternGame = ({ initialLevel = 1 }: PatternGameProps) => {
  const navigate = useNavigate();

  const [level, setLevel] = useState(initialLevel);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);

  const [currentHits, setCurrentHits] = useState(0);
  const [currentErrors, setCurrentErrors] = useState(0);
  const [streak, setStreak] = useState(0);

  const lastStatus = useRef<string | null>(null);
  const prevLevel = useRef(level);

  // Sonido cuando sube/baja nivel
  useEffect(() => {
    if (level > prevLevel.current) playTone(950);
    if (level < prevLevel.current) playTone(300);
    prevLevel.current = level;
  }, [level]);

  // Polling
  useEffect(() => {
    let interval: any;

    if (gameState === "playing") {
      interval = setInterval(async () => {
        const data = await getStatus();

        setLevel(data.level);
        setCurrentErrors(data.errors);
        setStreak(data.streak);
        setCurrentHits(data.user_input.length);

        if (data.status !== lastStatus.current) {
          if (data.status === "success") {
            setScore((s) => s + 10);
            successSound();
            toast({ title: "✅ Ronda completada" });
          }

          if (data.status === "failed") {
            setScore((s) => Math.max(0, s - 5));
            errorSound();
            toast({ title: "❌ Fallaste el patrón" });
          }

          lastStatus.current = data.status;
        }
      }, 500);
    }

    return () => clearInterval(interval);
  }, [gameState]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background effects igual a Home */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-glow tracking-wider">
            🧠 Memoria Patrón
          </h1>
          <p className="text-sm text-foreground/70 tracking-wide leading-relaxed">
            {gameState === "idle"
              ? "Pulsa jugar para comenzar"
              : "Observa el patrón físico"}
          </p>
          {/* Sección de ayuda / consejos (heurística Nielsen: ayuda y documentación) */}
          <div className="w-full space-y-3 mt-2">

            {/* Consejo 1 */}
            <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  🧠
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground tracking-wide">
                    Memoriza antes de actuar
                  </h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Observa completamente la secuencia antes de presionar cualquier botón.
                  </p>
                </div>
              </div>
            </div>

            {/* Consejo 2 */}
            <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  👀
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground tracking-wide">
                    Observa el estado del juego
                  </h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Si fallas, el sistema te notificará y podrás intentarlo nuevamente.
                  </p>
                </div>
              </div>
            </div>

            {/* Consejo 3 */}
            <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  ⚠️
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground tracking-wide">
                    Evita presionar rápido
                  </h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Presionar demasiado rápido puede generar errores en la detección del patrón.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Stats principales */}
        <div className="w-full grid grid-cols-2 gap-4">
          <div className="bg-card/50 border border-border rounded-xl p-4 backdrop-blur-sm text-center">
            <p className="text-xs text-foreground/60">Nivel</p>
            <p className="text-2xl font-bold">{level}</p>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4 backdrop-blur-sm text-center">
            <p className="text-xs text-foreground/60">Score</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="w-full grid grid-cols-3 gap-3">
          <div className="bg-card/50 border border-border rounded-xl p-4 backdrop-blur-sm text-center text-sm">
            Racha<br /><b>{streak}</b>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4 backdrop-blur-sm text-center text-sm">
            Aciertos<br /><b>{currentHits}</b>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4 backdrop-blur-sm text-center text-sm">
            Errores<br /><b>{currentErrors}</b>
          </div>
        </div>

        {/* Botones */}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          <Button
            onClick={async () => {
              unlockAudio();
              playTone(600);
              await startGameBackend(level);
              setGameState("playing");
            }}
            className="h-11"
          >
            ▶ Jugar
          </Button>

          <Button
            variant="secondary"
            onClick={async () => {
              unlockAudio();
              playTone(450);
              await pauseBackend();
              setGameState((s) => (s === "playing" ? "paused" : "playing"));
            }}
            disabled={gameState === "idle"}
            className="h-11"
          >
            {gameState === "paused" ? "▶ Reanudar" : "⏸ Pausar"}
          </Button>

          <Button variant="outline" onClick={() => navigate("/levels")}>
            🎚 Nivel
          </Button>

          <Button variant="destructive" onClick={() => navigate("/home")}>
            🚪 Salir
          </Button>
        </div>
      </div>
    </div>
  );

};
