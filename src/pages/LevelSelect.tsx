import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LEVEL_INFO = {
  1: { name: "Fácil", description: "Velocidad lenta, 2 colores" },
  2: { name: "Normal", description: "Velocidad media, 3 colores" },
  3: { name: "Difícil", description: "Velocidad rápida, 4 colores" },
  4: { name: "Experto", description: "Velocidad alta, 5 colores" },
  5: { name: "Maestro", description: "Velocidad extrema, 5 colores" },
};

const LevelSelect = () => {
  const navigate = useNavigate();

  const handleLevelSelect = (level: number) => {
    navigate(`/game/${level}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-lg w-full">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-glow tracking-wider">
            PATRONES
          </h1>
          <p className="text-xl text-muted-foreground">Selecciona tu Nivel</p>
        </div>

        {/* Level buttons */}
        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          {[1, 2, 3, 4, 5].map((level) => (
            <Button
              key={level}
              onClick={() => handleLevelSelect(level)}
              className="h-24 text-lg font-bold bg-card/50 hover:bg-primary/20 border border-border hover:border-primary transition-all duration-300 hover:scale-105 backdrop-blur-sm flex flex-col items-center justify-center gap-2 py-4"
              variant="ghost"
            >
              <span className="text-2xl text-primary font-bold tracking-wide">Nivel {level}</span>
              <span className="text-sm text-foreground/70 font-normal tracking-wider leading-relaxed">
                {LEVEL_INFO[level as keyof typeof LEVEL_INFO].name} — {LEVEL_INFO[level as keyof typeof LEVEL_INFO].description}
              </span>
            </Button>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center max-w-sm space-y-2 mt-6">
          <p className="text-sm text-foreground/80 tracking-wide leading-relaxed">
            Memoriza y repite la secuencia de colores
          </p>
          <p className="text-sm text-foreground/60 tracking-wide leading-relaxed">
            El nivel afecta la velocidad y cantidad de colores
          </p>
        </div>
      </div>
    </div>
  );
};

export default LevelSelect;
