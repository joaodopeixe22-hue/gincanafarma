import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Calendar, TrendingUp, Target, Flame, Medal, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { GincanaCalendar } from '@/components/GincanaCalendar';
import { DataInputModal } from '@/components/DataInputModal';
import { IndividualDataInputModal } from '@/components/IndividualDataInputModal';
import { IndividualRankingDashboard } from '@/components/IndividualRankingDashboard';
import { RankingPodium } from '@/components/RankingPodium';
import { StatsOverview } from '@/components/StatsOverview';
import { GoalsProgress } from '@/components/GoalsProgress';
import { AchievementRankingPodium } from '@/components/AchievementRankingPodium';
import { UserMenu } from '@/components/UserMenu';
import { GuidedTour } from '@/components/tour/GuidedTour';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { useGincanaData } from '@/hooks/useGincanaData';
import { useUserDailyData } from '@/hooks/useUserDailyData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  const { isAdmin, isRoot, isMember, isAuthenticated, role } = useAuth();
  const { getDataForDate, hasDataForDate, isDateLocked, saveData } = useUserDailyData();
  const { toast } = useToast();
  const { isMobile } = useViewMode();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());

  // Root e Admin podem editar dados da equipe
  const canEditTeamData = isRoot || isAdmin;
  // Membros e líderes usam o modal individual
  // Apenas admin/root usam o modal de equipe
  const usesIndividualModal = role === 'member' || role === 'lider';

  const handleDayClick = (date: Date) => {
    // Visitantes não podem abrir o modal
    if (!isAuthenticated) {
      toast({
        title: 'Acesso restrito',
        description: 'Faça login para adicionar dados',
        variant: 'destructive',
      });
      return;
    }

    // Usuário sem papel definido
    if (!isMember) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para adicionar dados. Contate um administrador.',
        variant: 'destructive',
      });
      return;
    }

    setModalDate(date);
    setSelectedDate(date);

    // Membros e líderes usam modal individual
    if (usesIndividualModal) {
      setIsIndividualModalOpen(true);
    } else {
      // Admin/Root usam modal de equipe
      setIsModalOpen(true);
    }
  };

  const handleSaveTeamData = (data: Parameters<typeof setDayData>[1]) => {
    setDayData(modalDate, data);
  };

  const handleSaveIndividualData = async (data: { ofex: number; apoio: number; soria: number; cadastro: number }) => {
    try {
      await saveData(modalDate, data);
      toast({
        title: 'Dados salvos!',
        description: 'Seus KPIs foram registrados com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar seus dados. Tente novamente.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const dailyRanking = getDailyRanking(selectedDate);
  const weeklyRanking = getWeeklyRanking(selectedDate);
  const monthlyRanking = getMonthlyRanking(selectedDate);

  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekEnd = endOfWeek(selectedDate, { locale: ptBR });

  // Dados individuais para o modal
  const individualData = getDataForDate(modalDate);
  const hasIndividualData = hasDataForDate(modalDate);

  return (
    <div className="min-h-screen bg-background">
      {/* Tour Guiado */}
      <GuidedTour />

      {/* Header */}
      <header className="tour-header sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-warning to-amber-600 shadow-glow-warning"
              )}>
                <Trophy className={cn("text-white", isMobile ? "w-5 h-5" : "w-6 h-6")} />
              </div>
              <div>
                <h1 className={cn("font-bold text-foreground", isMobile ? "text-lg" : "text-xl")}>
                  Gincana Farma
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Circuito 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!isMobile && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Flame className="w-4 h-4" />
                  <span>Competição Ativa</span>
                </div>
              )}
              {!isMobile && <ViewModeToggle />}
              <div className="tour-user-menu">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={cn("container mx-auto px-3 sm:px-4", isMobile ? "py-4" : "py-6")}>
        <Tabs defaultValue="calendario" className="space-y-4 sm:space-y-6">
          {isMobile ? (
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-auto gap-1.5 p-1.5 bg-muted/50 rounded-xl w-max min-w-full">
                <TabsTrigger 
                  value="calendario" 
                  className="tour-calendar flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg text-xs"
                >
                  <Calendar className="w-4 h-4" />
                  Calendário
                </TabsTrigger>
                <TabsTrigger 
                  value="diario"
                  className="tour-ranking-daily flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg text-xs"
                >
                  <Target className="w-4 h-4" />
                  Diário
                </TabsTrigger>
                <TabsTrigger 
                  value="semanal"
                  className="tour-ranking-weekly flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg text-xs"
                >
                  <TrendingUp className="w-4 h-4" />
                  Semanal
                </TabsTrigger>
                <TabsTrigger 
                  value="mensal"
                  className="tour-ranking-monthly flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg text-xs"
                >
                  <Trophy className="w-4 h-4" />
                  Mensal
                </TabsTrigger>
                <TabsTrigger 
                  value="individual"
                  className="tour-individual flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg text-xs"
                >
                  <Users className="w-4 h-4" />
                  Individual
                </TabsTrigger>
                <TabsTrigger 
                  value="conquistas"
                  className="tour-achievements flex items-center gap-1.5 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg text-xs"
                >
                  <Medal className="w-4 h-4" />
                  Conquistas
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          ) : (
            <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="calendario" 
                className="tour-calendar flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Calendário</span>
              </TabsTrigger>
              <TabsTrigger 
                value="diario"
                className="tour-ranking-daily flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
              >
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Diário</span>
              </TabsTrigger>
              <TabsTrigger 
                value="semanal"
                className="tour-ranking-weekly flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Semanal</span>
              </TabsTrigger>
              <TabsTrigger 
                value="mensal"
                className="tour-ranking-monthly flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Mensal</span>
              </TabsTrigger>
              <TabsTrigger 
                value="individual"
                className="tour-individual flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Individual</span>
              </TabsTrigger>
              <TabsTrigger 
                value="conquistas"
                className="tour-achievements flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-md rounded-lg"
              >
                <Medal className="w-4 h-4" />
                <span className="hidden sm:inline">Conquistas</span>
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="calendario" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Painel da Gincana</h2>
              <p className="text-muted-foreground">
                  {isMember 
                    ? usesIndividualModal 
                      ? 'Clique em um dia para registrar seus KPIs individuais'
                      : 'Clique em um dia para inserir ou editar os dados da equipe'
                    : 'Faça login para adicionar dados'}
                </p>
              </div>
              <div className="max-w-lg mx-auto">
                <GincanaCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  hasDataForDay={usesIndividualModal ? hasDataForDate : hasDataForDay}
                  isDateLocked={usesIndividualModal ? isDateLocked : undefined}
                  canEdit={canEditTeamData}
                  canAdd={isMember}
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
              <GoalsProgress dailyRanking={dailyRanking} weeklyRanking={weeklyRanking} isAdmin={isAdmin} />
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

          <TabsContent value="individual" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <IndividualRankingDashboard selectedDate={selectedDate} />
            </motion.div>
          </TabsContent>

          <TabsContent value="conquistas" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AchievementRankingPodium />
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal para Admin/Root - dados de equipe */}
      <DataInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={modalDate}
        initialData={getDayData(modalDate)}
        onSave={handleSaveTeamData}
        isAdmin={isAdmin}
        hasExistingData={hasDataForDay(modalDate)}
      />

      {/* Modal para Membros - dados individuais */}
      <IndividualDataInputModal
        isOpen={isIndividualModalOpen}
        onClose={() => setIsIndividualModalOpen(false)}
        date={modalDate}
        initialData={individualData}
        onSave={handleSaveIndividualData}
        hasExistingData={hasIndividualData}
        isLocked={isDateLocked(modalDate)}
      />
    </div>
  );
};

export default Index;
