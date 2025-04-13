import { Calendar, Clock, TrendingUp, MapPin } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Shadcn Table components
import { Badge } from "@/components/ui/badge"; // Import Badge for race type

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown date';
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (seconds) => {
  if (!seconds) return 'N/A';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

const formatPace = (paceMinPerKm) => {
  if (!paceMinPerKm || paceMinPerKm === 0) return 'N/A';
  
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm - mins) * 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
};

const ActivityList = ({ activities, showRaceDetails = false }) => {
  if (!activities || activities.length === 0) {
    return <p className="text-muted-foreground italic">No activities to display</p>; // Use muted-foreground
  }

  return (
    <Table>
      <TableCaption>A list of your recent activities.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Activity</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Distance</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Pace</TableHead>
          {showRaceDetails && (
            <TableHead>Type</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity, index) => (
          <TableRow key={index} className={activity.is_race ? 'bg-muted/50' : ''}> {/* Use muted background for races */}
            <TableCell className="font-medium">
              <div className="flex items-center">
                {/* Icon can be improved later if needed */}
                <div className="flex-shrink-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                  {activity.activity_type === 'Run' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                </div>
                <div className="ml-3">
                  <div>{activity['Activity Name']}</div>
                  {activity['Activity Description'] && (
                    <div className="text-xs text-muted-foreground max-w-xs truncate">
                      {activity['Activity Description']}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>{formatDate(activity.date)}</TableCell>
            <TableCell>{activity.distance_km.toFixed(2)} km</TableCell>
            <TableCell>{formatTime(activity.duration_secs)}</TableCell>
            <TableCell>{formatPace(activity.pace_mins_per_km)}</TableCell>
            {showRaceDetails && (
              <TableCell>
                <Badge variant="secondary">{activity.activity_type}</Badge> {/* Use Shadcn Badge */}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ActivityList;