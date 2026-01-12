import { useState, useEffect } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Save, Target, User, Lock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KPI_LABELS } from '@/types/gincana';

interface IndividualDataInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  initialData: { ofex: number; apoio: number; soria: number; cadastro: number } | null;
  onSave: (data: { ofex: number; apoio: number; soria: number; cadastro: number }) => Promise<void>;
  hasExistingData?: boolean;
  isLocked?: boolean;
}

export function IndividualDataInputModal({
  isOpen,
  onClose,
  date,
  initialData,
  onSave,
  hasExistingData = false,
  isLocked = false,
}: IndividualDataInputModalProps) {
  const [formData, setFormData] = useState({
    ofex: initialData?.ofex || 0,
    apoio: initialData?.apoio || 0,
    soria: initialData?.soria || 0,
    cadastro: initialData?.cadastro || 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      ofex: initialData?.ofex || 0,
      apoio: initialData?.apoio || 0,
      soria: initialData?.soria || 0,
      cadastro: initialData?.cadastro || 0,
    });
  }, [initialData]);

  const handleInputChange = (kpi: keyof typeof formData, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [kpi]: Math.max(0, numValue),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const total = formData.ofex + formData.apoio + formData.soria + formData.cadastro;
  const isPastDay = isBefore(startOfDay(date), startOfDay(new Date()));
  const willBeLocked = isPastDay && !isLocked;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/50">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className={`p-2 rounded-lg ${isLocked ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
              {isLocked ? (
                <Lock className="w-5 h-5 text-amber-500" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <span>{isLocked ? 'Dados Bloqueados' : 'Meus KPIs'}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLocked && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Lock className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-200">
                Este dia está bloqueado e não pode ser editado.
              </AlertDescription>
            </Alert>
          )}

          {willBeLocked && !hasExistingData && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-200">
                Atenção: Após salvar, este registro será bloqueado e não poderá ser editado.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {(['ofex', 'apoio', 'soria', 'cadastro'] as const).map(kpi => (
              <div key={kpi} className="space-y-2">
                <Label htmlFor={kpi} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {KPI_LABELS[kpi]}
                </Label>
                <Input
                  id={kpi}
                  type="number"
                  min="0"
                  value={formData[kpi] || ''}
                  onChange={(e) => handleInputChange(kpi, e.target.value)}
                  disabled={isLocked}
                  className="bg-background/50 border-border/50 text-center text-lg font-semibold focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium text-muted-foreground">Total do dia</span>
            <span className="text-lg font-bold text-primary">{total} pts</span>
          </div>

          {hasExistingData && !isLocked && (
            <p className="text-xs text-muted-foreground text-center">
              Você já registrou dados para este dia. Salvando novamente irá atualizar os valores.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose}>
            {isLocked ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isLocked && (
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : willBeLocked ? 'Salvar e Bloquear' : 'Salvar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
