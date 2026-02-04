import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Trash2, Loader2, Users } from 'lucide-react';

interface ResetTeamDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged: () => void;
}

const teamConfig = {
  dna: { name: 'DNA', color: 'bg-blue-500' },
  elite: { name: 'Elite', color: 'bg-purple-500' },
  alcateia: { name: 'Alcateia', color: 'bg-amber-500' },
};

export function ResetTeamDataModal({ open, onOpenChange, onDataChanged }: ResetTeamDataModalProps) {
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetType, setResetType] = useState<'team' | 'all'>('team');

  const handleResetTeamData = async () => {
    if (resetConfirm !== 'CONFIRMAR') {
      toast({
        title: 'Confirmação necessária',
        description: 'Digite CONFIRMAR para prosseguir',
        variant: 'destructive',
      });
      return;
    }

    if (resetType === 'team' && !selectedTeam) {
      toast({
        title: 'Equipe não selecionada',
        description: 'Selecione uma equipe para zerar',
        variant: 'destructive',
      });
      return;
    }

    setIsResetting(true);

    try {
      if (resetType === 'team') {
        // Get all users from the team
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', selectedTeam);

        if (teamMembers && teamMembers.length > 0) {
          const userIds = teamMembers.map(m => m.id);

          // Delete user daily data for team members
          await supabase
            .from('user_daily_data')
            .delete()
            .in('user_id', userIds);

          // Reset user levels for team members
          await supabase
            .from('user_levels')
            .update({ level_number: 1, level_name: 'Iniciante', total_points: 0 })
            .in('user_id', userIds);
        }

        // Reset team data in gincana_daily_data
        const teamPrefix = selectedTeam;
        const updateData: Record<string, number> = {};
        updateData[`${teamPrefix}_ofex`] = 0;
        updateData[`${teamPrefix}_apoio`] = 0;
        updateData[`${teamPrefix}_soria`] = 0;
        updateData[`${teamPrefix}_cadastro`] = 0;

        await supabase
          .from('gincana_daily_data')
          .update(updateData)
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

        toast({
          title: 'Dados da equipe zerados',
          description: `Todos os dados da equipe ${teamConfig[selectedTeam as keyof typeof teamConfig]?.name} foram zerados`,
        });
      } else {
        // Reset ALL data
        await supabase.from('user_daily_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('gincana_daily_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase
          .from('user_levels')
          .update({ level_number: 1, level_name: 'Iniciante', total_points: 0 })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        toast({
          title: 'Todos os dados zerados',
          description: 'Todos os dados de todas as equipes foram zerados',
        });
      }

      setResetConfirm('');
      setSelectedTeam('');
      onDataChanged();
      onOpenChange(false);
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: 'Erro ao zerar dados',
        description: 'Ocorreu um erro ao tentar zerar os dados',
        variant: 'destructive',
      });
    }

    setIsResetting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Zerar Pontuação
          </DialogTitle>
          <DialogDescription>
            Zere a pontuação de uma equipe ou de todas as equipes
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção!</strong> Esta ação irá apagar permanentemente todos os dados de KPI e pontuação. Esta ação não pode ser desfeita.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selecione o Escopo
            </CardTitle>
            <CardDescription>
              Escolha zerar uma equipe específica ou todas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Reset:</label>
              <Select value={resetType} onValueChange={(v) => setResetType(v as 'team' | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Equipe Específica</SelectItem>
                  <SelectItem value="all">Todas as Equipes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resetType === 'team' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Equipe:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dna">DNA</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                    <SelectItem value="alcateia">Alcateia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Digite CONFIRMAR para prosseguir:
              </label>
              <input 
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="CONFIRMAR"
              />
            </div>

            <Button 
              variant="destructive"
              onClick={handleResetTeamData}
              disabled={resetConfirm !== 'CONFIRMAR' || isResetting || (resetType === 'team' && !selectedTeam)}
              className="w-full gap-2"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {resetType === 'all' ? 'Zerar TUDO' : 'Zerar Equipe'}
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
