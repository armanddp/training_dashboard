/**
 * OpenAI API service for generating training plans and insights
 * Specialized for PTL (Petite Trotte à Léon) training with Uphill Athlete methodology
 */

// Use environment variable for API key
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4.5-preview"; // OpenAI's latest model

/**
 * Process Strava training data to create a summary suitable for LLM prompting
 * @param {Object} activitiesData - Processed Strava data object
 * @returns {Object} - Summarized training data
 */
export const summarizeTrainingData = (activitiesData) => {
  const { activities, totalStats, yearlyChartData, monthlyProgression } = activitiesData;
  
  // Calculate yearly statistics
  const yearlyStats = {};
  yearlyChartData.forEach(yearData => {
    yearlyStats[yearData.year] = {
      totalDistance: yearData.distance.toFixed(0),
      totalActivities: yearData.activities,
      totalElevation: yearData.elevation ? yearData.elevation.toFixed(0) : "0",
      avgPace: yearData.avgPace ? `${Math.floor(yearData.avgPace)}:${Math.floor((yearData.avgPace % 1) * 60).toString().padStart(2, '0')}/km` : "N/A"
    };
  });
  
  // Identify peak months (top 3 months by distance)
  const peakMonths = [...monthlyProgression]
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 3)
    .map(month => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[month.month]} ${month.year} (${month.distance.toFixed(0)}km, ${month.elevation?.toFixed(0) || 0}m elevation)`;
    });
  
  // Identify long runs (top 10 longest runs)
  const longRuns = [...activities]
    .sort((a, b) => b.distance_km - a.distance_km)
    .slice(0, 10)
    .map(activity => {
      const date = activity.date ? new Date(activity.date).toLocaleDateString() : "Unknown date";
      return {
        date,
        distance: activity.distance_km.toFixed(1),
        elevation: activity.elevation?.toFixed(0) || 0,
        duration: formatDuration(activity.duration_secs),
        pace: activity.pace_mins_per_km ? formatPace(activity.pace_mins_per_km) : "N/A"
      };
    });
  
  // Identify training consistency (count activities per month for the last 24 months)
  const recentMonths = monthlyProgression.slice(-24);
  const consistencyByMonth = recentMonths.map(month => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month.month]} ${month.year}: ${month.activities} activities, ${month.distance.toFixed(0)}km`;
  });
  
  return {
    overview: {
      totalActivities: totalStats.totalActivities,
      totalDistance: totalStats.totalDistance.toFixed(0),
      totalElevation: totalStats.totalElevation.toFixed(0),
      avgWeeklyDistance: (totalStats.totalDistance / (totalStats.totalActivities / 4)).toFixed(0), // Rough estimate
      dataTimespan: `${monthlyProgression[0]?.year || "Unknown"} to ${monthlyProgression[monthlyProgression.length-1]?.year || "present"}`
    },
    yearlyStats,
    peakMonths,
    longRuns,
    consistencyByMonth
  };
};

/**
 * Create a prompt for OpenAI based on user inputs and training data
 * @param {Object} formData - User input about races, travel plans, and preferences
 * @param {Object} trainingDataSummary - Summarized training data
 * @returns {Object} - Prompt object for OpenAI API
 */
