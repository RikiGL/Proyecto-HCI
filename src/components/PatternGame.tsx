import { useState, useCallback, useRef } from "react";
import { GameButton } from "./GameButton";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Volume2, VolumeX, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface PatternGameProps {
  initialLevel?: number;
  onBack?: () => void;
}

type Color = "red" | "blue" | "green" | "yellow" | "purple";
const COLORS: Color[] = ["red", "blue", "green", "yellow", "purple"];

type GameState = "idle" | "showing" | "playing" | "success" | "failed" | "loading";

const LEVEL_CONFIG = {
  1: { patternLength: 2, speed: 800, name: "Fácil" },
  2: { patternLength: 3, speed: 700, name: "Normal" },
  3: { patternLength: 4, speed: 600, name: "Difícil" },
  4: { patternLength: 5, speed: 500, name: "Experto" },
  5: { patternLength: 5, speed: 350, name: "Maestro" },
};

const ML_API_URL = "http://localhost:8000/predecir";

type MLAction = "SUBIR" | "BAJAR" | "MANTENER";

interface MLRequest {
  nivel: number;
  aciertos: number;
  errores: number;
  tiempo: number;
  racha: number;
}

interface MLResponse {
  accion: MLAction;
}

export const PatternGame = ({ initialLevel = 1, onBack }: PatternGameProps) => {
  const [level, setLevel] = useState(initialLevel);
  const [pattern, setPattern] = useState<number[]>([]);
  const [playerPattern, setPlayerPattern] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  // Estadísticas actuales (por nivel / ronda)
const [currentHits, setCurrentHits] = useState(0);
const [currentErrors, setCurrentErrors] = useState(0);

// Estadísticas totales (NO se resetean)
const [totalHits, setTotalHits] = useState(0);
const [totalErrors, setTotalErrors] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // ML tracking state
  const [streak, setStreak] = useState(0);
  const [roundErrors, setRoundErrors] = useState(0);
  const roundStartTime = useRef<number>(0);

  const playSound = useCallback((frequency: number) => {
    if (!soundEnabled) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, [soundEnabled]);

  const buttonFrequencies = [261.63, 329.63, 392.00, 440.00, 523.25];

  const generatePattern = useCallback(() => {
    const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG];
    const newPattern: number[] = [];
    for (let i = 0; i < config.patternLength; i++) {
      newPattern.push(Math.floor(Math.random() * 5));
    }
    return newPattern;
  }, [level]);

  const callMLApi = async (data: MLRequest): Promise<MLAction> => {
    try {
      const response = await fetch(ML_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("API response not ok");
      }
      
      const result: MLResponse = await response.json();
      return result.accion;
    } catch (error) {
      console.error("ML API error, using fallback logic:", error);
      // Fallback logic: use internal rules
      if (data.aciertos === data.nivel + 1 && data.errores === 0) {
        return "SUBIR";
      } else if (data.errores >= 2 || data.racha <= -3) {
        return "BAJAR";
      }
      return "MANTENER";
    }
  };

  const handleRoundComplete = async (success: boolean, correctCount: number, errorCount: number) => {
    const timeElapsed = Math.round((Date.now() - roundStartTime.current) / 1000);
    const newStreak = success ? (streak >= 0 ? streak + 1 : 1) : (streak <= 0 ? streak - 1 : -1);
    setStreak(newStreak);
    
    setGameState("loading");
    
    const mlData: MLRequest = {
      nivel: level,
      aciertos: correctCount,
      errores: errorCount,
      tiempo: timeElapsed,
      racha: newStreak,
    };
    
    console.log("Sending to ML API:", mlData);
    
    const action = await callMLApi(mlData);
    console.log("ML API response:", action);
    
    let newLevel = level;
    
    if (action === "SUBIR" && level < 5) {
      newLevel = level + 1;
      setLevel(newLevel);
      toast.success(`🚀 ¡Subiste al nivel ${newLevel}! ¡Excelente!`);
    } else if (action === "BAJAR" && level > 1) {
      newLevel = level - 1;
      setLevel(newLevel);
      toast.info(`💪 Bajaste al nivel ${newLevel}. ¡Tú puedes!`);
    } else {
      toast(`🔄 Continuando en nivel ${level}`);
    }
    
    // Start next round with potentially new level
    setTimeout(() => {
      const config = LEVEL_CONFIG[newLevel as keyof typeof LEVEL_CONFIG];
      const newPattern: number[] = [];
      for (let i = 0; i < config.patternLength; i++) {
        newPattern.push(Math.floor(Math.random() * 5));
      }
      setPattern(newPattern);
      setPlayerPattern([]);
      setRoundErrors(0);
      showPattern(newPattern, newLevel);
    }, 1000);
  };

  const showPattern = useCallback(async (patternToShow: number[], lvl?: number) => {
    setGameState("showing");
    const currentLevel = lvl ?? level;
    const config = LEVEL_CONFIG[currentLevel as keyof typeof LEVEL_CONFIG];
    
    for (let i = 0; i < patternToShow.length; i++) {
      await new Promise(resolve => setTimeout(resolve, config.speed));
      setActiveButton(patternToShow[i]);
      playSound(buttonFrequencies[patternToShow[i]]);
      await new Promise(resolve => setTimeout(resolve, config.speed / 2));
      setActiveButton(null);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    roundStartTime.current = Date.now();
    setGameState("playing");
  }, [level, playSound]);

  const startGame = useCallback(() => {
    const newPattern = generatePattern();
    setCurrentHits(0);
setCurrentErrors(0);
    setPattern(newPattern);
    setPlayerPattern([]);
    setScore(0);
    setStreak(0);
    setRoundErrors(0);
    showPattern(newPattern);
  }, [generatePattern, showPattern]);

  const handleButtonClick = useCallback((index: number) => {
    if (gameState !== "playing") return;
    
    playSound(buttonFrequencies[index]);
    setActiveButton(index);
    setTimeout(() => setActiveButton(null), 150);
    
    const newPlayerPattern = [...playerPattern, index];
    setPlayerPattern(newPlayerPattern);
    
    // Check if correct
    const currentIndex = newPlayerPattern.length - 1;
    if (pattern[currentIndex] !== index) {
      const newErrors = roundErrors + 1;
      setRoundErrors(newErrors);
      setGameState("failed");
      playSound(150);
      toast.error("¡Patrón incorrecto!");
        setCurrentErrors(prev => prev + 1);
  setTotalErrors(prev => prev + 1);

      
      // Call ML API with failure data
      handleRoundComplete(false, currentIndex, newErrors);
      return;
    }
    
    // Check if complete
    if (newPlayerPattern.length === pattern.length) {
      setGameState("success");
      const points = level * 100;
      setScore(prev => prev + points);
        setCurrentHits(prev => prev + pattern.length);
  setTotalHits(prev => prev + pattern.length);

      
      // Call ML API with success data
      handleRoundComplete(true, pattern.length, roundErrors);
    }
  }, [gameState, pattern, playerPattern, level, playSound, roundErrors, handleRoundComplete]);

  const resetGame = () => {
    setLevel(initialLevel);
    setPattern([]);
    setPlayerPattern([]);
    setActiveButton(null);
    setGameState("idle");
    setScore(0);
    setStreak(0);
    setRoundErrors(0);
  };

  const selectLevel = (newLevel: number) => {
    if (gameState !== "idle" && gameState !== "loading") return;
    setLevel(newLevel);
  };

  return (
    <>
    {/*<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      { Background effects 
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg w-full">
        {/* Back button }
        {onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}}

        {/* Header }
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-glow tracking-wider">
            PATRONES
          </h1>
          <p className="text-base text-foreground/70 tracking-wide leading-relaxed">
            Memoriza y repite la secuencia
          </p>
        </div>

        {/* Score and Level }
        <div className="flex gap-10 items-center">
          <div className="text-center space-y-1">
            <p className="text-sm text-foreground/60 uppercase tracking-widest">Puntos</p>
            <p className="text-2xl font-bold text-glow-accent text-accent">{score}</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm text-foreground/60 uppercase tracking-widest">Nivel</p>
            <p className="text-2xl font-bold text-primary">{level}</p>
          </div>
        </div>

        {/* Level info }
        <div className="text-center">
          <p className="text-base text-foreground/70 tracking-wide leading-relaxed">
            {LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG].name} — {LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG].patternLength} botones
          </p>
        </div>

        {/* Game status }
        <div className="h-8 flex items-center justify-center gap-2">
          {gameState === "showing" && (
            <p className="text-accent animate-pulse-glow font-pixel text-xs">OBSERVA...</p>
          )}
          {gameState === "playing" && (
            <p className="text-primary font-pixel text-xs">¡TU TURNO!</p>
          )}
          {gameState === "success" && (
            <p className="text-green-400 font-pixel text-xs">¡CORRECTO!</p>
          )}
          {gameState === "failed" && (
            <p className="text-destructive font-pixel text-xs animate-shake">¡ERROR!</p>
          )}
          {gameState === "loading" && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-muted-foreground font-pixel text-xs">ANALIZANDO...</p>
            </div>
          )}
        </div>

        {/* Streak indicator }
        {(gameState !== "idle") && (
          <div className="text-center text-sm text-foreground/60 tracking-wide">
            Racha: <span className={streak >= 0 ? "text-green-400" : "text-destructive"}>{streak > 0 ? `+${streak}` : streak}</span>
          </div>
        )}

        {/* Game buttons }
        <div className="flex flex-wrap justify-center gap-4 p-6 bg-card/50 rounded-3xl backdrop-blur-sm border border-border">
          {COLORS.map((color, index) => (
            <GameButton
              key={color}
              color={color}
              isActive={activeButton === index}
              onClick={() => handleButtonClick(index)}
              disabled={gameState !== "playing"}
            />
          ))}
        </div>

        {/* Progress indicator }
        {gameState === "playing" && (
          <div className="flex gap-2">
            {pattern.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index < playerPattern.length
                    ? "bg-primary scale-110"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {/* Controls }
        <div className="flex gap-4">
          {gameState === "idle" ? (
            <Button
              onClick={startGame}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8"
            >
              <Play className="w-5 h-5" />
              JUGAR
            </Button>
          ) : (
            <Button
              onClick={resetGame}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              REINICIAR
            </Button>
          )}
          
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="ghost"
            size="icon"
            className="w-12 h-12"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Instructions}
        {gameState === "idle" && (
          <div className="text-center max-w-sm space-y-2 mt-6">
            <p className="text-sm text-foreground/70 tracking-wide leading-relaxed">
              1. Selecciona el nivel de dificultad
            </p>
            <p className="text-sm text-foreground/70 tracking-wide leading-relaxed">
              2. Observa el patrón de luces
            </p>
            <p className="text-sm text-foreground/70 tracking-wide leading-relaxed">
              3. Repite la secuencia en el mismo orden
            </p>
          </div>
        )}
      </div>
    </div>
    */}
<div className="min-h-screen bg-background flex items-center justify-center p-6">
  <div className="bg-card/60 backdrop-blur-md border border-border rounded-3xl p-8 w-full max-w-lg text-center shadow-xl space-y-6">

    <h1 className="text-4xl font-bold tracking-wider text-glow">
      🧠 Juego de Memoria
    </h1>

    <p className="text-accent text-lg font-semibold animate-pulse">
      🍀 Buena suerte
      {gameState !== "idle" && (
  <p className="text-sm text-muted-foreground animate-pulse">
    ⏳ Observa el patrón en el protoboard físico...
  </p>
)}
    </p>

    {/* Score & Level */}
    <div className="flex justify-around">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Nivel</p>
        <p className="text-3xl font-bold text-primary">{level}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Puntuación</p>
        <p className="text-3xl font-bold text-accent">{score}</p>
      </div>
    </div>

{/* Estadísticas */}
<div className="grid grid-cols-2 gap-4 text-sm mt-4">
  <div className="bg-muted/40 rounded-xl p-3">
    <p className="text-xs uppercase text-muted-foreground">Racha</p>
    <p className={`text-2xl font-bold ${streak >= 0 ? "text-green-400" : "text-red-400"}`}>
      {streak}
    </p>
  </div>

  <div className="bg-muted/40 rounded-xl p-3">
    <p className="text-xs uppercase text-muted-foreground">Nivel actual</p>
    <p className="text-2xl font-bold text-primary">{level}</p>
  </div>

  <div className="bg-muted/40 rounded-xl p-3">
    <p className="text-xs uppercase text-muted-foreground">Aciertos actuales</p>
    <p className="text-xl font-bold text-green-400">{currentHits}</p>
  </div>

  <div className="bg-muted/40 rounded-xl p-3">
    <p className="text-xs uppercase text-muted-foreground">Errores actuales</p>
    <p className="text-xl font-bold text-red-400">{currentErrors}</p>
  </div>

  <div className="bg-muted/40 rounded-xl p-3 col-span-2">
    <p className="text-xs uppercase text-muted-foreground text-center">Totales</p>
    <div className="flex justify-around mt-1">
      <p className="text-green-400 font-bold">✔ {totalHits}</p>
      <p className="text-red-400 font-bold">✖ {totalErrors}</p>
    </div>
  </div>
</div>

    {/* Rules */}
    <div className="bg-muted/40 rounded-xl p-4 text-sm text-left space-y-1">
      <p className="font-semibold text-center mb-2">📋 Reglas básicas</p>
      <p>• Observa el patrón en el protoboard físico</p>
      <p>• Repite la secuencia correctamente</p>
      <p>• Cada acierto suma puntos</p>
      <p>• El nivel se ajusta automáticamente</p>
    </div>

    {/* Buttons */}
    <div className="flex gap-4 justify-center pt-2">
     <Button
  size="lg"
  onClick={() => {
    playSound(523.25); // sonido inicio (DO agudo)
    startGame();
  }}
>
  ▶ Jugar
</Button>

   <Button
  size="lg"
  variant="outline"
  onClick={() => {
    setCurrentHits(0);
    setCurrentErrors(0);
    setStreak(0);
    onBack?.();
  }}
>
  🔄 Seleccionar nivel
</Button>

    </div>
  </div>
</div>
</>
);

};
