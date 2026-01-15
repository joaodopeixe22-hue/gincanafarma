import { useState, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { ChevronLeft, ChevronRight, Download, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWeeklyReport } from '@/hooks/useWeeklyReport';
import { ReportDashboard } from './ReportDashboard';
import { useToast } from '@/hooks/use-toast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { cn } from '@/lib/utils';

export function WeeklyReportViewer() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isMobile } = useViewMode();

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
      // Configurações otimizadas para mobile vs desktop
      const options = isMobile ? {
        quality: 0.9,
        backgroundColor: '#1a1a2e',
        pixelRatio: 1.5,
        width: 400,
        height: dashboardRef.current.scrollHeight * (400 / dashboardRef.current.offsetWidth),
      } : {
        quality: 0.95,
        backgroundColor: '#1a1a2e',
        pixelRatio: 2,
      };

      const dataUrl = await toJpeg(dashboardRef.current, options);

      // Para mobile, tentar usar share API se disponível
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `relatorio-${weekLabel.replace(/\//g, '-')}.jpeg`, { type: 'image/jpeg' });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Relatório Semanal',
              text: `Relatório da semana ${weekLabel}`,
            });
            toast({
              title: 'Relatório compartilhado!',
              description: 'A imagem foi compartilhada com sucesso.',
            });
            return;
          }
        } catch (shareError) {
          console.log('Share API not available, falling back to download');
        }
      }

      // Fallback: download
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
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className={cn(isMobile ? "p-4" : "")}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={cn(isMobile ? "text-lg" : "")}>Relatórios Semanais</CardTitle>
              <CardDescription className={cn(isMobile ? "text-xs" : "")}>
                Visualize e exporte relatórios de desempenho
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(isMobile ? "p-4 pt-0" : "")}>
          {/* Week Navigation - Compact for mobile */}
          <div className={cn(
            "flex items-center justify-between",
            isMobile ? "mb-4 gap-2" : "mb-6"
          )}>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handlePreviousWeek}
              className={cn(!isMobile && "gap-2")}
            >
              <ChevronLeft className="w-4 h-4" />
              {!isMobile && "Anterior"}
            </Button>

            <div className="text-center flex-1">
              <span className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                {weekLabel}
              </span>
              {weekOffset === 0 && (
                <span className={cn(
                  "ml-1 text-muted-foreground",
                  isMobile ? "text-[10px]" : "text-xs"
                )}>
                  (atual)
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handleNextWeek}
              disabled={weekOffset === 0}
              className={cn(!isMobile && "gap-2")}
            >
              {!isMobile && "Próxima"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Export Button */}
          <div className={cn("flex justify-center", isMobile ? "mb-4" : "mb-6")}>
            <Button
              onClick={handleExportImage}
              disabled={isLoading || isExporting}
              size={isMobile ? "sm" : "default"}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isMobile && navigator.share ? (
                <Share2 className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting 
                ? 'Gerando...' 
                : isMobile && navigator.share 
                  ? 'Compartilhar' 
                  : 'Exportar Imagem'
              }
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
