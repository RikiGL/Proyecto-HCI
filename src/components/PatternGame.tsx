import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGameEngine } from "@/hooks/useGameEngine";
import { TimerBar } from "@/components/TimerBar";
import { ArrowLeft, Lightbulb, Eye, Clock, Zap } from "lucide-react";

interface PatternGameProps {
  initialLevel?: number;
}

export const PatternGame = ({ initialLevel = 1 }: PatternGameProps) => {
  const navigate = useNavigate();

  const {
    gameState,
    setGameState,
    level,
    score,
    stats,
    ui,
    actions,
    timer,
    controls // Extraemos el control de bloqueo
  } = useGameEngine(initialLevel);

  const handleBack = () => {
    actions.hardReset();
    navigate(-1);
  };

  // Helper para saber si es el momento del jugador
  const isPlayerTurn = ui.prepMessage === "TU TURNO";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <div className="absolute top-4 left-4 z-50">
        <Button variant="ghost" size="icon" onClick={handleBack} className="hover:bg-primary/20 text-foreground transition-all rounded-full w-12 h-12">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      {ui.overlayMessage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="bg-card border-2 border-primary/50 rounded-2xl p-12 text-center shadow-[0_0_60px_rgba(0,0,0,0.7)] transform scale-105">
            {/* Texto grande y centrado */}
            <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-primary animate-pulse tracking-wide">
              {ui.overlayMessage}
            </p>
          </div>
        </div>
      )}

      {/* Fondos */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-wider text-glow flex items-center justify-center gap-3">
            🧠 Juego de Memoria
          </h1>
          <p className="text-sm text-foreground/70">
            {gameState === "idle" ? "Entrena tu mente" : "Sigue la secuencia"}
          </p>
        </div>

        {/* ================= AREA DE JUEGO ================= */}
        <div className={`bg-card/60 border border-border rounded-xl p-6 backdrop-blur-md w-full text-center space-y-4 shadow-xl min-h-[320px] flex flex-col justify-center relative transition-all duration-300 ${isPlayerTurn ? "ring-2 ring-green-500/50 shadow-green-500/20" : ""}`}>
          
          {gameState === "idle" ? (
             <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold text-lg">Instrucciones</h3>
              </div>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-start gap-3"><Eye className="w-4 h-4 mt-0.5 text-primary"/><span><strong>Memoriza:</strong> Mira las luces sin tocar.</span></li>
                <li className="flex items-start gap-3"><Clock className="w-4 h-4 mt-0.5 text-primary"/><span><strong>Espera:</strong> Aguarda el mensaje de turno.</span></li>
                <li className="flex items-start gap-3"><Zap className="w-4 h-4 mt-0.5 text-primary"/><span><strong>Actúa:</strong> Repite antes que acabe el tiempo.</span></li>
              </ul>
            </div>
          ) : gameState === "paused" ? (
             <div className="py-10"><p className="text-4xl font-bold text-yellow-400 animate-pulse">PAUSA</p></div>
          ) : (
            <>
              {ui.countdown !== null && (
                <div className="py-6"><p className="text-7xl font-black text-primary animate-bounce">{ui.countdown}</p></div>
              )}

              {/* MENSAJES DINÁMICOS */}
              {ui.prepMessage && !ui.countdown && (
                <div className="space-y-2 min-h-[120px] flex flex-col justify-center items-center">
                  
                  {/* --- AQUI ESTA EL MENSAJE ENORME --- */}
                  <p className={`font-black transition-all duration-300 leading-tight
                    ${isPlayerTurn 
                      ? "text-6xl text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] animate-pulse scale-110" // Estilo Gigante para TU TURNO
                      : "text-3xl text-blue-300" // Estilo normal para Memoriza
                    }`}
                  >
                    {ui.prepMessage}
                  </p>
                  
                  {/* Subtítulo si es fase de memorizar */}
                  {!isPlayerTurn && ui.prepMessage.includes("Memoriza") && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse bg-black/20 px-3 py-1 rounded-full">
                       🚫 Espera tu turno
                    </div>
                  )}
                </div>
              )}

              {/* BARRA DE TIEMPO */}
              <div className={`transition-opacity duration-300 w-full ${timer.isActive ? "opacity-100" : "opacity-0 h-0"}`}>
                 <TimerBar duration={timer.duration} isPlaying={timer.isActive} onTimeUp={timer.onTimeUp} resetKey={timer.resetKey} />
                 <p className="text-xs text-right text-red-300 mt-1 font-mono">TIEMPO RESTANTE</p>
              </div>
            </>
          )}

          {/* EFECTO DE BLOQUEO VISUAL */}
          {/* Si estamos jugando pero NO es tu turno (y no hay cuenta regresiva), ponemos un velo */}
          {gameState === "playing" && !controls.isInputAllowed && !ui.countdown && (
            <div className="absolute inset-0 bg-background/10 backdrop-blur-[1px] rounded-xl flex items-end justify-center pb-4 pointer-events-none z-10">
               {/* Opcional: Icono de candado o similar */}
            </div>
          )}

        </div>

        {/* Stats con Racha Ilimitada */}
        {gameState !== "idle" && (
           <div className="grid grid-cols-2 gap-4 w-full animate-in fade-in zoom-in duration-300">
            <div className="bg-card/40 border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Nivel</p>
              <p className="text-2xl font-bold text-primary">{level}</p>
            </div>
            <div className="bg-card/40 border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Puntuación</p>
              <p className="text-2xl font-bold text-accent">{score}</p>
            </div>
            <div className="bg-card/40 border border-border rounded-lg p-3 col-span-2 flex justify-around items-center shadow-sm">
               <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Aciertos</span>
                  <span className="text-lg font-bold text-green-400 flex items-center gap-1">✔ {stats.currentHits}</span>
               </div>
               <div className="w-px h-8 bg-border/50" /> 
               <div className="flex flex-col items-center">
                   <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Racha</span>
                   {/* RACHA LOCAL - Ahora puede subir más de 5 */}
                   <span className="text-xl font-bold text-yellow-400 flex items-center gap-1 animate-pulse">🔥 {stats.streak}</span>
               </div>
               <div className="w-px h-8 bg-border/50" /> 
               <div className="flex flex-col items-center">
                   <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Errores</span>
                   <span className="text-lg font-bold text-red-400 flex items-center gap-1">✖ {stats.currentErrors}</span>
               </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 w-full pt-2">
           {gameState === "idle" ? (
             <Button onClick={actions.handlePlaySequence} className="col-span-2 text-lg h-14 bg-gradient-to-r from-primary to-purple-600 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">
               ▶ INICIAR JUEGO
             </Button>
          ) : (
             <>
                <Button variant="secondary" onClick={() => setGameState(gameState === "paused" ? "playing" : "paused")}>
                    {gameState === "paused" ? "REANUDAR" : "PAUSAR"}
                </Button>
                <Button variant="destructive" onClick={() => { actions.hardReset(); navigate("/home"); }}>SALIR</Button>
             </>
          )}
        </div>

      </div>
    </div>
  );
};