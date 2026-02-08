import { useState } from 'react';
import { UserWithProfile } from '@/types/profile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Loader2, Crown, Shield, Users, Star, MoreVertical, Trash2, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AdminActionsModal } from './AdminActionsModal';

const teamConfig = {
  dna: { name: 'DNA', color: 'bg-blue-500' },
  elite: { name: 'Elite', color: 'bg-purple-500' },
  alcateia: { name: 'Alcateia', color: 'bg-amber-500' },
};

interface AdminUserTableProps {
  users: UserWithProfile[];
  onUpdateRole: (userId: string, role: 'admin' | 'lider' | 'member') => Promise<{ error: any }>;
  onUpdateProfile: (userId: string, data: { team_id?: string }) => Promise<{ error: any }>;
  onDataChanged: () => void;
  isRoot?: boolean;
  canManageUsers?: boolean;
}

export function AdminUserTable({ users, onUpdateRole, onUpdateProfile, onDataChanged, isRoot = false, canManageUsers = false }: AdminUserTableProps) {
  const { toast } = useToast();
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [actionsModalUser, setActionsModalUser] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRoleChange = async (userId: string, role: 'admin' | 'lider' | 'member') => {
    setLoadingUser(userId);
    const { error } = await onUpdateRole(userId, role);
    setLoadingUser(null);

    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      lider: 'Líder',
      member: 'Membro',
    };

    if (error) {
      toast({
        title: 'Erro ao atualizar papel',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Papel atualizado',
        description: `Usuário agora é ${roleLabels[role]}`,
      });
    }
  };

  const handleTeamChange = async (userId: string, teamId: string) => {
    setLoadingUser(userId);
    const { error } = await onUpdateProfile(userId, { team_id: teamId });
    setLoadingUser(null);

    if (error) {
      toast({
        title: 'Erro ao atualizar equipe',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Equipe atualizada',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || deleteConfirmText !== 'CONFIRMAR') return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteTarget.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Usuário excluído',
        description: `${deleteTarget.name} foi removido do sistema.`,
      });

      setDeleteTarget(null);
      setDeleteConfirmText('');
      onDataChanged();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (role === 'root') {
      return (
        <Badge variant="outline" className="border-rose-500 text-rose-500 gap-1">
          <Crown className="w-3 h-3" />
          Root
        </Badge>
      );
    }
    if (role === 'admin') {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-500 gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>
      );
    }
    if (role === 'lider') {
      return (
        <Badge variant="outline" className="border-emerald-500 text-emerald-500 gap-1">
          <Star className="w-3 h-3" />
          Líder
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-primary text-primary gap-1">
        <Users className="w-3 h-3" />
        Membro
      </Badge>
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const team = user.profile?.team_id ? teamConfig[user.profile.team_id] : null;
            const initials = user.profile?.full_name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';

            const isUserRoot = user.role === 'root';
            const isUserAdmin = user.role === 'admin';
            // Admin e root podem editar roles, exceto de root users
            const canEditRole = !isUserRoot;
            // Root pode excluir qualquer não-root; admin pode excluir membros e líderes
            const canDelete = canManageUsers && !isUserRoot && !(isUserAdmin && !isRoot);

            return (
              <TableRow key={user.id} className={cn(isUserRoot && 'bg-rose-500/5')}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.profile?.full_name || 'Sem nome'}
                      </span>
                      {user.profile?.matricula && (
                        <span className="text-xs text-muted-foreground">
                          Mat: {user.profile.matricula}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={user.profile?.team_id || ''}
                    onValueChange={(value) => handleTeamChange(user.id, value)}
                    disabled={loadingUser === user.id}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dna">DNA</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                      <SelectItem value="alcateia">Alcateia</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {isUserRoot ? (
                    getRoleBadge('root')
                  ) : canEditRole ? (
                    <Select
                      value={user.role || 'member'}
                      onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'lider' | 'member')}
                      disabled={loadingUser === user.id}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="lider">Líder</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getRoleBadge(user.role)
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {loadingUser === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Button asChild variant="ghost" size="icon">
                          <Link to={`/profile/${user.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setActionsModalUser({ 
                                id: user.id, 
                                name: user.profile?.full_name || 'Usuário' 
                              })}
                            >
                              <Settings2 className="w-4 h-4 mr-2" />
                              Gerenciar Dados
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget({
                                    id: user.id,
                                    name: user.profile?.full_name || 'Usuário',
                                  })}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir Usuário
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {actionsModalUser && (
        <AdminActionsModal
          open={!!actionsModalUser}
          onOpenChange={(open) => !open && setActionsModalUser(null)}
          userId={actionsModalUser.id}
          userName={actionsModalUser.name}
          onDataChanged={onDataChanged}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? 
                Esta ação é <strong>irreversível</strong> e removerá todos os dados do usuário.
              </p>
              <p className="text-sm">
                Digite <strong>CONFIRMAR</strong> para prosseguir:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digite CONFIRMAR"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={deleteConfirmText !== 'CONFIRMAR' || isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
