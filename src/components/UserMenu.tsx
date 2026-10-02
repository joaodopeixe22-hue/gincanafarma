import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Shield, Users, Loader2, Settings, Crown, Star, HelpCircle, Lightbulb, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTourState } from '@/hooks/useTourState';
import { useSuggestions } from '@/hooks/useSuggestions';
import { SuggestionForm } from '@/components/suggestions/SuggestionForm';
import { useViewMode, ViewMode } from '@/contexts/ViewModeContext';
import { useDirectory } from '@/hooks/data/useDirectory';

export function UserMenu() {
  const { user, role, isRoot, isAdmin, isLider, isMember, isAuthenticated, isLoading, canManageUsers, canAccessLeaderPanel, signOut } = useAuth();
  const { toast } = useToast();
  const { resetTour } = useTourState(user?.id);
  const { createSuggestion } = useSuggestions(user?.id);
  const [suggestionFormOpen, setSuggestionFormOpen] = useState(false);
  const { mode, setViewMode } = useViewMode();
  const { me } = useDirectory();
  const handleResetTour = () => {
    resetTour();
    toast({
      title: 'Tour reiniciado!',
      description: 'O tour guiado será exibido novamente.',
    });
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Até logo!',
        description: 'Você saiu da sua conta',
      });
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/auth">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Entrar</span>
        </Link>
      </Button>
    );
  }

  const getRoleBadge = () => {
    if (isRoot) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-rose-500">
          <Crown className="w-3 h-3" />
          Root
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (role === 'lider') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
          <Star className="w-3 h-3" />
          Líder
        </span>
      );
    }
    if (role === 'member') {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <Users className="w-3 h-3" />
          Membro
        </span>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">Sem papel definido</span>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {isRoot ? (
            <Crown className="w-4 h-4 text-rose-500" />
          ) : (
            <User className="w-4 h-4" />
          )}
          <span className="hidden sm:inline max-w-28 truncate">
            {me?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span className="font-medium truncate">{me?.full_name ?? user?.email?.split('@')[0]}</span>
            <span className="text-xs text-muted-foreground">Matrícula {user?.email?.split('@')[0]}</span>
            {getRoleBadge()}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="tour-profile-link cursor-pointer">
          <Link to="/profile">
            <User className="w-4 h-4 mr-2" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        {canAccessLeaderPanel && (
          <DropdownMenuItem asChild className="tour-leader-link cursor-pointer">
            <Link to="/lideranca">
              <Star className="w-4 h-4 mr-2" />
              Painel de Liderança
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/admin">
              <Settings className="w-4 h-4 mr-2" />
              Painel Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {mode === 'mobile' ? <Smartphone className="w-4 h-4 mr-2" /> : <Monitor className="w-4 h-4 mr-2" />}
            Modo de Visualização
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <DropdownMenuRadioItem value="auto">Automático</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desktop">
                <Monitor className="w-4 h-4 mr-2" />
                Desktop
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="mobile">
                <Smartphone className="w-4 h-4 mr-2" />
                Mobile
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => setSuggestionFormOpen(true)} className="cursor-pointer">
          <Lightbulb className="w-4 h-4 mr-2" />
          Enviar Sugestão
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetTour} className="cursor-pointer">
          <HelpCircle className="w-4 h-4 mr-2" />
          Ver Tour Novamente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>

      <SuggestionForm
        open={suggestionFormOpen}
        onOpenChange={setSuggestionFormOpen}
        onSubmit={createSuggestion}
      />
    </DropdownMenu>
  );
}
