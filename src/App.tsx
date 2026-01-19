import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import LevelSelect from "./pages/LevelSelect";
import Game from "./pages/Game";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* Redirección inicial */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Pantalla inicial */}
            <Route path="/home" element={<Home />} />

            {/* Selección de nivel */}
            <Route path="/levels" element={<LevelSelect />} />

            {/* Juego */}
            <Route path="/game/:level" element={<Game />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
