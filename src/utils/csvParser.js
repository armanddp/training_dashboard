import Papa from 'papaparse';
import { parse as parseDate, isValid, getYear, getMonth, getWeek, getDay } from 'date-fns';

/**
 * Parse CSV file of Strava activities using PapaParse and date-fns
 * @param {File} file - CSV file from user upload
 * @returns {Promise<Object>} - Processed activities data object
 */
export const parseActivitiesCSV = async (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, // Use the first row as headers
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            console.error('PapaParse errors:', results.errors);
            // Try to continue with valid data, but report first error
            // reject(new Error(`CSV Parsing Error: ${results.errors[0].message}`));
            // return;
          }
          
          console.log("CSV Headers found:", results.meta.fields);
          console.log("First few rows raw data:", results.data.slice(0, 3));

          // Process the parsed data
          const processedData = processActivitiesData(results.data);
          resolve(processedData);
        } catch (error) {
          console.error('Error processing parsed CSV data:', error);
          reject(error);
        }
      },
      error: (error) => {
        console.error('PapaParse file reading error:', error);
        reject(error);
      }
    });
  });
};

/**
 * Process activities data parsed by PapaParse
 * @param {Array<Object>} activities - Array of activity objects from PapaParse
 * @returns {Object} - Processed data with derived fields and time aggregations
 */
const processActivitiesData = (activities) => {
  try {
    const cleanedActivities = activities.map(activity => {
      const cleanActivity = { ...activity };

      // --- Date Parsing --- 
      // Adjust the format string based on your actual Strava CSV export format
      const possibleDateFormats = [
        'MMMM d, yyyy, h:mm:ss a', // e.g., April 13, 2025, 10:30:00 AM
        'yyyy-MM-dd HH:mm:ss',     // e.g., 2025-04-13 10:30:00
        'M/d/yyyy, h:mm:ss a'      // e.g., 4/13/2025, 10:30:00 AM
      ];
      let activityDate = null;
      const dateString = activity['Activity Date'];

      if (dateString) {
        for (const format of possibleDateFormats) {
          const parsed = parseDate(dateString, format, new Date());
          if (isValid(parsed)) {
            activityDate = parsed;
            break;
          }
        }
      }

      if (activityDate && isValid(activityDate)) {
        cleanActivity.date = activityDate;
        cleanActivity.year = getYear(activityDate);
        cleanActivity.month = getMonth(activityDate); // 0-indexed (Jan=0)
        cleanActivity.week = getWeek(activityDate);   // ISO week number
        cleanActivity.day = getDay(activityDate);     // 0-indexed (Sun=0)
      } else {
        console.warn('Could not parse date:', dateString, 'for activity:', activity['Activity ID']);
        cleanActivity.date = null;
        cleanActivity.year = null;
        cleanActivity.month = null;
        cleanActivity.week = null;
        cleanActivity.day = null;
      }

      // --- Numerical Parsing --- 
      // Use || to handle potentially different column names from Strava exports
      const distanceStr = activity['Distance'] || activity['distance_km'];
      const durationStr = activity['Elapsed Time'] || activity['duration_secs'];
      const elevationStr = activity['Elevation Gain'] || activity['elevation_gain_m'];

      cleanActivity.distance_km = parseFloat(distanceStr) || 0;
      cleanActivity.duration_secs = parseFloat(durationStr) || 0;
      cleanActivity.elevation = parseFloat(elevationStr) || 0;
      
      // Add checks for potential unit issues (e.g., if distance is in meters)
      // if (cleanActivity.distance_km > 1000) { /* Maybe it's meters? */ }

      // --- Pace Calculation ---
      if (cleanActivity.distance_km > 0 && cleanActivity.duration_secs > 0) {
        cleanActivity.pace_mins_per_km = cleanActivity.duration_secs / 60 / cleanActivity.distance_km;
      } else {
        cleanActivity.pace_mins_per_km = 0;
      }

      // --- Other Fields ---
      cleanActivity.activity_type = activity['Activity Type'] || 'Unknown';
      cleanActivity.is_race = String(activity['Filename']).includes('_race_') || String(activity['Activity Name']).toLowerCase().includes('race'); // Example: Infer race status
      // Note: Strava CSV might not have an explicit 'is_race' column.
      // Adapt the logic above based on how you mark races (e.g., in filename or activity name).

      return cleanActivity;
    }).filter(activity => activity.date && activity.distance_km > 0); // Filter out activities with no date or distance

    console.log("First few cleaned activities:", cleanedActivities.slice(0, 3));

    // Sort activities by date descending
    cleanedActivities.sort((a, b) => b.date - a.date);

    // --- Aggregations (largely unchanged, but rely on cleaned data) ---
    const activitiesByYear = groupBy(cleanedActivities, 'year');
    const activitiesByType = groupBy(cleanedActivities, 'activity_type');
    const totalStats = calculateTotalStats(cleanedActivities);
    
    const yearlyChartData = Object.keys(activitiesByYear)
      .filter(year => year !== 'null')
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(year => {
        const yearStats = calculateTotalStats(activitiesByYear[year]);
        return {
          year: parseInt(year),
          distance: yearStats.totalDistance,
          activities: yearStats.totalActivities,
          elevation: yearStats.totalElevation,
          avgPace: yearStats.avgPace
        };
      });

    const monthlyProgression = [];
    cleanedActivities.forEach(activity => {
      if (activity.year && activity.month !== null) {
        const monthKey = `${activity.year}-${(activity.month + 1).toString().padStart(2, '0')}`; // Use month+1 for key
        let monthEntry = monthlyProgression.find(m => m.key === monthKey);
        if (!monthEntry) {
          monthEntry = {
            key: monthKey,
            year: activity.year,
            month: activity.month, // Keep 0-indexed month for sorting
            distance: 0,
            activities: 0,
            elevation: 0,
            durationSecs: 0
          };
          monthlyProgression.push(monthEntry);
        }
        monthEntry.distance += activity.distance_km;
        monthEntry.activities += 1;
        monthEntry.elevation += activity.elevation || 0;
        monthEntry.durationSecs += activity.duration_secs;
      }
    });
    monthlyProgression.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const races = cleanedActivities.filter(activity => activity.is_race);

    return {
      activities: cleanedActivities,
      totalStats,
      races,
      activitiesByType,
      yearlyChartData,
      monthlyProgression
      // Removed some intermediate groupings like yearlyStats, monthlyStats unless needed elsewhere
    };
  } catch (error) {
    console.error('Error processing activities data:', error);
    throw error;
  }
};

