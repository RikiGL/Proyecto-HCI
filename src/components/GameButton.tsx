import { cn } from "@/lib/utils";

interface GameButtonProps {
  color: "red" | "blue" | "green" | "yellow" | "purple";
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}

const colorClasses = {
  red: "game-btn-red",
  blue: "game-btn-blue",
  green: "game-btn-green",
  yellow: "game-btn-yellow",
  purple: "game-btn-purple",
};

export const GameButton = ({ color, isActive, onClick, disabled }: GameButtonProps) => {
  return (
    <button
      className={cn(
        "game-btn",
        colorClasses[color],
        isActive && "active",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Botón ${color}`}
    />
  );
};
