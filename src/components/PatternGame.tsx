import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGameEngine } from "@/hooks/useGameEngine";
import { TimerBar } from "@/components/TimerBar";

interface PatternGameProps {
  initialLevel?: number;
}

export const PatternGame = ({ initialLevel = 1 }: PatternGameProps) => {
  const navigate = useNavigate();
  const { gameState, setGameState, level, score, stats, ui, actions, timer } = useGameEngine(initialLevel);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Overlay global (para mensajes importantes como cambio de nivel) */}
      {ui.overlayMessage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="bg-card border-2 border-primary rounded-2xl p-10 text-center text-3xl font-bold text-white shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {ui.overlayMessage}
          </div>
        </div>
      )}

      {/* Fondos decorativos */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-wider text-glow">🧠 Memoria Patron</h1>
          <p className="text-sm text-foreground/70">
            {gameState === "idle" ? "Listo para entrenar tu memoria" : "Sigue la secuencia de luces"}
          </p>
        </div>

        {/* --- AREA DE JUEGO PRINCIPAL --- */}
        <div className="bg-card/60 border border-border rounded-xl p-8 backdrop-blur-md w-full text-center space-y-4 shadow-xl">
          
          {gameState === "paused" ? (
             <div className="py-10">
                <p className="text-4xl font-bold text-yellow-400">PAUSA</p>
             </div>
          ) : (
            <>
              {/* Cuenta regresiva inicial (3, 2, 1) */}
              {ui.countdown !== null && (
                <div className="py-6">
                    <p className="text-6xl font-black text-primary animate-bounce">{ui.countdown}</p>
                </div>
              )}

              {/* Mensajes de estado (Memoriza / Tu turno) */}
              {ui.prepMessage && !ui.countdown && (
                <div className="space-y-2 min-h-[80px] flex flex-col justify-center">
                  <p className={`text-2xl font-bold transition-all duration-300 ${ui.prepMessage.includes("Tu turno") ? "text-green-400 scale-110" : "text-blue-300"}`}>
                    {ui.prepMessage}
                  </p>
                  
                  {ui.prepMessage.includes("Memoriza") && (
                    <p className="text-sm text-muted-foreground animate-pulse">Observa las luces...</p>
                  )}
                </div>
              )}

              {/* BARRA DE TIEMPO: Solo visible cuando es "Tu Turno" (timer active) */}
              <div className={`transition-opacity duration-500 ${timer.isActive ? "opacity-100" : "opacity-0 h-0"}`}>
                 <TimerBar
                    duration={timer.duration}
                    isPlaying={timer.isActive}
                    onTimeUp={timer.onTimeUp}
                    resetKey={timer.resetKey}
                 />
                 <p className="text-xs text-right text-red-300 mt-1 font-mono">TIEMPO RESTANTE</p>
              </div>
            </>
          )}
        </div>

        {/* Info del Juego */}
        {gameState !== "idle" && (
           /* ... (Mantener estadísticas iguales que antes) ... */
           <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-card/40 border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Nivel</p>
              <p className="text-2xl font-bold text-primary">{level}</p>
            </div>
            <div className="bg-card/40 border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-accent">{score}</p>
            </div>
            <div className="bg-card/40 border border-border rounded-lg p-3 text-center col-span-2 flex justify-around">
               <div>
                  <span className="text-green-400 font-bold mr-1">✔</span>{stats.currentHits}
               </div>
               <div>
                   <span className="text-red-400 font-bold mr-1">✖</span>{stats.currentErrors}
               </div>
               <div>
                   <span className="text-yellow-400 font-bold mr-1">🔥</span>{stats.streak}
               </div>
            </div>
          </div>
        )}

        {/* Botonera */}
        <div className="grid grid-cols-2 gap-4 w-full pt-4">
          {gameState === "idle" ? (
             <Button onClick={actions.handlePlaySequence} className="col-span-2 text-lg h-12">
               ▶ INICIAR JUEGO
             </Button>
          ) : (
             <>
                <Button variant="secondary" onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}>
                    {gameState === "paused" ? "REANUDAR" : "PAUSAR"}
                </Button>
                <Button variant="destructive" onClick={() => { actions.hardReset(); navigate("/home"); }}>
                    SALIR
                </Button>
             </>
          )}
        </div>

      </div>
    </div>
  );
};