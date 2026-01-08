import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemberGoals } from '@/hooks/useMemberGoals';
import { Loader2 } from 'lucide-react';

interface MemberGoalsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const kpiLabels: Record<string, string> = {
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Sorria',
  cadastro: 'Cadastro',
  total: 'Total',
};

export function MemberGoalsEditor({
  open,
  onOpenChange,
  userId,
  userName,
}: MemberGoalsEditorProps) {
  const { goalsMap, isLoading, saveGoals } = useMemberGoals(userId);
  const [localGoals, setLocalGoals] = useState(goalsMap);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (open) {
      setLocalGoals(goalsMap);
    }
  }, [goalsMap, open]);

  const handleInputChange = (
    periodType: 'daily' | 'weekly',
    kpiType: string,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    
    setLocalGoals((prev) => {
      const newGoals = { ...prev };
      
      newGoals[periodType] = {
        ...prev[periodType],
        [kpiType]: Math.max(0, numValue),
      };
      
      // Se alterou o diário, calcula automaticamente o semanal (x5 dias úteis)
      if (periodType === 'daily') {
        newGoals.weekly = {
          ...prev.weekly,
          [kpiType]: Math.max(0, numValue) * 5,
        };
      }
      
      return newGoals;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveGoals(localGoals);
    setIsSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const renderKpiInputs = (periodType: 'daily' | 'weekly') => (
    <div className="space-y-4">
      {(['ofex', 'apoio', 'soria', 'cadastro', 'total'] as const).map((kpi) => (
        <div key={kpi} className="flex items-center gap-4">
          <Label htmlFor={`${periodType}-${kpi}`} className="w-24 text-right">
            {kpiLabels[kpi]}
          </Label>
          <Input
            id={`${periodType}-${kpi}`}
            type="number"
            min="0"
            value={localGoals[periodType][kpi]}
            onChange={(e) => handleInputChange(periodType, kpi, e.target.value)}
            className="flex-1"
          />
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Metas - {userName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'daily' | 'weekly')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">Diárias</TabsTrigger>
              <TabsTrigger value="weekly">Semanais</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              {renderKpiInputs('daily')}
              <p className="text-xs text-muted-foreground mt-4">
                ℹ️ A meta semanal será calculada automaticamente (diária × 5 dias úteis)
              </p>
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              {renderKpiInputs('weekly')}
              <p className="text-xs text-muted-foreground mt-4">
                Valores calculados automaticamente. Você pode ajustar manualmente se necessário.
              </p>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Metas'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
