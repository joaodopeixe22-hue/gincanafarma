import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MemberPerformance } from '@/hooks/useTeamReports';

interface MemberPerformanceTableProps {
  members: MemberPerformance[];
}

export function MemberPerformanceTable({ members }: MemberPerformanceTableProps) {
  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desempenho por Membro</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          Nenhum membro encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Desempenho por Membro</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Membro</TableHead>
              <TableHead className="text-right">Esta Semana</TableHead>
              <TableHead className="text-right">Sem. Passada</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Tendência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, index) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{member.thisWeek}</TableCell>
                <TableCell className="text-right text-muted-foreground">{member.lastWeek}</TableCell>
                <TableCell className="text-right font-bold">{member.total}</TableCell>
                <TableCell className="text-center">
                  {member.trend === 'up' && (
                    <TrendingUp className="w-5 h-5 text-green-500 inline" />
                  )}
                  {member.trend === 'down' && (
                    <TrendingDown className="w-5 h-5 text-red-500 inline" />
                  )}
                  {member.trend === 'same' && (
                    <Minus className="w-5 h-5 text-muted-foreground inline" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
