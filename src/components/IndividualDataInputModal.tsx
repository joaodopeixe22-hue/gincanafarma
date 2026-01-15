import { useState, useEffect } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Save, Target, User, Lock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KPI_LABELS } from '@/types/gincana';
import { useViewMode } from '@/contexts/ViewModeContext';
import { cn } from '@/lib/utils';

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
  const { isMobile } = useViewMode();
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

  const content = (
    <>
      <div className={cn("space-y-4", isMobile ? "py-2" : "py-4")}>
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
            <AlertDescription className="text-amber-200 text-sm">
              Atenção: Após salvar, este registro será bloqueado.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {(['ofex', 'apoio', 'soria', 'cadastro'] as const).map(kpi => (
            <div key={kpi} className="space-y-1.5 sm:space-y-2">
              <Label 
                htmlFor={kpi} 
                className={cn(
                  "font-medium text-muted-foreground uppercase tracking-wide",
                  isMobile ? "text-[10px]" : "text-xs"
                )}
              >
                {KPI_LABELS[kpi]}
              </Label>
              <Input
                id={kpi}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={formData[kpi] || ''}
                onChange={(e) => handleInputChange(kpi, e.target.value)}
                disabled={isLocked}
                className={cn(
                  "bg-background/50 border-border/50 text-center font-semibold focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed",
                  isMobile ? "text-lg h-12" : "text-lg"
                )}
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className={cn(
          "flex items-center justify-between rounded-lg bg-muted/50",
          isMobile ? "p-2.5" : "p-3"
        )}>
          <span className={cn(
            "font-medium text-muted-foreground",
            isMobile ? "text-xs" : "text-sm"
          )}>
            Total do dia
          </span>
          <span className={cn(
            "font-bold text-primary",
            isMobile ? "text-lg" : "text-lg"
          )}>
            {total} pts
          </span>
        </div>

        {hasExistingData && !isLocked && (
          <p className={cn(
            "text-muted-foreground text-center",
            isMobile ? "text-[10px]" : "text-xs"
          )}>
            Você já registrou dados para este dia. Salvando novamente irá atualizar os valores.
          </p>
        )}
      </div>
    </>
  );

  const footer = (
    <div className={cn(
      "flex gap-3",
      isMobile ? "flex-col-reverse" : "justify-end"
    )}>
      <Button 
        variant="outline" 
        onClick={onClose}
        className={isMobile ? "w-full" : ""}
      >
        {isLocked ? 'Fechar' : 'Cancelar'}
      </Button>
      {!isLocked && (
        <Button 
          onClick={handleSave} 
          className={cn("gap-2", isMobile ? "w-full" : "")} 
          disabled={isSaving}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : willBeLocked ? 'Salvar e Bloquear' : 'Salvar'}
        </Button>
      )}
    </div>
  );

  // Use Drawer for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0 pb-2">
            <DrawerTitle className="flex items-center gap-2 text-lg">
              <div className={`p-1.5 rounded-lg ${isLocked ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                {isLocked ? (
                  <Lock className="w-4 h-4 text-amber-500" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <span>{isLocked ? 'Dados Bloqueados' : 'Meus KPIs'}</span>
            </DrawerTitle>
            <p className="text-xs text-muted-foreground text-left">
              {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </DrawerHeader>
          {content}
          <DrawerFooter className="px-0 pt-4">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

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

        {content}

        <div className="pt-4 border-t border-border/50">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}
