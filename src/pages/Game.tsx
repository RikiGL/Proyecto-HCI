import { useParams, useNavigate } from "react-router-dom";
import { PatternGame } from "@/components/PatternGame";

const Game = () => {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const initialLevel = level ? parseInt(level, 10) : 1;

  // Validate level is between 1-5
  const validLevel = Math.min(5, Math.max(1, isNaN(initialLevel) ? 1 : initialLevel));

  const handleBack = () => {
    navigate("/levels");
  };

  return <PatternGame initialLevel={validLevel} onBack={handleBack} />;
};

export default Game;
