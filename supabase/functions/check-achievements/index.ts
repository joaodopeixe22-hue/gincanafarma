import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Achievement {
  id: string;
  name: string;
  requirement_type: string | null;
  requirement_value: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to get user info
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking achievements for user: ${user.id}`);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .maybeSingle();

    const teamId = profile?.team_id;
    console.log(`User team: ${teamId}`);

    // Get all achievements
    const { data: achievements, error: achError } = await supabase
      .from('achievements')
      .select('id, name, requirement_type, requirement_value');

    if (achError) {
      console.error('Error fetching achievements:', achError);
      throw achError;
    }

    // Get user's current achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
    console.log(`User has ${unlockedIds.size} achievements`);

    // Get all gincana data for calculations
    const { data: gincanaData } = await supabase
      .from('gincana_daily_data')
      .select('*')
      .order('date', { ascending: true });

    const newlyUnlocked: string[] = [];

    for (const achievement of achievements as Achievement[]) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) continue;

      const reqType = achievement.requirement_type;
      const reqValue = achievement.requirement_value || 0;

      let shouldUnlock = false;

      switch (reqType) {
        case 'days_active': {
          // Count days with data
          const daysWithData = gincanaData?.length || 0;
          shouldUnlock = daysWithData >= reqValue;
          console.log(`days_active: ${daysWithData} >= ${reqValue} = ${shouldUnlock}`);
          break;
        }

        case 'days_streak': {
          // Calculate consecutive days streak
          if (gincanaData && gincanaData.length > 0) {
            let maxStreak = 1;
            let currentStreak = 1;
            
            for (let i = 1; i < gincanaData.length; i++) {
              const prevDate = new Date(gincanaData[i - 1].date);
              const currDate = new Date(gincanaData[i].date);
              const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
              } else {
                currentStreak = 1;
              }
            }
            
            shouldUnlock = maxStreak >= reqValue;
            console.log(`days_streak: maxStreak ${maxStreak} >= ${reqValue} = ${shouldUnlock}`);
          }
          break;
        }

        case 'kpi_total': {
          // Calculate total KPI points for user's team
          if (teamId && gincanaData) {
            let total = 0;
            for (const day of gincanaData) {
              total += (day[`${teamId}_ofex`] || 0);
              total += (day[`${teamId}_apoio`] || 0);
              total += (day[`${teamId}_soria`] || 0);
              total += (day[`${teamId}_cadastro`] || 0);
            }
            shouldUnlock = total >= reqValue;
            console.log(`kpi_total for ${teamId}: ${total} >= ${reqValue} = ${shouldUnlock}`);
          }
          break;
        }

        case 'ranking_position': {
          // Check if team has achieved 1st place (this is simplified - would need daily/weekly/monthly checks)
          // For now, check if team is currently in 1st place based on total KPIs
          if (teamId && gincanaData && gincanaData.length > 0) {
            const teamTotals: Record<string, number> = { dna: 0, elite: 0, alcateia: 0 };
            
            for (const day of gincanaData) {
              for (const team of ['dna', 'elite', 'alcateia']) {
                teamTotals[team] += (day[`${team}_ofex`] || 0);
                teamTotals[team] += (day[`${team}_apoio`] || 0);
                teamTotals[team] += (day[`${team}_soria`] || 0);
                teamTotals[team] += (day[`${team}_cadastro`] || 0);
              }
            }
            
            const sorted = Object.entries(teamTotals).sort((a, b) => b[1] - a[1]);
            const position = sorted.findIndex(([t]) => t === teamId) + 1;
            shouldUnlock = position <= reqValue;
            console.log(`ranking_position for ${teamId}: position ${position} <= ${reqValue} = ${shouldUnlock}`);
          }
          break;
        }

        case 'all_achievements': {
          // Check if user has all other achievements (excluding this one)
          const otherAchievements = (achievements as Achievement[]).filter(a => a.requirement_type !== 'all_achievements');
          const hasAll = otherAchievements.every(a => unlockedIds.has(a.id) || newlyUnlocked.includes(a.id));
          shouldUnlock = hasAll;
          console.log(`all_achievements: has all = ${shouldUnlock}`);
          break;
        }

        case 'kpi_daily_ofex':
        case 'kpi_daily_apoio':
        case 'kpi_daily_soria':
        case 'kpi_daily_cadastro': {
          // Check user daily data for KPI threshold
          const { data: userDailyData } = await supabase
            .from('user_daily_data')
            .select('*')
            .eq('user_id', user.id);

          if (userDailyData && userDailyData.length > 0) {
            // Extract KPI field name from requirement_type (e.g., 'kpi_daily_ofex' -> 'ofex')
            const kpiField = reqType!.replace('kpi_daily_', '') as 'ofex' | 'apoio' | 'soria' | 'cadastro';
            
            // Check if any day has reached the required value
            shouldUnlock = userDailyData.some(day => (day[kpiField] || 0) >= reqValue);
            console.log(`${reqType} for ${kpiField}: checking if any day >= ${reqValue} = ${shouldUnlock}`);
          }
          break;
        }

        // Note: 'first_daily' and 'goal_reached' require more context and should be checked at specific moments
      }

      if (shouldUnlock) {
        console.log(`Unlocking achievement: ${achievement.name}`);
        const { error: insertError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!insertError) {
          newlyUnlocked.push(achievement.id);
          unlockedIds.add(achievement.id);
        } else {
          console.error(`Error granting achievement ${achievement.name}:`, insertError);
        }
      }
    }

    console.log(`Newly unlocked: ${newlyUnlocked.length} achievements`);

    // Get details of newly unlocked achievements
    let unlockedDetails: { id: string; name: string; points: number }[] = [];
    if (newlyUnlocked.length > 0) {
      const { data: details } = await supabase
        .from('achievements')
        .select('id, name, points')
        .in('id', newlyUnlocked);
      unlockedDetails = details || [];
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newlyUnlocked: unlockedDetails,
        totalChecked: achievements?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-achievements:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
