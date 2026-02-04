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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Eye, Loader2, Crown, Shield, Users, Star, MoreVertical, Unlock, Trash2, Settings2 } from 'lucide-react';
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
}

export function AdminUserTable({ users, onUpdateRole, onUpdateProfile, onDataChanged, isRoot = false }: AdminUserTableProps) {
  const { toast } = useToast();
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [actionsModalUser, setActionsModalUser] = useState<{ id: string; name: string } | null>(null);
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

            // Root users can't have their role changed by anyone
            const isUserRoot = user.role === 'root';
            const canEditRole = isRoot && !isUserRoot;

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
    </div>
  );
}
