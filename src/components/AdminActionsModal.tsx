import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Unlock, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  Calendar,
  RotateCcw,
  CheckSquare
} from 'lucide-react';

interface LockedRecord {
  id: string;
  date: string;
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
}

interface AdminActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onDataChanged: () => void;
}

export function AdminActionsModal({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onDataChanged 
}: AdminActionsModalProps) {
  const { toast } = useToast();
  const [lockedRecords, setLockedRecords] = useState<LockedRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');

  useEffect(() => {
    if (open && userId) {
      fetchLockedRecords();
      setResetConfirm('');
      setSelectedRecords([]);
    }
  }, [open, userId]);

  const fetchLockedRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('user_daily_data')
      .select('id, date, ofex, apoio, soria, cadastro')
      .eq('user_id', userId)
      .eq('is_locked', true)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching locked records:', error);
    } else {
      setLockedRecords(data || []);
    }
    setIsLoading(false);
  };

  const handleUnlockSelected = async () => {
    if (selectedRecords.length === 0) return;

    setIsUnlocking(true);
    const { error } = await supabase
      .from('user_daily_data')
      .update({ is_locked: false })
      .in('id', selectedRecords);

    if (error) {
      toast({
        title: 'Erro ao desbloquear',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Registros desbloqueados',
        description: `${selectedRecords.length} registro(s) desbloqueado(s) com sucesso`,
      });
      setSelectedRecords([]);
      fetchLockedRecords();
      onDataChanged();
    }
    setIsUnlocking(false);
  };

  const handleUnlockAll = async () => {
    setIsUnlocking(true);
    const { error } = await supabase
      .from('user_daily_data')
      .update({ is_locked: false })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Erro ao desbloquear',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Todos registros desbloqueados',
        description: 'Todos os registros do usuário foram desbloqueados',
      });
      fetchLockedRecords();
      onDataChanged();
    }
    setIsUnlocking(false);
  };

  const handleResetUserData = async () => {
    if (resetConfirm !== 'CONFIRMAR') {
      toast({
        title: 'Confirmação necessária',
        description: 'Digite CONFIRMAR para prosseguir',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    // Delete all user daily data
    const { error: dataError } = await supabase
      .from('user_daily_data')
      .delete()
      .eq('user_id', userId);

    if (dataError) {
      toast({
        title: 'Erro ao zerar dados',
        description: dataError.message,
        variant: 'destructive',
      });
      setIsResetting(false);
      return;
    }

    // Reset user level to 1 with 0 points
    const { error: levelError } = await supabase
      .from('user_levels')
      .update({ 
        level_number: 1, 
        level_name: 'Iniciante', 
        total_points: 0 
      })
      .eq('user_id', userId);

    if (levelError) {
      console.error('Error resetting user level:', levelError);
    }

    toast({
      title: 'Dados zerados',
      description: `Todos os dados de ${userName} foram zerados`,
    });

    setResetConfirm('');
    fetchLockedRecords();
    onDataChanged();
    setIsResetting(false);
  };

  const toggleRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const toggleAll = () => {
    if (selectedRecords.length === lockedRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(lockedRecords.map(r => r.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Dados: {userName}</DialogTitle>
          <DialogDescription>
            Desbloquear registros ou zerar pontuação do usuário
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="unlock" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unlock" className="gap-2">
              <Unlock className="w-4 h-4" />
              Desbloquear
            </TabsTrigger>
            <TabsTrigger value="reset" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Zerar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unlock" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Registros Bloqueados
                </CardTitle>
                <CardDescription>
                  {lockedRecords.length} registro(s) bloqueado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : lockedRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum registro bloqueado
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleAll}
                        className="gap-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        {selectedRecords.length === lockedRecords.length ? 'Desmarcar' : 'Selecionar'} Todos
                      </Button>
                      <Badge variant="secondary">
                        {selectedRecords.length} selecionado(s)
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px] pr-4">
                      <div className="space-y-2">
                        {lockedRecords.map((record) => (
                          <div 
                            key={record.id}
                            className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleRecord(record.id)}
                          >
                            <Checkbox 
                              checked={selectedRecords.includes(record.id)}
                              onCheckedChange={() => toggleRecord(record.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {format(new Date(record.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                OFEX: {record.ofex} | Apoio: {record.apoio} | Soria: {record.soria} | Cadastro: {record.cadastro}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handleUnlockSelected}
                        disabled={selectedRecords.length === 0 || isUnlocking}
                        className="flex-1 gap-2"
                      >
                        {isUnlocking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                        Desbloquear Selecionados
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleUnlockAll}
                        disabled={isUnlocking}
                      >
                        Todos
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reset" className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção!</strong> Esta ação irá apagar permanentemente todos os dados de KPI e zerar a pontuação do usuário. Esta ação não pode ser desfeita.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Zerar Dados do Usuário
                </CardTitle>
                <CardDescription>
                  Remove todos os registros de KPI e reseta o nível para 1
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Digite CONFIRMAR para prosseguir:
                  </label>
                  <input 
                    type="text"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                    className="mt-2 w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="CONFIRMAR"
                  />
                </div>
                <Button 
                  variant="destructive"
                  onClick={handleResetUserData}
                  disabled={resetConfirm !== 'CONFIRMAR' || isResetting}
                  className="w-full gap-2"
                >
                  {isResetting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Zerar Todos os Dados
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
