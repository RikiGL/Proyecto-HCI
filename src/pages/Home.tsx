import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Eye, Zap, Star } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/levels");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Brain Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <Brain className="w-10 h-10 text-primary" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-glow tracking-wider">
            Memoria Patrón
          </h1>
          <p className="text-sm text-foreground/70 tracking-wide leading-relaxed">
            Desafía tu memoria y sigue el patrón
          </p>
        </div>

        {/* Instruction Cards */}
        <div className="w-full space-y-3 mt-2">
          {/* Card 1 */}
          <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground tracking-wide">
                  Observa el Patrón
                </h3>
                <p className="text-xs text-foreground/60 tracking-wide leading-relaxed">
                  La caja mostrará una secuencia de luces que debes memorizar
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground tracking-wide">
                  Repite la Secuencia
                </h3>
                <p className="text-xs text-foreground/60 tracking-wide leading-relaxed">
                  Reproduce el patrón exacto en la caja física
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground tracking-wide">
                  Sube de Nivel
                </h3>
                <p className="text-xs text-foreground/60 tracking-wide leading-relaxed">
                  Cada nivel aumenta la complejidad del patrón
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          className="w-full mt-4 h-12 text-base font-semibold bg-card/80 hover:bg-primary/20 border border-border hover:border-primary transition-all duration-300 tracking-wide"
          variant="ghost"
        >
          Comenzar Juego
        </Button>
      </div>
    </div>
  );
};

export default Home;
