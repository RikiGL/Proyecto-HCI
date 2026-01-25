import { useEffect, useState } from "react";
import { cn } from "@/lib/utils"; // Asumiendo que usas shadcn o una utilidad de clases

interface TimerBarProps {
  duration: number; // Duración total en segundos
  isPlaying: boolean;
  onTimeUp: () => void;
  resetKey: number; // Para forzar reinicio de la barra
}

export const TimerBar = ({ duration, isPlaying, onTimeUp, resetKey }: TimerBarProps) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Si no está jugando, la barra está llena
    if (!isPlaying) {
      setProgress(100);
      return;
    }

    setProgress(100); // Reset inicial al empezar
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;
      const percentage = (remaining / (duration * 1000)) * 100;

      if (percentage <= 0) {
        setProgress(0);
        clearInterval(interval);
        onTimeUp(); // 🔥 ¡SE ACABÓ EL TIEMPO!
      } else {
        setProgress(percentage);
      }
    }, 50); // Actualización suave (50ms)

    return () => clearInterval(interval);
  }, [isPlaying, duration, resetKey, onTimeUp]);

  // Color dinámico: Verde > Amarillo > Rojo
  const getColor = () => {
    if (progress > 50) return "bg-green-500";
    if (progress > 20) return "bg-yellow-500";
    return "bg-red-600 animate-pulse";
  };

  return (
    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-gray-300 mt-4">
      <div
        className={cn("h-full transition-all ease-linear duration-75", getColor())}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};