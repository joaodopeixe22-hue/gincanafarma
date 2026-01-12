import { useState, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWeeklyReport } from '@/hooks/useWeeklyReport';
import { ReportDashboard } from './ReportDashboard';
import { useToast } from '@/hooks/use-toast';

export function WeeklyReportViewer() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const reportData = useWeeklyReport(weekOffset);
  const { weekLabel, isLoading } = reportData;

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleNextWeek = () => {
    setWeekOffset(prev => Math.max(0, prev - 1));
  };

  const handleExportImage = async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toJpeg(dashboardRef.current, {
        quality: 0.95,
        backgroundColor: '#1a1a2e',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `relatorio-semanal-${weekLabel.replace(/\//g, '-')}.jpeg`;
      link.href = dataUrl;
      link.click();

      toast({
        title: 'Relatório exportado!',
        description: 'A imagem foi salva com sucesso.',
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Relatórios Semanais</CardTitle>
              <CardDescription>
                Visualize e exporte relatórios de desempenho por semana
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousWeek}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>

            <span className="font-semibold text-lg">
              {weekLabel}
              {weekOffset === 0 && (
                <span className="ml-2 text-xs text-muted-foreground">(atual)</span>
              )}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              disabled={weekOffset === 0}
              className="gap-2"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Export Button */}
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleExportImage}
              disabled={isLoading || isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? 'Gerando imagem...' : 'Exportar como Imagem'}
            </Button>
          </div>

          {/* Report Dashboard */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ReportDashboard ref={dashboardRef} data={reportData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