export const createOpenAIPrompt = (formData, trainingDataSummary) => {
  const { targetRace, additionalRaces, travelSchedules, trainingPreferences } = formData;
  
  // Format races information
  const targetRaceInfo = `Primary Goal Race: ${targetRace.name} on ${targetRace.date.toLocaleDateString()}. ${targetRace.description}`;
  
  const additionalRacesInfo = additionalRaces.length > 0 
    ? `Additional races: ${additionalRaces
        .filter(race => race.name && race.date)
        .map(race => `${race.name} on ${race.date.toLocaleDateString()}${race.description ? ` (${race.description})` : ''}`)
        .join('; ')}`
    : 'No additional races planned.';
    
  // Format travel schedules
  const travelInfo = travelSchedules.length > 0
    ? `Travel/vacation periods to accommodate: ${travelSchedules
        .filter(travel => travel.startDate && travel.endDate)
        .map(travel => `${travel.startDate.toLocaleDateString()} to ${travel.endDate.toLocaleDateString()} in ${travel.location}${travel.notes ? ` (Note: ${travel.notes})` : ''}`)
        .join('; ')}`
    : 'No travel or vacation periods to consider.';
  
  // Format training preferences
  const preferencesInfo = `
    Training focus areas: ${trainingPreferences.focusAreas || 'Not specified'}
    Time constraints: ${trainingPreferences.constraints || 'Not specified'}
    Additional notes: ${trainingPreferences.notes || 'None'}
  `;
  
  // Format training data summary
  const trainingDataInfo = `
    STRAVA TRAINING DATA SUMMARY:
    
    Overview: ${trainingDataSummary.overview.totalActivities} activities, ${trainingDataSummary.overview.totalDistance}km total distance, ${trainingDataSummary.overview.totalElevation}m total elevation gain from ${trainingDataSummary.overview.dataTimespan}.
    
    Peak training months: ${trainingDataSummary.peakMonths.join(', ')}
    
    Yearly progression:
    ${Object.entries(trainingDataSummary.yearlyStats).map(([year, stats]) => 
      `${year}: ${stats.totalDistance}km, ${stats.totalActivities} activities, ${stats.totalElevation}m elevation`
    ).join('\n    ')}
    
    Recent long runs:
    ${trainingDataSummary.longRuns.slice(0, 5).map(run => 
      `${run.date}: ${run.distance}km, ${run.elevation}m elevation, ${run.duration} (${run.pace}/km)`
    ).join('\n    ')}
    
    Recent training consistency (last 6 months):
    ${trainingDataSummary.consistencyByMonth.slice(-6).join('\n    ')}
  `;
  
  // Construct the main prompt with PTL-specific and Uphill Athlete methodology-focused content
  const prompt = `
    I need you to create a detailed training plan for Armand and Fred who are training for the PTL (Petite Trotte à Léon), an extreme ultra-endurance mountain race that's part of the UTMB series. The plan should be based on the Uphill Athlete methodology as outlined in "Training for the New Alpinism" and "Training for the Uphill Athlete" books by Steve House and Scott Johnston.

    ATHLETE INFORMATION:
    ${targetRaceInfo}
    ${additionalRacesInfo}
    ${travelInfo}
    ${preferencesInfo}
    
    ${trainingDataInfo}

    UPHILL ATHLETE METHODOLOGY REQUIREMENTS:
    - Structure the plan according to the Uphill Athlete periodization model with distinct Base, Specific, and Peak/Taper periods
    - Emphasize Zone 1 & 2 aerobic base building (60-80% of total volume)
    - Include specific vertical gain/loss training for the extreme elevation profile of PTL
    - Incorporate proper progression of training load following the 10% rule
    - Include strength training focused on mountain athlete needs (legs, core stability)
    - Add specific workouts for:
      * Zone 1-2 aerobic base building (long, slow distance)
      * Uphill capacity (Zone 3 threshold work on climbs)
      * Downhill technical training and eccentric strength
      * Back-to-back long days to simulate PTL multi-day effort
      * Night training sessions (PTL requires night navigation and movement)
      * Altitude adaptation if possible during travel periods

    Based on the above information, please provide:
    
    1. INSIGHTS: 5-7 key insights from the past training data, focusing on performance in mountain/ultra events, strengths/weaknesses related to vertical gain/loss, and endurance capacity relevant to PTL.
    
    2. TRAINING PLAN OVERVIEW: A structured plan following Uphill Athlete periodization for PTL preparation.
    
    3. TRAINING PHASES: Break down the training plan into clear periodization phases as per Uphill Athlete methodology.
    
    4. WEEKLY SCHEDULES: Provide 16 weeks of detailed training schedules leading up to PTL, including:
       - Weekly distance targets
       - Weekly elevation gain/loss targets 
       - Zone-specific workouts (using Uphill Athlete's 5-zone system)
       - Strength training sessions focused on mountain movement
       - Back-to-back long efforts for multi-day race preparation
       - Recovery strategies specific to mountain ultra training
       - Nutrition guidelines for both training and the PTL event
       
    Please adapt the training plan to respect the travel periods and build up to the additional races as appropriate preparation for PTL.
    
    Format your response with clear headings and keep it structured for easy readability.
  `;
  
  // Prepare the API request body for OpenAI
  return {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: "You are an expert ultra trail running coach specializing in mountain ultra endurance events and following the Uphill Athlete methodology. Generate detailed, specific training plans based on runner data and race goals."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 4000
  };
};

