import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users } from 'lucide-react';

interface TeamTotals {
  ofex: number;
  apoio: number;
  soria: number;
  cadastro: number;
  total: number;
  memberCount: number;
}

interface TeamSummaryCardProps {
  teamName: string;
  teamColor: string;
  totals: TeamTotals;
}

export function TeamSummaryCard({ teamName, teamColor, totals }: TeamSummaryCardProps) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: teamColor }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            Resumo da Equipe {teamName}
          </div>
          <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Users className="w-4 h-4" />
            {totals.memberCount} membros
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{totals.ofex}</p>
            <p className="text-xs text-muted-foreground">OFEX</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{totals.apoio}</p>
            <p className="text-xs text-muted-foreground">Apoio</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{totals.soria}</p>
            <p className="text-xs text-muted-foreground">Sorria</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{totals.cadastro}</p>
            <p className="text-xs text-muted-foreground">Cadastro</p>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-primary">{totals.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