// --- Helper Functions (groupBy, calculateTotalStats) ---
// Removed getWeekNumber as date-fns/getWeek is used

const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const keyValue = item[key]?.toString() || 'null';
    (result[keyValue] = result[keyValue] || []).push(item);
    return result;
  }, {});
};

const calculateTotalStats = (activities) => {
  const stats = {
    totalActivities: activities.length,
    totalDistance: 0,
    totalDuration: 0,
    totalElevation: 0,
    avgDistance: 0,
    avgDuration: 0,
    avgPace: 0,
    bestPace: Infinity,
    longestActivity: 0
  };
  
  activities.forEach(activity => {
    stats.totalDistance += activity.distance_km;
    stats.totalDuration += activity.duration_secs;
    stats.totalElevation += activity.elevation || 0;
    
    if (activity.distance_km > stats.longestActivity) {
      stats.longestActivity = activity.distance_km;
    }
    
    if (activity.pace_mins_per_km > 0 && activity.pace_mins_per_km < stats.bestPace) {
      stats.bestPace = activity.pace_mins_per_km;
    }
  });
  
  stats.avgDistance = stats.totalDistance / stats.totalActivities || 0;
  stats.avgDuration = stats.totalDuration / stats.totalActivities || 0;
  stats.avgPace = stats.totalDuration / 60 / stats.totalDistance || 0;
  
  // Fix Infinity/NaN values
  if (!isFinite(stats.bestPace)) stats.bestPace = 0;
  
  return stats;
};