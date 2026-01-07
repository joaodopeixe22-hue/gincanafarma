import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Trophy, Hash, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const authSchema = z.object({
  matricula: z.string().trim().min(1, { message: 'Matrícula é obrigatória' }),
  password: z.string().min(1, { message: 'Senha é obrigatória' }),
});

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ matricula?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validateForm = () => {
    const result = authSchema.safeParse({ matricula, password });
    if (!result.success) {
      const fieldErrors: { matricula?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'matricula') fieldErrors.matricula = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const { error } = await signIn(matricula, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Matrícula ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
      navigate('/');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-warning to-amber-600 shadow-glow-warning">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">DNA de Campeões</h1>
            <p className="text-sm text-muted-foreground">Gincana Farma 2025</p>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="text-center">
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com sua matrícula e senha para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-matricula">Matrícula</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-matricula"
                    type="text"
                    placeholder="Sua matrícula"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.matricula && (
                  <p className="text-sm text-destructive">{errors.matricula}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Não possui conta? Solicite ao administrador root para criar seu acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
