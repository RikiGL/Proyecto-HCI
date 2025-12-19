import { useState, useEffect, useCallback } from "react";
import { GameButton } from "./GameButton";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

type Color = "red" | "blue" | "green" | "yellow" | "purple";
const COLORS: Color[] = ["red", "blue", "green", "yellow", "purple"];

type GameState = "idle" | "showing" | "playing" | "success" | "failed";

const LEVEL_CONFIG = {
  1: { patternLength: 2, speed: 800, name: "Fácil" },
  2: { patternLength: 3, speed: 700, name: "Normal" },
  3: { patternLength: 4, speed: 600, name: "Difícil" },
  4: { patternLength: 5, speed: 500, name: "Experto" },
  5: { patternLength: 5, speed: 350, name: "Maestro" },
};

export const PatternGame = () => {
  const [level, setLevel] = useState(1);
  const [pattern, setPattern] = useState<number[]>([]);
  const [playerPattern, setPlayerPattern] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const showPattern = useCallback(async (patternToShow: number[]) => {
    setGameState("showing");
    const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG];
    
    for (let i = 0; i < patternToShow.length; i++) {
      await new Promise(resolve => setTimeout(resolve, config.speed));
      setActiveButton(patternToShow[i]);
      playSound(buttonFrequencies[patternToShow[i]]);
      await new Promise(resolve => setTimeout(resolve, config.speed / 2));
      setActiveButton(null);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setGameState("playing");
  }, [level, playSound]);

  const startGame = useCallback(() => {
    const newPattern = generatePattern();
    setPattern(newPattern);
    setPlayerPattern([]);
    setScore(0);
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
      setGameState("failed");
      playSound(150);
      toast.error("¡Patrón incorrecto! Intenta de nuevo.");
      return;
    }
    
    // Check if complete
    if (newPlayerPattern.length === pattern.length) {
      setGameState("success");
      const points = level * 100;
      setScore(prev => prev + points);
      toast.success(`¡Correcto! +${points} puntos`);
      
      // Auto advance or restart
      setTimeout(() => {
        if (level < 5) {
          setLevel(prev => prev + 1);
        }
        const nextPattern = generatePattern();
        setPattern(nextPattern);
        setPlayerPattern([]);
        showPattern(nextPattern);
      }, 1500);
    }
  }, [gameState, pattern, playerPattern, level, playSound, generatePattern, showPattern]);

  const resetGame = () => {
    setLevel(1);
    setPattern([]);
    setPlayerPattern([]);
    setActiveButton(null);
    setGameState("idle");
    setScore(0);
  };

  const selectLevel = (newLevel: number) => {
    if (gameState !== "idle") return;
    setLevel(newLevel);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-glow tracking-wider">
            PATRONES
          </h1>
          <p className="text-muted-foreground text-sm">Memoriza y repite la secuencia</p>
        </div>

        {/* Score and Level */}
        <div className="flex gap-8 items-center">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Puntos</p>
            <p className="text-2xl font-bold text-glow-accent text-accent">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Nivel</p>
            <p className="text-2xl font-bold text-primary">{level}</p>
          </div>
        </div>

        {/* Level selector */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              onClick={() => selectLevel(lvl)}
              disabled={gameState !== "idle"}
              className={`w-10 h-10 rounded-lg font-bold transition-all ${
                level === lvl
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              } ${gameState !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Level info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG].name} - {LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG].patternLength} botones
          </p>
        </div>

        {/* Game status */}
        <div className="h-8 flex items-center justify-center">
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
        </div>

        {/* Game buttons */}
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

        {/* Progress indicator */}
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

        {/* Controls */}
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

        {/* Instructions */}
        {gameState === "idle" && (
          <div className="text-center text-xs text-muted-foreground max-w-xs space-y-1 mt-4">
            <p>1. Selecciona el nivel de dificultad</p>
            <p>2. Observa el patrón de luces</p>
            <p>3. Repite la secuencia en el mismo orden</p>
          </div>
        )}
      </div>
    </div>
  );
};
