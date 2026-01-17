import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Brain, Eye, Clock } from "lucide-react";

const Status = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-accent/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        {/* Trophy Icon */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -inset-2 bg-yellow-400/20 rounded-full blur-xl -z-10" />
        </div>

        {/* Level Badge */}
        <div className="bg-primary/20 border border-primary/40 rounded-full px-6 py-2 backdrop-blur-sm">
          <p className="text-sm text-primary font-medium tracking-wide flex items-center gap-2">
            <span>✨</span>
            Nivel 1: Principiante
            <span>✨</span>
          </p>
        </div>

        {/* Main Message */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-glow tracking-wide">
            ¡Buena Suerte!
          </h1>
          <p className="text-lg text-foreground/80 tracking-wide">
            ¡Tu mente es poderosa!
          </p>
        </div>

        {/* Tips Card */}
        <div className="bg-card/60 border border-border rounded-2xl p-6 w-full backdrop-blur-sm space-y-4">
          <p className="text-center text-foreground/70 text-sm leading-relaxed">
            La caja está lista para comenzar.
            <br />
            Observa atentamente el patrón de luces y
            <br />
            prepárate para repetirlo.
          </p>

          <div className="space-y-3">
            <p className="text-center text-foreground/90 font-medium">Consejos:</p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-foreground/70 text-sm">
                <Brain className="w-4 h-4 text-primary shrink-0" />
                <span>Mantén tu concentración</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/70 text-sm">
                <Eye className="w-4 h-4 text-primary shrink-0" />
                <span>Visualiza mentalmente el patrón</span>
              </div>
              <div className="flex items-center gap-3 text-foreground/70 text-sm">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Tómate tu tiempo para responder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <Button
            onClick={() => navigate("/levels")}
            variant="outline"
            className="flex-1 h-12 border-border hover:bg-primary/10 hover:border-primary transition-all duration-300"
          >
            Cambiar nivel
          </Button>
          <Button
            onClick={() => navigate("/game/1")}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-300"
          >
            Parar Juego
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Status;
