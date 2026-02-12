import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Apostas from "./pages/Apostas";
import Contas from "./pages/Contas";
import Depositos from "./pages/Depositos";
import Financeiro from "./pages/Financeiro";
import Operadores from "./pages/Operadores";
import CriarUsuario from "./pages/CriarUsuario";
import Analytics from "./pages/Analytics";
import Softwares from "./pages/Softwares";
import Casas from "./pages/Casas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/apostas" element={<Apostas />} />
            <Route path="/contas" element={<Contas />} />
            <Route path="/depositos" element={<Depositos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/operadores" element={<Operadores />} />
            <Route path="/criar-usuario" element={<CriarUsuario />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/softwares" element={<Softwares />} />
            <Route path="/casas" element={<Casas />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
