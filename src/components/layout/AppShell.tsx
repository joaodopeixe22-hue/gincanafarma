import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarClock,
  Home,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Star,
  Trophy,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserMenu } from '@/components/UserMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { Loading } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useDirectory } from '@/hooks/data/useDirectory';
import { usePendingCount } from '@/hooks/data/useEntries';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useViewMode } from '@/contexts/ViewModeContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// O tour (react-joyride) só é baixado quando precisa aparecer
const GuidedTour = lazy(() => import('@/components/tour/GuidedTour').then((m) => ({ default: m.GuidedTour })));

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
  tour: string;
}

export default function AppShell() {
  const { isAuthenticated, isLoading, user, role, isLider, isAdmin, signOut } = useAuth();
  const { storeName, circuitName } = useAppConfig();
  const { canManage } = useDirectory();
  const pendingQ = usePendingCount(isLider);
  const { isMobile } = useViewMode();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  useRealtimeSync();

  // Premia campeões de períodos já fechados (idempotente; 1x por sessão)
  useEffect(() => {
    if (!isAuthenticated || !role) return;
    const key = `champions-${new Date().toDateString()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* navegação privada: tudo bem */
    }
    supabase.rpc('award_champions').then(({ error }) => error && console.warn('award_champions', error.message));
  }, [isAuthenticated, role]);

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const pending = useMemo(
    () => (pendingQ.data ?? []).filter((p) => canManage(p.user_id)).length,
    [pendingQ.data, canManage],
  );

  const items: NavItem[] = useMemo(() => {
    const list: NavItem[] = [
      { to: '/', label: 'Hoje', icon: Home, end: true, tour: 'tour-nav-hoje' },
      { to: '/gincana', label: 'Gincana', icon: Trophy, tour: 'tour-nav-gincana' },
      { to: '/agenda', label: 'Agenda', icon: ListChecks, tour: 'tour-nav-agenda' },
      { to: '/mural', label: 'Mural', icon: Sparkles, tour: 'tour-nav-mural' },
      { to: '/escala', label: 'Escala', icon: CalendarClock, tour: 'tour-nav-escala' },
      { to: '/resultados', label: 'Resultados', icon: BarChart3, tour: 'tour-nav-resultados' },
    ];
    if (isLider) list.push({ to: '/lideranca', label: 'Liderança', icon: Star, badge: pending, tour: 'tour-nav-lideranca' });
    if (isAdmin) list.push({ to: '/admin', label: 'Admin', icon: Settings, tour: 'tour-nav-admin' });
    return list;
  }, [isLider, isAdmin, pending]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (!role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-sm text-muted-foreground">
          Sua conta ({user?.email?.split('@')[0]}) ainda não tem acesso ao app. Peça ao administrador para liberar.
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    );
  }

  const bottom = items.slice(0, 4);
  const more = items.slice(4);
  const moreBadge = more.reduce((s, i) => s + (i.badge ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <GuidedTour isMobile={isMobile} />
      </Suspense>
      <header className="tour-header sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl bg-gradient-to-br from-warning to-amber-600 p-1.5 shadow-glow-warning">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold sm:text-base">{storeName}</p>
              {circuitName && <p className="truncate text-[11px] text-muted-foreground">{circuitName}</p>}
            </div>
          </Link>

          {!isMobile && (
            <nav className="mx-auto hidden items-center gap-0.5 md:flex" aria-label="Principal">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      item.tour,
                      'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                      isActive && 'bg-primary/10 text-primary',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {!!item.badge && (
                    <span className="ml-0.5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell userId={user?.id} />
            <div className="tour-user-menu">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className={cn('container mx-auto px-3 py-4 sm:px-4 sm:py-6', isMobile && 'pb-24')}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>

      {isMobile && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
          aria-label="Principal"
        >
          <div className="grid grid-cols-5">
            {bottom.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    item.tour,
                    'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground',
                    isActive && 'text-primary',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="tour-nav-mais relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
              Mais
              {moreBadge > 0 && (
                <span className="absolute right-4 top-1 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {moreBadge}
                </span>
              )}
            </button>
          </div>
        </nav>
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Mais</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[...more, { to: '/profile', label: 'Meu perfil', icon: User, tour: '' } as NavItem].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium',
                    isActive && 'border-primary bg-primary/5 text-primary',
                  )
                }
              >
                <item.icon className="h-6 w-6" />
                {item.label}
                {!!item.badge && (
                  <span className="absolute right-2 top-2 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
