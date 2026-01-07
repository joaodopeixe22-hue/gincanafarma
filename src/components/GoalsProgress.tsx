import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Trophy, Zap, TrendingUp, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoals } from '@/hooks/useGoals';
import { TeamRanking, KPIS } from '@/types/gincana';
import { Confetti } from './Confetti';

interface GoalsProgressProps {
  dailyRanking: TeamRanking[];
  weeklyRanking: TeamRanking[];
}

const kpiLabels: Record<string, string> = {
  ofex: 'OFEX',
  apoio: 'Apoio',
  soria: 'Soria',
  cadastro: 'Cadastro',
  total: 'Total Geral',
};

export function GoalsProgress({ dailyRanking, weeklyRanking }: GoalsProgressProps) {
  const { getGoal, updateGoal, isLoading } = useGoals();
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebratedGoals, setCelebratedGoals] = useState<Set<string>>(new Set());

  const calculateTotals = (ranking: TeamRanking[]) => {
    const totals: Record<string, number> = { ofex: 0, apoio: 0, soria: 0, cadastro: 0, total: 0 };
    ranking.forEach((team) => {
      totals.ofex += team.kpis.ofex;
      totals.apoio += team.kpis.apoio;
      totals.soria += team.kpis.soria;
      totals.cadastro += team.kpis.cadastro;
      totals.total += team.total;
    });
    return totals;
  };

  const dailyTotals = useMemo(() => calculateTotals(dailyRanking), [dailyRanking]);
  const weeklyTotals = useMemo(() => calculateTotals(weeklyRanking), [weeklyRanking]);

  const handleEdit = (periodType: string, kpiType: string, currentValue: number) => {
    setEditingGoal(`${periodType}-${kpiType}`);
    setEditValue(currentValue.toString());
  };

  const handleSave = async (periodType: 'daily' | 'weekly', kpiType: string) => {
    try {
      await updateGoal(periodType, kpiType, parseInt(editValue) || 0);
      setEditingGoal(null);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleCancel = () => {
    setEditingGoal(null);
    setEditValue('');
  };

  // Check for goal achievements
  useEffect(() => {
    const checkGoals = () => {
      const kpiTypes = ['ofex', 'apoio', 'soria', 'cadastro', 'total'];
      
      kpiTypes.forEach((kpi) => {
        const dailyGoal = getGoal('daily', kpi);
        const dailyCurrent = dailyTotals[kpi];
        const dailyKey = `daily-${kpi}`;
        
        if (dailyGoal > 0 && dailyCurrent >= dailyGoal && !celebratedGoals.has(dailyKey)) {
          setShowConfetti(true);
          setCelebratedGoals((prev) => new Set([...prev, dailyKey]));
        }

        const weeklyGoal = getGoal('weekly', kpi);
        const weeklyCurrent = weeklyTotals[kpi];
        const weeklyKey = `weekly-${kpi}`;
        
        if (weeklyGoal > 0 && weeklyCurrent >= weeklyGoal && !celebratedGoals.has(weeklyKey)) {
          setShowConfetti(true);
          setCelebratedGoals((prev) => new Set([...prev, weeklyKey]));
        }
      });
    };

    if (!isLoading) {
      checkGoals();
    }
  }, [dailyTotals, weeklyTotals, getGoal, celebratedGoals, isLoading]);

  const renderProgressBar = (
    periodType: 'daily' | 'weekly',
    kpiType: string,
    current: number,
    icon: React.ReactNode
  ) => {
    const goal = getGoal(periodType, kpiType);
    const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    const isComplete = current >= goal && goal > 0;
    const isEditing = editingGoal === `${periodType}-${kpiType}`;

    return (
      <motion.div
        key={`${periodType}-${kpiType}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg border transition-all ${
          isComplete
            ? 'bg-green-500/20 border-green-500/50'
            : 'bg-card/50 border-border/50'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{kpiLabels[kpiType]}</span>
            {isComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-green-400"
              >
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-bold">META ATINGIDA!</span>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-20 h-7 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleSave(periodType, kpiType)}
                >
                  <Check className="w-3 h-3 text-green-400" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleCancel}
                >
                  <X className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {current} / {goal}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleEdit(periodType, kpiType, goal)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="relative">
          <Progress
            value={percentage}
            className={`h-3 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
          />
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute -right-1 -top-1"
              >
                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}% concluído
          </span>
          {goal > 0 && current < goal && (
            <span className="text-xs text-muted-foreground">
              Faltam {goal - current}
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  const renderPeriodGoals = (periodType: 'daily' | 'weekly', totals: Record<string, number>) => (
    <div className="grid gap-3">
      {renderProgressBar(periodType, 'total', totals.total, <Target className="w-4 h-4 text-primary" />)}
      {renderProgressBar(periodType, 'ofex', totals.ofex, <TrendingUp className="w-4 h-4 text-team-dna" />)}
      {renderProgressBar(periodType, 'apoio', totals.apoio, <TrendingUp className="w-4 h-4 text-team-elite" />)}
      {renderProgressBar(periodType, 'soria', totals.soria, <TrendingUp className="w-4 h-4 text-team-alcateia" />)}
      {renderProgressBar(periodType, 'cadastro', totals.cadastro, <TrendingUp className="w-4 h-4 text-primary" />)}
    </div>
  );

  return (
    <>
      <Confetti isActive={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Metas de Desempenho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="daily">Metas Diárias</TabsTrigger>
              <TabsTrigger value="weekly">Metas Semanais</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              {renderPeriodGoals('daily', dailyTotals)}
            </TabsContent>
            <TabsContent value="weekly">
              {renderPeriodGoals('weekly', weeklyTotals)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
