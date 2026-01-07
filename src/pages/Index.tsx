import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Calendar, TrendingUp, Target, Flame } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GincanaCalendar } from '@/components/GincanaCalendar';
import { DataInputModal } from '@/components/DataInputModal';
import { RankingPodium } from '@/components/RankingPodium';
import { StatsOverview } from '@/components/StatsOverview';
import { GoalsProgress } from '@/components/GoalsProgress';
import { useGincanaData } from '@/hooks/useGincanaData';
import { motion } from 'framer-motion';

const Index = () => {
  const {
    selectedDate,
    setSelectedDate,
    getDayData,
    setDayData,
    getDailyRanking,
    getWeeklyRanking,
    getMonthlyRanking,
    hasDataForDay,
  } = useGincanaData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());

  const handleDayClick = (date: Date) => {
    setModalDate(date);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSaveData = (data: Parameters<typeof setDayData>[1]) => {
    setDayData(modalDate, data);
  };

  const dailyRanking = getDailyRanking(selectedDate);
  const weeklyRanking = getWeeklyRanking(selectedDate);
  const monthlyRanking = getMonthlyRanking(selectedDate);

  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekEnd = endOfWeek(selectedDate, { locale: ptBR });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-warning to-amber-600 shadow-glow-warning">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">DNA de Campeões</h1>
                <p className="text-xs text-muted-foreground">Gincana Farma 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Flame className="w-4 h-4" />
              <span>Competição Ativa</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="calendario" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="calendario" 
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendário</span>
            </TabsTrigger>
            <TabsTrigger 
              value="diario"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Diário</span>
            </TabsTrigger>
            <TabsTrigger 
              value="semanal"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Semanal</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mensal"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Mensal</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Calendário de KPIs</h2>
                <p className="text-muted-foreground">Clique em um dia para inserir ou editar os dados</p>
              </div>
              <div className="max-w-lg mx-auto">
                <GincanaCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  hasDataForDay={hasDataForDay}
                  onDayClick={handleDayClick}
                />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="diario" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <GoalsProgress dailyRanking={dailyRanking} weeklyRanking={weeklyRanking} />
              <StatsOverview rankings={dailyRanking} period="diário" />
              <RankingPodium
                rankings={dailyRanking}
                title="Ranking Diário"
                subtitle={format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="semanal" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <StatsOverview rankings={weeklyRanking} period="semanal" />
              <RankingPodium
                rankings={weeklyRanking}
                title="Ranking Semanal"
                subtitle={`${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="mensal" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <StatsOverview rankings={monthlyRanking} period="mensal" />
              <RankingPodium
                rankings={monthlyRanking}
                title="Ranking Mensal"
                subtitle={format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <DataInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={modalDate}
        initialData={getDayData(modalDate)}
        onSave={handleSaveData}
      />
    </div>
  );
};

export default Index;
