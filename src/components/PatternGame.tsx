import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGameEngine } from "@/hooks/useGameEngine"; // Importamos el hook

interface PatternGameProps {
  initialLevel?: number;
}

export const PatternGame = ({ initialLevel = 1 }: PatternGameProps) => {
  const navigate = useNavigate();
  
  // Destructuramos todo lo que nos da el hook
  const { 
    gameState, 
    setGameState, 
    level, 
    score, 
    stats, 
    ui, 
    actions 
  } = useGameEngine(initialLevel);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Overlay de mensajes */}
      {ui.overlayMessage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-2xl font-bold animate-fade-in">
            {ui.overlayMessage}
          </div>
        </div>
      )}

      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-wider text-glow">
            🧠 Juego de Memoria
          </h1>
          <p className="text-sm text-foreground/70">
            {gameState === "idle" ? "Prepárate para comenzar" : "Sigue el patrón"}
          </p>
        </div>

        {/* Estado principal */}
        <div className="bg-card/50 border border-border rounded-xl p-6 backdrop-blur-sm w-full text-center space-y-3">
          <p className="text-accent font-semibold animate-pulse">🍀 Buena suerte</p>

          {gameState === "paused" ? (
            <p className="text-3xl font-bold">Pausa</p>
          ) : (
            <>
              {ui.countdown !== null && (
                <p className="text-5xl font-extrabold">{ui.countdown}</p>
              )}

              {ui.prepMessage && (
                <div>
                  <p className="font-semibold">{ui.prepMessage}</p>
                  {ui.prepMessage === "Memoriza el patrón" && (
                    <p className="text-xs text-muted-foreground">
                      Observa atentamente la secuencia
                    </p>
                  )}
                </div>
              )}

              {ui.resultMessage && (
                <p className="text-lg font-bold">{ui.resultMessage}</p>
              )}
            </>
          )}
        </div>

        {/* Nivel + puntuación */}
        {gameState !== "idle" && (
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm text-center">
              <p className="text-xs uppercase text-muted-foreground">Nivel</p>
              <p className="text-2xl font-bold text-primary">{level}</p>
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-4 backdrop-blur-sm text-center">
              <p className="text-xs uppercase text-muted-foreground">Puntuación</p>
              <p className="text-2xl font-bold text-accent">{score}</p>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        {gameState !== "idle" && (
          <div className="grid grid-cols-2 gap-3 w-full text-sm">
            <div className="bg-card/50 border border-border rounded-lg p-3 text-center backdrop-blur-sm">
              Racha
              <p className="font-bold text-green-400">{stats.streak}</p>
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-3 text-center backdrop-blur-sm">
              Aciertos
              <p className="font-bold text-green-400">{stats.currentHits}</p>
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-3 text-center backdrop-blur-sm">
              Errores
              <p className="font-bold text-red-400">{stats.currentErrors}</p>
            </div>
            <div className="bg-card/50 border border-border rounded-lg p-3 text-center backdrop-blur-sm">
              Totales
              <p className="font-bold">✔ {stats.totalHits} / ✖ {stats.totalErrors}</p>
            </div>
          </div>
        )}

        {/* Consejos */}
        {gameState === "idle" && (
          <div className="bg-card/50 border border-border rounded-lg p-5 backdrop-blur-sm w-full text-sm space-y-2">
            <h3 className="font-semibold text-center">💡 Consejos</h3>
            <p>• Observa el patrón completo antes de actuar</p>
            <p>• Memoriza por bloques pequeños</p>
            <p>• Mantén la calma si fallas</p>
            <p>• La dificultad se adapta a tu desempeño</p>
          </div>
        )}

        {/* Botones */}
        <div className="grid grid-cols-2 gap-4 w-full pt-2">
          <Button onClick={actions.handlePlaySequence}>▶ Jugar</Button>
          
          <Button variant="secondary" onClick={() => setGameState("paused")}>
            {gameState === "paused" ? "▶ Reanudar" : "⏸ Pausar"}
          </Button>
          
          <Button onClick={() => { actions.hardReset(); navigate("/levels"); }}>
            Nivel
          </Button>
          
          <Button variant="destructive" onClick={() => { actions.hardReset(); navigate("/home"); }}>
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
};