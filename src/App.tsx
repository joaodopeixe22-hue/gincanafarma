import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { AuthProvider } from '@/hooks/useAuth';
import { Loading } from '@/components/common';
import AppShell from '@/components/layout/AppShell';

// Cada tela é baixada só quando aberta (o app abre mais rápido no 4G)
const Auth = lazy(() => import('./pages/Auth'));
const Hoje = lazy(() => import('./pages/Hoje'));
const Gincana = lazy(() => import('./pages/Gincana'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Escala = lazy(() => import('./pages/Escala'));
const Mural = lazy(() => import('./pages/Mural'));
const Resultados = lazy(() => import('./pages/Resultados'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const Profile = lazy(() => import('./pages/Profile'));
const LeaderPanel = lazy(() => import('./pages/LeaderPanel'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20 * 1000, refetchOnWindowFocus: true, retry: 1 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ViewModeProvider>
        <TooltipProvider delayDuration={200}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route element={<AppShell />}>
                  <Route index element={<Hoje />} />
                  <Route path="gincana" element={<Gincana />} />
                  <Route path="agenda" element={<Agenda />} />
                  <Route path="escala" element={<Escala />} />
                  <Route path="mural" element={<Mural />} />
                  <Route path="resultados" element={<Resultados />} />
                  <Route path="quiz/:quizId" element={<QuizPage />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="profile/:userId" element={<Profile />} />
                  <Route path="lideranca" element={<LeaderPanel />} />
                  <Route path="admin" element={<AdminPanel />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ViewModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
