import { useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Calendar, Clock, TrendingUp, Award } from 'lucide-react';
import ActivityList from './ActivityList';
import TimeSelector from './TimeSelector';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NumberTicker from "@/components/magicui/number-ticker";
import { format, getMonth as dfnsGetMonth, getYear as dfnsGetYear } from 'date-fns';

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

// Updated formatPace to handle potential 0 pace
const formatPace = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm <= 0 || !isFinite(paceMinPerKm)) return 'N/A';
  const totalSeconds = paceMinPerKm * 60;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
};

// Keep monthNames for display
const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const Dashboard = ({ activitiesData }) => {
  const [timePeriod, setTimePeriod] = useState('all');
  const [chartView, setChartView] = useState('weekly'); // Default to weekly

  // Data from the updated parser
  const { activities, totalStats, yearlyChartData, monthlyProgression, races, activitiesByType } = activitiesData;

  // --- Filtering Logic (largely unchanged, but uses valid dates now) ---
  const getFilteredData = () => {
    if (timePeriod === 'all') {
      return activities;
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (timePeriod === 'year') {
      return activities.filter(activity => activity.year === currentYear);
    }
    
    if (timePeriod === '6months') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentMonth - 6);
      
      return activities.filter(activity => activity.date >= sixMonthsAgo);
    }
    
    if (timePeriod === '3months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(currentMonth - 3);
      
      return activities.filter(activity => activity.date >= threeMonthsAgo);
    }
    
    return activities;
  };
  const filteredActivities = getFilteredData();
  const filteredStats = {
    totalActivities: filteredActivities.length,
    totalDistance: filteredActivities.reduce((sum, activity) => sum + activity.distance_km, 0),
    totalDuration: filteredActivities.reduce((sum, activity) => sum + activity.duration_secs, 0),
    totalElevation: filteredActivities.reduce((sum, activity) => sum + (activity.elevation || 0), 0),
  };

  // --- Chart Data Preparation (Updated to filter based on timePeriod) ---
  const getChartData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    let startDate = null;

    if (timePeriod === 'year') {
      startDate = new Date(currentYear, 0, 1); // Start of current year
    }
    if (timePeriod === '6months') {
      startDate = new Date();
      startDate.setMonth(currentMonth - 6);
      startDate.setDate(1);
    }
    if (timePeriod === '3months') {
      startDate = new Date();
      startDate.setMonth(currentMonth - 3);
      startDate.setDate(1);
    }

    if (chartView === 'yearly') {
      if (timePeriod === 'all') {
        return yearlyChartData;
      }
      // Filter yearly data based on timePeriod
      return yearlyChartData.filter(yearData => {
        if (!startDate) return true; // Should only happen for 'all'
        // Include years that overlap with the startDate
        // (Simplification: only include years >= start year)
        return yearData.year >= startDate.getFullYear(); 
      });
    }
    
    if (chartView === 'monthly') {
      if (timePeriod === 'all') {
        return monthlyProgression.slice(-24).map(m => ({ 
          ...m,
          avgPace: m.distance > 0 ? m.durationSecs / 60 / m.distance : 0 
        }));
      }
      // Filter monthly data based on timePeriod
      const filteredMonthly = monthlyProgression.filter(monthData => {
        if (!startDate) return true;
        // Month in data is 0-indexed
        const monthDate = new Date(monthData.year, monthData.month, 1);
        return monthDate >= startDate;
      });
      return filteredMonthly.slice(-24).map(m => ({ 
         ...m,
         avgPace: m.distance > 0 ? m.durationSecs / 60 / m.distance : 0 
      }));
    }

    // --- Weekly Aggregation (Uses filteredActivities - already time-filtered) ---
    const weeklyDataMap = {};
    filteredActivities.forEach(activity => {
      if (activity.year && activity.week) {
        // Use ISO week format YYYY-Www (e.g., 2025-W15)
        const weekKey = `${activity.year}-W${activity.week.toString().padStart(2, '0')}`;
        if (!weeklyDataMap[weekKey]) {
          weeklyDataMap[weekKey] = {
            key: weekKey,
            year: activity.year,
            week: activity.week,
            distance: 0,
            activities: 0,
            elevation: 0,
            durationSecs: 0
          };
        }
        weeklyDataMap[weekKey].distance += activity.distance_km;
        weeklyDataMap[weekKey].activities += 1;
        weeklyDataMap[weekKey].elevation += activity.elevation || 0;
        weeklyDataMap[weekKey].durationSecs += activity.duration_secs;
      }
    });
    
    const weeklyData = Object.values(weeklyDataMap).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    });

    return weeklyData.slice(-20); // Show last 20 weeks
  };
  const chartData = getChartData();

  // --- Chart Title (Unchanged) ---
  const getChartTitle = () => {
    if (chartView === 'yearly') return 'Yearly Progress';
    if (chartView === 'monthly') return 'Monthly Progress';
    return 'Weekly Progress';
  };

  // --- Chart Axis and Tooltip Formatting (Updated) ---
  const formatXAxisTick = (value) => {
    if (!value) return '';
    if (chartView === 'yearly') return String(value); // Year is just a number
    
    if (chartView === 'monthly') {
      // Value is key like "YYYY-MM"
      const parts = String(value).split('-');
      if (parts.length === 2) {
        const monthIndex = parseInt(parts[1], 10) - 1; // Key uses 1-based month
        return monthNames[monthIndex] || '';
      }
    }
    
    if (chartView === 'weekly') {
      // Value is key like "YYYY-Www"
      const parts = String(value).split('-W');
      if (parts.length === 2) {
        return `W${parts[1]}`;
      }
    }
    return String(value);
  };

  const formatTooltipLabel = (label) => {
     if (!label) return '';
    if (chartView === 'yearly') return `Year ${label}`;
    
    if (chartView === 'monthly') {
      // Label is key like "YYYY-MM"
      const parts = String(label).split('-');
      if (parts.length === 2) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1; // Key uses 1-based month
        return `${monthNames[monthIndex]} ${year}`;
      }
    }
    
    if (chartView === 'weekly') {
      // Label is key like "YYYY-Www"
      const parts = String(label).split('-W');
      if (parts.length === 2) {
        return `Week ${parts[1]}, ${parts[0]}`;
      }
    }
    return String(label);
  };

  return (
    <div className="space-y-8">
      <TimeSelector 
        timePeriod={timePeriod} 
        setTimePeriod={setTimePeriod} 
        chartView={chartView}
        setChartView={setChartView}
      />
      
      {/* Stats cards - Updated with NumberTicker */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={filteredStats.totalActivities} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={Math.round(filteredStats.totalDistance)} /> km
            </div>
            {/* Optional: Show precise value below or on hover */}
            {/* <p className="text-xs text-muted-foreground">{filteredStats.totalDistance.toFixed(1)} km precise</p> */}
          </CardContent>
        </Card>
        <Card> {/* Duration - Not using ticker */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(filteredStats.totalDuration)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Elevation</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <NumberTicker value={Math.round(filteredStats.totalElevation)} /> m
            </div>
             {/* Optional: Show precise value below or on hover */}
            {/* <p className="text-xs text-muted-foreground">{filteredStats.totalElevation.toFixed(0)} m precise</p> */}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{getChartTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={chartView === 'yearly' ? 'year' : 'key'} 
                  tickFormatter={formatXAxisTick}
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(0)} km`}
                />
                <Tooltip 
                  formatter={(value, name) => [`${Number(value).toFixed(1)} km`, 'Distance']} // Ensure value is number
                  labelFormatter={formatTooltipLabel}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="distance" 
                  name="Distance (km)" 
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Types</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(activitiesByType).map(([type, acts]) => ({
                    type,
                    count: acts.length,
                    // Optionally calculate distance per type if needed
                    // distance: acts.reduce((sum, a) => sum + a.distance_km, 0)
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Elevation Trends Chart (Replaced Pace Trends) */}
        <Card>
          <CardHeader>
            <CardTitle>Elevation Trends</CardTitle> {/* Changed Title */}
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyProgression.slice(-18).map(month => ({
                    ...month,
                    displayMonth: `${monthNames[month.month]} ${month.year}`
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayMonth" /* ... */ />
                  <YAxis
                    // domain={['auto', 'auto']} // Adjust domain if needed
                    tickFormatter={(value) => `${value.toFixed(0)} m`} // Format Y-axis for meters
                    /* ... other YAxis props ... */
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(0)} m`, 'Total Elevation']} // Format tooltip for meters
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.key ? formatTooltipLabel(payload[0].payload.key) : ''}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="elevation" // Changed dataKey to elevation
                    name="Total Elevation (m)" // Changed name
                    stroke="hsl(var(--primary))"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityList activities={filteredActivities.slice(0, 10)} />
        </CardContent>
      </Card>
      
      {races.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Races</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityList activities={races.slice(0, 10)} showRaceDetails />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;