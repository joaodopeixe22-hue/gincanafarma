import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Save, Trophy, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DailyData, TEAMS, KPIS, KPI_LABELS, TeamKPIs } from '@/types/gincana';
import { TeamBadge } from './TeamBadge';
import { cn } from '@/lib/utils';

interface DataInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  initialData: DailyData;
  onSave: (data: DailyData) => void;
  isAdmin?: boolean;
  hasExistingData?: boolean;
}

export function DataInputModal({ isOpen, onClose, date, initialData, onSave, isAdmin = false, hasExistingData = false }: DataInputModalProps) {
  const [formData, setFormData] = useState<DailyData>(initialData);
  
  // Membros não podem editar dados existentes
  const isReadOnly = hasExistingData && !isAdmin;

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleInputChange = (teamId: 'dna' | 'elite' | 'alcateia', kpi: keyof TeamKPIs, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      teams: {
        ...prev.teams,
        [teamId]: {
          ...prev.teams[teamId],
          [kpi]: Math.max(0, numValue),
        },
      },
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const getTeamTotal = (teamId: 'dna' | 'elite' | 'alcateia') => {
    const team = formData.teams[teamId];
    return team.ofex + team.apoio + team.soria + team.cadastro;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <span>{isReadOnly ? 'Visualizar KPIs' : 'Registrar KPIs'}</span>
            <span className="text-muted-foreground font-normal">
              — {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </DialogTitle>
          {isReadOnly && (
            <p className="text-sm text-muted-foreground mt-2">
              Apenas administradores podem editar dados já salvos.
            </p>
          )}
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {(['dna', 'elite', 'alcateia'] as const).map(teamId => (
            <div
              key={teamId}
              className={cn(
                'p-4 rounded-xl border-2 transition-all',
                `border-team-${teamId}/30 bg-team-${teamId}/5`
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <TeamBadge teamId={teamId} size="lg" />
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Trophy className="w-5 h-5 text-warning" />
                  <span>{getTeamTotal(teamId)} pts</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {KPIS.map(kpi => (
                  <div key={kpi} className="space-y-2">
                    <Label htmlFor={`${teamId}-${kpi}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {KPI_LABELS[kpi]}
                    </Label>
                    <Input
                      id={`${teamId}-${kpi}`}
                      type="number"
                      min="0"
                      value={formData.teams[teamId][kpi] || ''}
                      onChange={(e) => handleInputChange(teamId, kpi, e.target.value)}
                      disabled={isReadOnly}
                      className="bg-background/50 border-border/50 text-center text-lg font-semibold focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose}>
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Dados
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
