import { errorMessage } from '@/lib/errors';
import { useState } from 'react';
import { z } from 'zod';
import { UserPlus, IdCard, Lock, User, Users, Loader2, Star, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppConfig } from '@/hooks/data/useAppConfig';
import { useAuth } from '@/hooks/useAuth';

const createUserSchema = z.object({
  matricula: z.string()
    .min(3, { message: 'Matrícula deve ter no mínimo 3 caracteres' })
    .regex(/^[a-zA-Z0-9._-]+$/, { message: 'Matrícula só pode conter letras, números, pontos, hífens e underscores' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  full_name: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  team_id: z.string().optional(),
  role: z.enum(['member', 'lider', 'admin']),
});

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}


export function CreateUserModal({ open, onOpenChange, onUserCreated }: CreateUserModalProps) {
  const { toast } = useToast();
  const { teams } = useAppConfig();
  const { isRoot } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    matricula: '',
    password: '',
    full_name: '',
    team_id: '' as string,
    role: 'member' as 'member' | 'lider' | 'admin',
  });

  const resetForm = () => {
    setFormData({
      matricula: '',
      password: '',
      full_name: '',
      team_id: '',
      role: 'member',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToValidate = {
      ...formData,
      team_id: formData.team_id || undefined,
    };
    
    const result = createUserSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    setErrors({});
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          matricula: formData.matricula,
          password: formData.password,
          full_name: formData.full_name,
          team_id: formData.team_id || null,
          role: formData.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Usuário criado!',
        description: `${formData.full_name} foi criado com sucesso.`,
      });

      resetForm();
      onOpenChange(false);
      onUserCreated?.();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erro ao criar usuário',
        description: errorMessage(error, 'Erro desconhecido'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Crie uma nova conta de usuário para o sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="full_name"
                placeholder="João Silva"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="pl-10"
              />
            </div>
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula (Login)</Label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="matricula"
                placeholder="joao.silva ou 123456"
                value={formData.matricula}
                onChange={(e) => setFormData(prev => ({ ...prev, matricula: e.target.value }))}
                className="pl-10"
              />
            </div>
            {errors.matricula && <p className="text-sm text-destructive">{errors.matricula}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10"
              />
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Papel</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'member' | 'lider' | 'admin') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="lider">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-emerald-500" />
                      Líder
                    </div>
                  </SelectItem>
                  {isRoot && (
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        Admin
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Criar Usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