/**
 * Parse OpenAI API response into structured insights and training plan
 * @param {Object} response - Raw API response
 * @returns {Object} - Structured insights and training plan
 */
export const parseOpenAIResponse = (response) => {
  try {
    // Extract the response text from OpenAI's format
    const responseText = response?.choices?.[0]?.message?.content || "";
    
    // Split response into sections
    const sections = responseText.split(/(?=\n\s*#)/);
    
    // Extract insights
    const insightsSection = sections.find(section => 
      section.match(/insights|observations|analysis/i)
    ) || "";
    
    const insights = insightsSection
      .split(/\n-|\n\d\./)
      .slice(1) // Skip the heading
      .map(insight => insight.trim())
      .filter(insight => insight.length > 10);
    
    // Extract training plan overview
    const overviewSection = sections.find(section => 
      section.match(/overview|training plan overview|plan summary/i)
    ) || "";
    
    const overview = overviewSection
      .replace(/.*?overview.*?\n/i, '')
      .trim();
    
    // Extract training phases
    const phasesSection = sections.find(section => 
      section.match(/phases|training phases|periodization/i)
    ) || "";
    
    const phaseMatches = [...phasesSection.matchAll(/[*-]?\s*(Phase \d|[A-Za-z]+ Phase|[A-Za-z]+ Period):\s*([^:]+)(?::|\n)([^*-]*)/g)];
    
    const phases = phaseMatches.map(match => {
      const name = match[1].trim();
      const durationMatch = match[2].match(/(\d+)\s*weeks?/i);
      const duration = durationMatch ? `${durationMatch[1]} weeks` : match[2].trim();
      const focus = match[3].trim();
      
      return { name, duration, focus };
    });
    
    // Extract weekly schedule (just week 1 for preview)
    const weeklySection = sections.find(section => 
      section.match(/weekly schedules|week-by-week|weekly plan/i)
    ) || "";
    
    const weekMatches = [...weeklySection.matchAll(/Week\s*(\d+)\s*:([^Week]*)/g)];
    
    const weeklySchedule = weekMatches.map(match => {
      const week = parseInt(match[1]);
      const details = match[2].trim().replace(/\n+/g, ' ');
      
      return { week, details };
    });
    
    return {
      generatedInsights: insights,
      generatedPlan: {
        overview,
        phases: phases.length > 0 ? phases : [
          { name: "Base Building", duration: "4 weeks", focus: "Aerobic endurance" },
          { name: "Build Phase", duration: "6 weeks", focus: "Increased intensity" },
          { name: "Peak Phase", duration: "4 weeks", focus: "Race-specific training" },
          { name: "Taper", duration: "2 weeks", focus: "Recovery and preparation" }
        ],
        weeklySchedule: weeklySchedule.length > 0 ? weeklySchedule : [
          { week: 1, details: "Example weekly schedule will be generated based on your data" }
        ]
      },
      rawResponse: responseText // Include the full response for debugging or detailed view
    };
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    return {
      generatedInsights: ["Error parsing insights from the AI response."],
      generatedPlan: {
        overview: "There was an error processing the AI-generated training plan.",
        phases: [{ name: "Error", duration: "N/A", focus: "Please try again" }],
        weeklySchedule: [{ week: 1, details: "Error generating schedule" }]
      },
      rawResponse: response?.choices?.[0]?.message?.content || "No response text"
    };
  }
};

/**
 * Call OpenAI API to generate a training plan
 * @param {Object} formData - User input data
 * @param {Object} activitiesData - Processed Strava data
 * @returns {Promise<Object>} - Structured training plan and insights
 */
export const generateTrainingPlan = async (formData, activitiesData) => {
  try {
    const trainingDataSummary = summarizeTrainingData(activitiesData);
    const promptData = createOpenAIPrompt(formData, trainingDataSummary);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(promptData)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return parseOpenAIResponse(data);
  } catch (error) {
    console.error("Error generating training plan:", error);
    throw error;
  }
};

// Helper functions
const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatPace = (paceMinPerKm) => {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm - mins) * 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};