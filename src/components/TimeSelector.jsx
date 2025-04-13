import { BarChart, Calendar, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components

const TimeSelector = ({ timePeriod, setTimePeriod, chartView, setChartView }) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between gap-4 items-start md:items-center">
      {/* Time Period Selector using Tabs */}
      <Tabs value={timePeriod} onValueChange={setTimePeriod}>
        <TabsList>
          <TabsTrigger value="all">All Time</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
          <TabsTrigger value="6months">6 Months</TabsTrigger>
          <TabsTrigger value="3months">3 Months</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Chart View Selector using Tabs */}
      <Tabs value={chartView} onValueChange={setChartView}>
        <TabsList>
          <TabsTrigger value="yearly">
            <Calendar className="h-4 w-4 mr-1" />
            Yearly
          </TabsTrigger>
          <TabsTrigger value="monthly">
            <BarChart className="h-4 w-4 mr-1" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="weekly">
            <TrendingUp className="h-4 w-4 mr-1" />
            Weekly
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default TimeSelector;