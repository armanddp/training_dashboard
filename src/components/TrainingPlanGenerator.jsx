import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addDays, differenceInWeeks } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  AlertTriangle, 
  Download, 
  FileDown, 
  Sparkles,
  Clock,
  Mountain,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Settings,
  Code
} from "lucide-react";
import { generateTrainingPlan } from "@/utils/openaiService";
import { Badge } from '@/components/ui/badge';
import NumberTicker from '@/components/magicui/number-ticker';
import { motion, AnimatePresence } from "framer-motion";

const TrainingPlanGenerator = ({ activitiesData }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [interimResponse, setInterimResponse] = useState('');
  const [formData, setFormData] = useState({
    targetRace: {
      name: "PTL (Petite Trotte à Léon)",
      date: new Date("2025-08-25"), // Default date for PTL
      description: "Extreme ultra-endurance mountain race, part of UTMB. ~300km with 25,000m+ of elevation gain over 5-6 days. Technical alpine terrain with minimal sleep."
    },
    additionalRaces: [
      { name: "MUT 100 Miler", date: new Date("2025-05-24"), description: "100-mile mountain ultra, ideal dress rehearsal for long duration effort and night running practice." },
      { name: "Sky Marathon of Monte Rosa", date: new Date("2025-06-28"), description: "Technical alpine sky race with significant elevation, good preparation for high mountain terrain in PTL." },
    ],
    travelSchedules: [
      { startDate: new Date("2025-06-01"), endDate: new Date("2025-06-10"), location: "Italian Alps", notes: "Training camp at altitude with access to technical terrain similar to PTL route." }
    ],
    trainingPreferences: {
      focusAreas: "Vertical gain/loss training, multi-day endurance, night navigation, technical alpine terrain, mental resilience, altitude adaptation.",
      constraints: "Can train 6 days per week, 10-14 hours total. Weekends available for long mountain sessions.",
      notes: "Following Uphill Athlete methodology. Need specific focus on downhill technical running and back-to-back long days."
    },
    generatedPlan: null,
    generatedInsights: null
  });

  const handleInputChange = (section, field, value, index = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      
      if (index !== null) {
        // For array fields like additionalRaces or travelSchedules
        newData[section][index] = {
          ...newData[section][index],
          [field]: value
        };
      } else {
        // For nested objects like targetRace or trainingPreferences
        newData[section] = {
          ...newData[section],
          [field]: value
        };
      }
      
      return newData;
    });
  };

  const addItem = (section) => {
    setFormData(prev => {
      const newItem = section === 'additionalRaces' 
        ? { name: "", date: null, description: "" }
        : { startDate: null, endDate: null, location: "", notes: "" };
      
      return {
        ...prev,
        [section]: [...prev[section], newItem]
      };
    });
  };

  const removeItem = (section, index) => {
    setFormData(prev => {
      const newArray = [...prev[section]];
      newArray.splice(index, 1);
      
      return {
        ...prev,
        [section]: newArray
      };
    });
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const simulateProgress = () => {
    // This function simulates progress during API call
    let progress = 0;
    const messages = [
      'Analyzing your training data...',
      'Calculating optimal load progression...',
      'Designing phase periodization...',
      'Mapping race schedule into training blocks...',
      'Applying Uphill Athlete principles...',
      'Optimizing vertical gain distribution...',
      'Balancing intensity and volume...',
      'Assessing terrain specificity...',
      'Structuring night-training sessions...',
      'Creating recovery protocols...',
      'Finalizing your mountain training plan...'
    ];
    
    const interval = setInterval(() => {
      progress += Math.random() * 6;
      if (progress > 100) progress = 100;
      
      setLoadingProgress(Math.round(progress));
      setLoadingMessage(messages[Math.min(Math.floor(progress / 10), messages.length - 1)]);
      
      if (progress === 100) clearInterval(interval);
    }, 650); // Slightly faster updates for more responsive UI
    
    return interval;
  };

  // Use custom prompt if provided or generate from form data
  const getPromptForAPI = () => {
    if (showAdvancedOptions && customPrompt.trim()) {
      return customPrompt;
    }
    
    // Default prompt generation will be handled by the API service
    return null;
  };
  
  const handleGenerateTrainingPlan = async () => {
    // Immediately move to the loading screen for better user feedback
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    setInterimResponse('');
    setLoadingMessage('Initializing plan generation...');
    nextStep(); // Move to step 5 immediately (loading screen)
    
    // Start progress animation
    const progressInterval = simulateProgress();
    
    try {
      // Function to handle streaming updates from the LLM
      const handleStreamProgress = (partialResponse) => {
        // Update the interim response with the latest text
        setInterimResponse(partialResponse);
        
        // Show more realistic progress based on response length
        const estimatedLength = 6000; // Rough estimate of expected response length
        const progressPercentage = Math.min(95, Math.floor((partialResponse.length / estimatedLength) * 100));
        setLoadingProgress(progressPercentage);
        
        // Update loading message based on what's being generated
        if (partialResponse.toLowerCase().includes('insights')) {
          setLoadingMessage('Generating insights from your training data...');
        } else if (partialResponse.toLowerCase().includes('overview')) {
          setLoadingMessage('Creating training plan overview...');
        } else if (partialResponse.toLowerCase().includes('phase')) {
          setLoadingMessage('Designing training phases...');
        } else if (partialResponse.toLowerCase().includes('week')) {
          setLoadingMessage('Building weekly schedule...');
        } else if (progressPercentage > 80) {
          setLoadingMessage('Finalizing your training plan...');
        }
      };
      
      // Call the OpenAI service to generate the training plan with streaming
      const customPromptText = getPromptForAPI();
      const result = await generateTrainingPlan(
        formData, 
        activitiesData, 
        customPromptText, 
        handleStreamProgress // Pass the streaming handler
      );
      
      // Process the result to enhance visualization
      let processedResult = result;
      if (!result.generatedPlan.phases) {
        // Create a default structure if the API doesn't return one
        processedResult = {
          ...result,
          generatedPlan: {
            ...result.generatedPlan,
            phases: extractPhasesFromRawResponse(result.rawResponse)
          }
        };
      }
      
      // Update state with the generated plan and insights
      setFormData(prev => ({
        ...prev,
        generatedPlan: processedResult.generatedPlan,
        generatedInsights: processedResult.generatedInsights,
        rawResponse: processedResult.rawResponse
      }));
      
      // Complete the progress animation
      clearInterval(progressInterval);
      setLoadingProgress(100);
      
      // Show 100% for a bit before showing the results
      setTimeout(() => {
        setLoading(false); // This will display the results screen while still on step 5
      }, 800); 
    } catch (error) {
      console.error("Error generating training plan:", error);
      setError("Failed to generate training plan. Please ensure your API key is set in the .env file and try again.");
      clearInterval(progressInterval);
      setLoading(false);
      // Go back to the form step on error
      setStep(4);
    }
  };

  // Function to extract training phases from raw response if needed
  const extractPhasesFromRawResponse = (rawResponse) => {
    try {
      // Fallback logic to extract phases
      const phases = [
        {
          name: "Base Building",
          duration: "8 weeks",
          focus: "Aerobic capacity, general strength, hiking",
          key_workouts: [
            "Long hikes with moderate elevation gain",
            "Zone 1-2 running on varied terrain",
            "General strength routine 2-3x per week"
          ]
        },
        {
          name: "Vertical Training",
          duration: "10 weeks",
          focus: "Vertical gain adaptation, technical skills, endurance",
          key_workouts: [
            "Mountain repeats with loaded pack",
            "Back-to-back weekend long sessions",
            "Technical downhill practice"
          ]
        },
        {
          name: "Race Specificity",
          duration: "6 weeks",
          focus: "Multi-day efforts, sleep deprivation, systems testing",
          key_workouts: [
            "Night navigation sessions",
            "36-48 hour training blocks",
            "Complete gear and nutrition testing"
          ]
        },
        {
          name: "Taper",
          duration: "3 weeks",
          focus: "Recovery, mental preparation, final gear checks",
          key_workouts: [
            "Short, quality mountain sessions",
            "Visualization and mental rehearsal",
            "Sleep banking and recovery focus"
          ]
        }
      ];
      
      return phases;
    } catch (error) {
      console.error("Error extracting phases:", error);
      // Return a basic structure
      return [
        { name: "Base Phase", duration: "8-10 weeks", focus: "Building aerobic foundation" },
        { name: "Build Phase", duration: "8-10 weeks", focus: "Mountain-specific conditioning" },
        { name: "Peak Phase", duration: "6-8 weeks", focus: "Race-specific preparation" },
        { name: "Taper", duration: "2-3 weeks", focus: "Rest and recovery before race" }
      ];
    }
  };

  const exportTrainingPlan = () => {
    try {
      // Create a formatted text version of the training plan
      const insights = formData.generatedInsights?.join('\n\n') || '';
      const overview = formData.generatedPlan?.overview || '';
      const phases = formData.generatedPlan?.phases?.map(phase => 
        `${phase.name} (${phase.duration}): ${phase.focus}`
      ).join('\n\n') || '';
      
      // Include the raw response for complete details
      const fullPlan = formData.rawResponse || '';
      
      const exportContent = `
# PTL TRAINING PLAN FOR ARMAND AND FRED
Generated on: ${new Date().toLocaleDateString()}

## MAIN RACE
${formData.targetRace.name} on ${format(formData.targetRace.date, 'PPP')}
${formData.targetRace.description}

## ADDITIONAL RACES
${formData.additionalRaces.map(race => `- ${race.name} on ${race.date ? format(race.date, 'PPP') : 'TBD'}`).join('\n')}

## INSIGHTS FROM TRAINING DATA
${insights}

## TRAINING PLAN OVERVIEW
${overview}

## TRAINING PHASES
${phases}

## DETAILED TRAINING PLAN
${fullPlan}
`;

      // Create a blob and download link
      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PTL_Training_Plan.txt';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error exporting training plan:", error);
      alert("Failed to export training plan. Please try again.");
    }
  };
  
  // Parse raw response into weekly schedules
  const extractWeeklySchedules = () => {
    if (!formData.rawResponse) return [];
    
    try {
      // Look for week patterns in the response
      const weekRegex = /week\s*(\d+)[:\s]*([^#]+)/gi;
      const weekMatches = [...formData.rawResponse.matchAll(weekRegex)];
      
      // If we found weeks, parse and return them
      if (weekMatches && weekMatches.length > 0) {
        return weekMatches.map(match => {
          const weekNumber = match[1];
          let content = match[2].trim();
          
          // Try to further parse the content into structured data if possible
          const focusMatch = content.match(/focus[:\s]*([^•\n]+)/i);
          const focus = focusMatch ? focusMatch[1].trim() : '';
          
          // Look for bullet points which might be training sessions
          const workoutsMatch = content.match(/[•\-\*]\s*([^\n•\-\*]+)/gi);
          const workouts = workoutsMatch 
            ? workoutsMatch.map(w => w.replace(/^[•\-\*]\s*/, '').trim()) 
            : [];
          
          return {
            week: parseInt(weekNumber),
            focus,
            workouts,
            rawContent: content
          };
        });
      }
      
      // If no structured week data found, return empty array
      return [];
    } catch (error) {
      console.error("Error parsing weekly schedules:", error);
      return [];
    }
  };

  // Calculate weeks until race
  const weeksUntilRace = formData.targetRace.date ? 
    differenceInWeeks(formData.targetRace.date, new Date()) : 0;

  const renderTimelineVisual = () => {
    if (!formData.generatedPlan?.phases || formData.generatedPlan.phases.length === 0) return null;
    
    const phases = formData.generatedPlan.phases;
    const totalWeeks = phases.reduce((sum, phase) => {
      const weeks = parseInt(phase.duration) || extractWeeksFromDuration(phase.duration) || 4;
      return sum + weeks;
    }, 0);
    
    return (
      <div className="mt-8 mb-6 px-2">
        <h3 className="text-lg font-semibold mb-3 text-uphill-blue">Training Timeline</h3>
        <div className="flex w-full h-16 relative rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 border">
          {phases.map((phase, index) => {
            const weeks = parseInt(phase.duration) || extractWeeksFromDuration(phase.duration) || 4;
            const percentage = (weeks / totalWeeks) * 100;
            const colors = [
              "bg-uphill-blue-light/70", 
              "bg-uphill-blue/70", 
              "bg-uphill-blue-dark/70",
              "bg-amber-400/70"
            ];
            
            return (
              <div 
                key={index}
                className={`${colors[index % colors.length]} relative h-full flex items-center justify-center`}
                style={{ width: `${percentage}%` }}
              >
                <div className="text-center px-1">
                  <p className="text-xs font-semibold text-white drop-shadow-md">{phase.name}</p>
                  <p className="text-[10px] text-white/90 drop-shadow-md">{phase.duration}</p>
                </div>
                {index < phases.length - 1 && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 z-10"></div>
                )}
              </div>
            );
          })}
          <div className="absolute top-0 right-4 bg-red-500 h-full w-1 flex flex-col items-center">
            <div className="bg-white dark:bg-gray-800 text-red-500 font-bold text-xs py-1 px-2 rounded-full shadow-lg absolute -top-2">
              RACE
            </div>
          </div>
        </div>
        <div className="mt-1 text-center">
          <Badge variant="outline" className="text-xs font-medium">
            {weeksUntilRace} weeks until {formData.targetRace.name}
          </Badge>
        </div>
      </div>
    );
  };
  
  const extractWeeksFromDuration = (durationString) => {
    if (!durationString) return 4;
    const match = durationString.match(/(\d+)[-\s]?(?:to)?[-\s]?(\d+)?[\s]?weeks?/i);
    if (match) {
      // If range like "8-10 weeks", use average
      return match[2] ? Math.round((parseInt(match[1]) + parseInt(match[2])) / 2) : parseInt(match[1]);
    }
    return 4; // Default fallback
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="shadow-lg border-uphill-blue/10 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-uphill-blue to-uphill-blue-dark text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Mountain className="h-5 w-5" />
                PTL Race Information
              </CardTitle>
              <CardDescription className="text-uphill-blue-light">
                Confirm details about your PTL race target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="targetRaceName">Race Name</Label>
                <Input 
                  id="targetRaceName" 
                  value={formData.targetRace.name} 
                  onChange={(e) => handleInputChange('targetRace', 'name', e.target.value)} 
                  className="border-uphill-blue/20 focus-visible:ring-uphill-blue"
                />
              </div>

              <div className="space-y-2">
                <Label>Race Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left font-normal border-uphill-blue/20 hover:bg-uphill-blue/5 hover:text-uphill-blue"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.targetRace.date ? 
                        format(formData.targetRace.date, "PPP") : 
                        "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3 bg-white shadow-lg border border-gray-200 rounded-md">
                    <Calendar
                      mode="single"
                      selected={formData.targetRace.date}
                      onSelect={(date) => handleInputChange('targetRace', 'date', date)}
                      initialFocus
                      showOutsideDays={true}
                      className="rdp-calendar"
                      fixedWeeks
                      defaultMonth={new Date("2025-07-01")}
                      captionLayout="dropdown-buttons"
                      fromYear={2024}
                      toYear={2026}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetRaceDesc">Race Description</Label>
                <Textarea 
                  id="targetRaceDesc" 
                  value={formData.targetRace.description} 
                  onChange={(e) => handleInputChange('targetRace', 'description', e.target.value)} 
                  placeholder="Distance, elevation, terrain, etc."
                  className="min-h-[100px] border-uphill-blue/20 focus-visible:ring-uphill-blue"
                />
              </div>
              <div className="bg-uphill-blue-light/10 p-4 rounded-lg border border-uphill-blue-light/30 mt-4">
                <div className="flex gap-2 items-center mb-2">
                  <Mountain className="h-4 w-4 text-uphill-blue" />
                  <p className="text-sm font-medium text-uphill-blue">About PTL Training</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  This tool will generate a customized PTL training plan for Armand and Fred using Uphill Athlete methodology. 
                  The plan focuses on mountain-specific endurance, vertical gain/loss, technical terrain, and multi-day effort preparation.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2 pb-4">
              <div></div> {/* Empty div for spacing */}
              <Button 
                onClick={nextStep} 
                className="bg-uphill-blue hover:bg-uphill-blue-dark text-white transition-all shadow-md hover:shadow-lg"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );
        
      case 2:
        return (
          <Card className="shadow-lg border-uphill-blue/10 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-uphill-blue to-uphill-blue-dark text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Additional Races
              </CardTitle>
              <CardDescription className="text-uphill-blue-light">
                Enter details about other races leading up to your target
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {formData.additionalRaces.map((race, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg border-uphill-blue/10 bg-uphill-blue/5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-uphill-blue text-white">Race {index + 1}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem('additionalRaces', index)}
                      className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`raceName${index}`}>Race Name</Label>
                    <Input 
                      id={`raceName${index}`} 
                      value={race.name} 
                      onChange={(e) => handleInputChange('additionalRaces', 'name', e.target.value, index)} 
                      className="border-uphill-blue/20 focus-visible:ring-uphill-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Race Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal border-uphill-blue/20 hover:bg-uphill-blue/5 hover:text-uphill-blue"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {race.date ? 
                            format(race.date, "PPP") : 
                            "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-white shadow-lg border border-gray-200 rounded-md">
                        <Calendar
                          mode="single"
                          selected={race.date}
                          onSelect={(date) => handleInputChange('additionalRaces', 'date', date, index)}
                          initialFocus
                          showOutsideDays={true}
                          className="rdp-calendar"
                          fixedWeeks
                          defaultMonth={new Date("2025-05-01")}
                          captionLayout="dropdown-buttons"
                          fromYear={2024}
                          toYear={2026}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`raceDesc${index}`}>Race Description</Label>
                    <Textarea 
                      id={`raceDesc${index}`} 
                      value={race.description} 
                      onChange={(e) => handleInputChange('additionalRaces', 'description', e.target.value, index)} 
                      placeholder="Distance, elevation, terrain, etc."
                      className="border-uphill-blue/20 focus-visible:ring-uphill-blue"
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                type="button"
                onClick={() => addItem('additionalRaces')}
                className="w-full border-dashed border-uphill-blue/30 hover:border-uphill-blue hover:bg-uphill-blue/5 transition-all"
              >
                + Add Another Race
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between pt-2 pb-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                className="text-uphill-blue hover:bg-uphill-blue/10"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="bg-uphill-blue hover:bg-uphill-blue-dark text-white transition-all shadow-md hover:shadow-lg"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );

      case 3:
        return (
          <Card className="shadow-lg border-uphill-blue/10 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-uphill-blue to-uphill-blue-dark text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Travel & Training Camps
              </CardTitle>
              <CardDescription className="text-uphill-blue-light">
                Add any travel or training camps that might impact your schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {formData.travelSchedules.map((travel, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg border-uphill-blue/10 bg-uphill-blue/5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-uphill-blue text-white">Travel {index + 1}</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem('travelSchedules', index)}
                      className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal border-uphill-blue/20 hover:bg-uphill-blue/5 hover:text-uphill-blue"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {travel.startDate ? 
                            format(travel.startDate, "PPP") : 
                            "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-white shadow-lg border border-gray-200 rounded-md">
                        <Calendar
                          mode="single"
                          selected={travel.startDate}
                          onSelect={(date) => handleInputChange('travelSchedules', 'startDate', date, index)}
                          initialFocus
                          showOutsideDays={true}
                          className="rdp-calendar"
                          fixedWeeks
                          defaultMonth={new Date("2025-05-01")}
                          captionLayout="dropdown-buttons"
                          fromYear={2024}
                          toYear={2026}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal border-uphill-blue/20 hover:bg-uphill-blue/5 hover:text-uphill-blue"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {travel.endDate ? 
                            format(travel.endDate, "PPP") : 
                            "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-white shadow-lg border border-gray-200 rounded-md">
                        <Calendar
                          mode="single"
                          selected={travel.endDate}
                          onSelect={(date) => handleInputChange('travelSchedules', 'endDate', date, index)}
                          initialFocus
                          showOutsideDays={true}
                          className="rdp-calendar"
                          fixedWeeks
                          defaultMonth={new Date("2025-05-01")}
                          captionLayout="dropdown-buttons"
                          fromYear={2024}
                          toYear={2026}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`location${index}`}>Location</Label>
                    <Input 
                      id={`location${index}`} 
                      value={travel.location} 
                      onChange={(e) => handleInputChange('travelSchedules', 'location', e.target.value, index)} 
                      placeholder="Where are you traveling to?"
                      className="border-uphill-blue/20 focus-visible:ring-uphill-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`notes${index}`}>Notes</Label>
                    <Textarea 
                      id={`notes${index}`} 
                      value={travel.notes} 
                      onChange={(e) => handleInputChange('travelSchedules', 'notes', e.target.value, index)} 
                      placeholder="Any specific goals for this travel/camp?"
                      className="border-uphill-blue/20 focus-visible:ring-uphill-blue"
                    />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                type="button"
                onClick={() => addItem('travelSchedules')}
                className="w-full border-dashed border-uphill-blue/30 hover:border-uphill-blue hover:bg-uphill-blue/5 transition-all"
              >
                + Add Travel or Training Camp
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between pt-2 pb-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                className="text-uphill-blue hover:bg-uphill-blue/10"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="bg-uphill-blue hover:bg-uphill-blue-dark text-white transition-all shadow-md hover:shadow-lg"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        );

      case 4:
        return (
          <Card className="shadow-lg border-uphill-blue/10 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-uphill-blue to-uphill-blue-dark text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Training Preferences
              </CardTitle>
              <CardDescription className="text-uphill-blue-light">
                Tell us about your training preferences and constraints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <Label htmlFor="focusAreas">Focus Areas</Label>
                <Textarea 
                  id="focusAreas" 
                  value={formData.trainingPreferences.focusAreas} 
                  onChange={(e) => handleInputChange('trainingPreferences', 'focusAreas', e.target.value)} 
                  placeholder="What areas do you want to focus on in training?"
                  className="min-h-[100px] border-uphill-blue/20 focus-visible:ring-uphill-blue"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="constraints">Constraints</Label>
                <Textarea 
                  id="constraints" 
                  value={formData.trainingPreferences.constraints} 
                  onChange={(e) => handleInputChange('trainingPreferences', 'constraints', e.target.value)} 
                  placeholder="What are your time or other training constraints?"
                  className="min-h-[80px] border-uphill-blue/20 focus-visible:ring-uphill-blue"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.trainingPreferences.notes} 
                  onChange={(e) => handleInputChange('trainingPreferences', 'notes', e.target.value)} 
                  placeholder="Any other details about your training goals or preferences?"
                  className="min-h-[80px] border-uphill-blue/20 focus-visible:ring-uphill-blue"
                />
              </div>
              
              {/* Advanced Options Toggle */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button 
                  className="flex items-center text-uphill-blue hover:text-uphill-blue-dark transition-colors text-sm font-medium gap-2"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  <Settings className="h-4 w-4" />
                  {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                </button>
                
                {showAdvancedOptions && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-uphill-blue/20">
                    <Label htmlFor="customPrompt" className="flex items-center gap-2 mb-2">
                      <Code className="h-4 w-4 text-uphill-blue" />
                      <span>Custom AI Prompt</span>
                    </Label>
                    <Textarea 
                      id="customPrompt" 
                      value={customPrompt} 
                      onChange={(e) => setCustomPrompt(e.target.value)} 
                      placeholder="Customize the exact instructions sent to the AI model... (leave blank to use default)"
                      className="min-h-[150px] border-uphill-blue/20 focus-visible:ring-uphill-blue font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Advanced: Modify the prompt sent to the LLM for more customized training plan generation.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-uphill-blue-light/10 p-4 rounded-lg border border-uphill-blue-light/30 mt-4">
                <div className="flex gap-2 items-center mb-2">
                  <Sparkles className="h-4 w-4 text-uphill-blue" />
                  <p className="text-sm font-medium text-uphill-blue">Ready to Generate Your Plan</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Your training data and preferences will be used to create a personalized PTL training plan. The generated plan will include phases, focus areas, and key workouts tailored to your goal race.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2 pb-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                className="text-uphill-blue hover:bg-uphill-blue/10"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleGenerateTrainingPlan} 
                disabled={loading}
                className="bg-uphill-blue hover:bg-uphill-blue-dark text-white transition-all shadow-md hover:shadow-lg relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-uphill-blue via-uphill-blue to-uphill-navy bg-[length:200%_100%] animate-shimmer opacity-0 group-hover:opacity-100"></div>
                <span className="relative flex items-center gap-2 z-10">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Training Plan
                    </>
                  )}
                </span>
              </Button>
            </CardFooter>
          </Card>
        );

      case 5:
        if (loading) {
          return (
            <Card className="shadow-lg border-uphill-blue/10 animate-fade-in max-w-3xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-uphill-blue flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-uphill-blue/20 to-uphill-blue/5 flex items-center justify-center mb-4 shadow-inner">
                    <div className="absolute animate-pulse duration-1000">
                      <Mountain className="h-8 w-8 text-uphill-blue/40" />
                    </div>
                    <div className="animate-spin duration-[3000ms]">
                      <RefreshCw className="h-8 w-8 text-uphill-blue" />
                    </div>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight">Generating Your PTL Training Plan</span>
                </CardTitle>
                <CardDescription className="max-w-md mx-auto text-base">
                  Creating a personalized plan based on your race schedule, preferences, and training data.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-md mx-auto">
                <div className="space-y-6 py-4">
                  {/* Progress bar */}
                  <div className="relative h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-uphill-blue to-uphill-blue-light transition-all duration-300 ease-in-out"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                    {/* Animated glow effect */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"
                      style={{ backgroundSize: "200% 100%" }}
                    ></div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex justify-center mb-3">
                      <div className="text-4xl font-bold text-uphill-blue">
                        <NumberTicker value={loadingProgress} />%
                      </div>
                    </div>
                    <div className="min-h-[32px] flex items-center justify-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse bg-gradient-to-r from-uphill-blue to-uphill-navy bg-clip-text text-transparent">
                        {loadingMessage}
                      </p>
                    </div>
                  </div>
                  
                  {/* Additional stages visualization */}
                  <div className="grid grid-cols-4 gap-2 mt-8">
                    {['Data', 'Planning', 'Phases', 'Complete'].map((stage, index) => {
                      const isActive = loadingProgress >= (index + 1) * 25;
                      return (
                        <div key={stage} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${isActive ? 'bg-uphill-blue text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                            {index + 1}
                          </div>
                          <p className={`text-xs ${isActive ? 'text-uphill-blue font-medium' : 'text-gray-500'}`}>{stage}</p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Live preview of generated content */}
                  {interimResponse && (
                    <div className="mt-6 border border-uphill-blue/10 rounded-lg p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-uphill-blue rounded-full animate-pulse"></div>
                        <p className="text-xs font-medium text-uphill-blue">Live Preview</p>
                      </div>
                      <div className="max-h-[150px] overflow-auto text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-mono scrollbar-thin scrollbar-thumb-uphill-blue/20 scrollbar-track-transparent">
                        {interimResponse.slice(-800)} {/* Show last 800 chars to avoid overwhelming the UI */}
                        <span className="inline-block h-4 w-0.5 bg-uphill-blue/50 ml-0.5 animate-pulse"></span>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-uphill-blue/5 border border-uphill-blue/20 rounded-lg p-4 mt-6">
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                      The AI is analyzing your data and applying Uphill Athlete methodology to design your custom mountain training plan. This typically takes 1-2 minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card className="shadow-lg border-uphill-blue/10 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-uphill-blue to-uphill-blue-dark text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Mountain className="h-5 w-5" />
                Your PTL Training Plan
              </CardTitle>
              <CardDescription className="text-uphill-blue-light">
                Customized plan based on your schedule and Uphill Athlete methodology
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {error ? (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Visual Timeline */}
                  {renderTimelineVisual()}

                  {/* Plan Overview */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-uphill-blue">Training Plan Overview</h3>
                    <div className="bg-uphill-blue/5 p-4 rounded-lg border border-uphill-blue/10">
                      <p className="text-sm">
                        {formData.generatedPlan?.overview || 
                         "Your personalized training plan is designed to prepare you specifically for the PTL, with focus on building vertical endurance, technical skills, and multi-day effort capabilities."}
                      </p>
                    </div>
                  </div>

                  {/* Key Insights from Training Data */}
                  {formData.generatedInsights && formData.generatedInsights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-5 text-uphill-blue flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-uphill-blue" />
                        Key Insights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.generatedInsights.map((insight, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-uphill-blue/10 shadow-sm hover:shadow-md transition-all hover:border-uphill-blue/30 relative overflow-hidden group"
                          >
                            <div className="absolute top-0 left-0 w-12 h-12 bg-uphill-blue/10 flex items-center justify-center rounded-br-lg">
                              <span className="text-uphill-blue font-bold text-xl">{i+1}</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-uphill-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="ml-10 mt-1">
                              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{insight}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Training Phases */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-uphill-blue flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-uphill-blue" />
                      Training Phases
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.generatedPlan?.phases?.map((phase, idx) => {
                        // Determine phase class based on name
                        let phaseClass = 'phase-base';
                        if (phase.name.toLowerCase().includes('build')) {
                          phaseClass = 'phase-build';
                        } else if (phase.name.toLowerCase().includes('peak')) {
                          phaseClass = 'phase-peak';
                        } else if (phase.name.toLowerCase().includes('race') || phase.name.toLowerCase().includes('taper')) {
                          phaseClass = 'phase-race';
                        } else if (phase.name.toLowerCase().includes('recovery')) {
                          phaseClass = 'phase-recovery';
                        }
                        
                        return (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`phase-card ${phaseClass} hover-lift`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-uphill-blue/80 shadow-sm">{phase.duration}</Badge>
                              <h4 className="font-semibold">{phase.name}</h4>
                            </div>
                            <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">{phase.focus}</p>
                            {phase.key_workouts && phase.key_workouts.length > 0 && (
                              <div className="mt-3 bg-white/50 dark:bg-gray-800/50 rounded-md p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-medium text-uphill-blue mb-2">Key Workouts:</p>
                                <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc pl-4 space-y-1.5">
                                  {phase.key_workouts.map((workout, i) => (
                                    <li key={i}>{workout}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Weekly Training Schedule */}
                  <div className="mt-8">
                    <Tabs defaultValue="schedule" className="w-full">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-uphill-blue flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-uphill-blue" />
                          Weekly Training Schedule
                        </h3>
                        <TabsList className="bg-uphill-blue/10">
                          <TabsTrigger value="schedule" className="data-[state=active]:bg-uphill-blue data-[state=active]:text-white">Weekly Plan</TabsTrigger>
                          <TabsTrigger value="fullplan" className="data-[state=active]:bg-uphill-blue data-[state=active]:text-white">Full Details</TabsTrigger>
                        </TabsList>
                      </div>
                      
                      <TabsContent value="schedule" className="mt-2">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-uphill-blue/10 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-uphill-blue/10">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-uphill-navy uppercase tracking-wider">Week</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-uphill-navy uppercase tracking-wider">Focus</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-uphill-navy uppercase tracking-wider">Key Workouts</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {extractWeeklySchedules().map((week, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium">Week {week.week}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{week.focus}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                      {week.workouts.length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-1">
                                          {week.workouts.map((workout, i) => (
                                            <li key={i} className="text-xs">{workout}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs italic text-gray-500">{week.rawContent.slice(0, 100)}...</p>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {extractWeeklySchedules().length === 0 && (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-3 text-sm text-center text-gray-500 italic">
                                      Detailed weekly schedule not available in this format.
                                      <br />
                                      Please check the Full Details tab for complete information.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="fullplan" className="mt-2">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-uphill-blue/10 p-6 max-h-[600px] overflow-y-auto">
                          <div className="markdown-content">
                            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200 leading-relaxed">
                              {formData.rawResponse || "No detailed plan available yet."}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2 pb-4">
              <Button
                variant="ghost"
                onClick={prevStep}
                className="text-uphill-blue hover:bg-uphill-blue/10"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={exportTrainingPlan} 
                  variant="outline" 
                  className="border-uphill-blue text-uphill-blue hover:bg-uphill-blue/10 relative group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    <FileDown className="mr-2 h-4 w-4" /> Export Plan
                  </span>
                  <div className="absolute inset-0 bg-uphill-blue/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </Button>
                <Button 
                  onClick={() => setStep(1)} 
                  className="bg-uphill-blue hover:bg-uphill-blue-dark text-white relative overflow-hidden"
                >
                  <span className="relative z-10">Start Over</span>
                  <div className="absolute inset-0 bg-white/10 transform -translate-x-full hover:animate-shimmer"></div>
                </Button>
              </div>
            </CardFooter>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {renderStep()}
    </div>
  );
};

export default TrainingPlanGenerator;