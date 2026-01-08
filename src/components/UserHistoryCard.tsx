import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Calendar } from 'lucide-react';
import { UserHistoryRecord, UserHistoryTotals } from '@/hooks/useUserHistory';

interface UserHistoryCardProps {
  records: UserHistoryRecord[];
  totals: UserHistoryTotals;
  isLoading: boolean;
}

export function UserHistoryCard({ records, totals, isLoading }: UserHistoryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum registro encontrado.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico de Registros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totais agregados */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Totais Acumulados</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              OFEX: {totals.ofex}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              Apoio: {totals.apoio}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              Sorria: {totals.soria}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              Cadastro: {totals.cadastro}
            </Badge>
            <Badge className="text-sm bg-primary">
              Total: {totals.total}
            </Badge>
          </div>
        </div>

        {/* Lista de registros */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {records.map((record) => {
              const recordTotal = record.ofex + record.apoio + record.soria + record.cadastro;
              const formattedDate = format(parseISO(record.date), "dd 'de' MMMM, yyyy", { locale: ptBR });
              
              return (
                <div 
                  key={record.id}
                  className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>OFEX: <span className="text-foreground font-medium">{record.ofex}</span></span>
                    <span>Apoio: <span className="text-foreground font-medium">{record.apoio}</span></span>
                    <span>Sorria: <span className="text-foreground font-medium">{record.soria}</span></span>
                    <span>Cadastro: <span className="text-foreground font-medium">{record.cadastro}</span></span>
                    <span className="ml-auto font-medium text-primary">Total: {recordTotal}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
