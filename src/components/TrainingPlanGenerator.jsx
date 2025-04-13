import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, Loader2, AlertTriangle, Download, FileDown } from "lucide-react";
import { generateTrainingPlan } from "@/utils/openaiService";

const TrainingPlanGenerator = ({ activitiesData }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    targetRace: {
      name: "PTL (Petite Trotte à Léon)",
      date: new Date("2025-08-25"), // Default date for PTL
      description: "Extreme ultra-endurance mountain race, part of UTMB. ~300km with 25,000m+ of elevation gain over 5-6 days. Technical alpine terrain with minimal sleep."
    },
    additionalRaces: [
      { name: "Sky Marathon of Monte Rosa", date: new Date("2025-06-28"), description: "Technical alpine sky race with significant elevation, good preparation for high mountain terrain in PTL." },
      { name: "MUT 100 Miler", date: new Date("2025-05-24"), description: "100-mile mountain ultra, ideal dress rehearsal for long duration effort and night running practice." },
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

  const handleGenerateTrainingPlan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the OpenAI service to generate the training plan
      const result = await generateTrainingPlan(formData, activitiesData);
      
      // Update state with the generated plan and insights
      setFormData(prev => ({
        ...prev,
        generatedPlan: result.generatedPlan,
        generatedInsights: result.generatedInsights,
        rawResponse: result.rawResponse
      }));
      
      nextStep();
    } catch (error) {
      console.error("Error generating training plan:", error);
      setError("Failed to generate training plan. Please ensure your API key is set in the .env file and try again.");
    } finally {
      setLoading(false);
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>PTL Race Information</CardTitle>
              <CardDescription>Confirm details about your PTL race target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetRaceName">Race Name</Label>
                <Input 
                  id="targetRaceName" 
                  value={formData.targetRace.name} 
                  onChange={(e) => handleInputChange('targetRace', 'name', e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Race Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.targetRace.date ? 
                        format(formData.targetRace.date, "PPP") : 
                        "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.targetRace.date}
                      onSelect={(date) => handleInputChange('targetRace', 'date', date)}
                      initialFocus
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
                />
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm mb-2 font-medium">About PTL Training</p>
                <p className="text-xs text-muted-foreground">
                  This tool will generate a customized PTL training plan for Armand and Fred using Uphill Athlete methodology. 
                  The plan focuses on mountain-specific endurance, vertical gain/loss, technical terrain, and multi-day effort preparation.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div></div> {/* Empty div for spacing */}
              <Button onClick={nextStep}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        );
        
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Additional Races</CardTitle>
              <CardDescription>Enter details about other races leading up to your target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.additionalRaces.map((race, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Race {index + 1}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem('additionalRaces', index)}
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Race Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {race.date ? 
                            format(race.date, "PPP") : 
                            "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={race.date}
                          onSelect={(date) => handleInputChange('additionalRaces', 'date', date, index)}
                          initialFocus
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
                    />
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => addItem('additionalRaces')}
              >
                + Add Another Race
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        );
        
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Travel Schedule</CardTitle>
              <CardDescription>Enter any travel or vacation periods to adjust your training plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.travelSchedules.map((travel, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Travel Period {index + 1}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem('travelSchedules', index)}
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {travel.startDate ? 
                              format(travel.startDate, "PPP") : 
                              "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={travel.startDate}
                            onSelect={(date) => handleInputChange('travelSchedules', 'startDate', date, index)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {travel.endDate ? 
                              format(travel.endDate, "PPP") : 
                              "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={travel.endDate}
                            onSelect={(date) => handleInputChange('travelSchedules', 'endDate', date, index)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`location${index}`}>Location</Label>
                    <Input 
                      id={`location${index}`} 
                      value={travel.location} 
                      onChange={(e) => handleInputChange('travelSchedules', 'location', e.target.value, index)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`travelNotes${index}`}>Training Notes</Label>
                    <Textarea 
                      id={`travelNotes${index}`} 
                      value={travel.notes} 
                      onChange={(e) => handleInputChange('travelSchedules', 'notes', e.target.value, index)} 
                      placeholder="e.g., Access to trails, gym, altitude, etc."
                    />
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => addItem('travelSchedules')}
              >
                + Add Travel Period
              </Button>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        );
        
      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Training Preferences</CardTitle>
              <CardDescription>Tell us about your training preferences and constraints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="focusAreas">Focus Areas</Label>
                <Textarea 
                  id="focusAreas" 
                  value={formData.trainingPreferences.focusAreas} 
                  onChange={(e) => handleInputChange('trainingPreferences', 'focusAreas', e.target.value)} 
                  placeholder="What would you like to focus on? (e.g., vertical, endurance, technical terrain)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="constraints">Time Constraints</Label>
                <Textarea 
                  id="constraints" 
                  value={formData.trainingPreferences.constraints} 
                  onChange={(e) => handleInputChange('trainingPreferences', 'constraints', e.target.value)} 
                  placeholder="How many hours per week can you train? Any schedule constraints?"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.trainingPreferences.notes} 
                  onChange={(e) => handleInputChange('trainingPreferences', 'notes', e.target.value)} 
                  placeholder="Any other information relevant to your training?"
                />
              </div>
            </CardContent>
            
            {error && (
              <div className="mb-4 px-6">
                <div className="bg-destructive/15 text-destructive rounded-md p-3 flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleGenerateTrainingPlan} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate Plan</>
                )}
              </Button>
            </CardFooter>
          </Card>
        );
        
      case 5:
        return (
          <div className="space-y-8">
            {/* Training Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Training Insights</CardTitle>
                <CardDescription>AI analysis of your Strava training data with PTL-specific recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 list-disc pl-5">
                  {formData.generatedInsights?.map((insight, i) => (
                    <li key={i} className="text-sm">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            {/* Training Plan Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Uphill Athlete PTL Training Plan</CardTitle>
                <CardDescription>{formData.generatedPlan?.overview}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Training Phases */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Training Phases</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {formData.generatedPlan?.phases.map((phase, i) => (
                      <Card key={i}>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{phase.name}</CardTitle>
                          <CardDescription>{phase.duration}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <p className="text-sm">{phase.focus}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {/* Weekly Schedule Preview */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Sample Weekly Schedule</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm">
                      <span className="font-medium">Week 1:</span> {formData.generatedPlan?.weeklySchedule[0]?.details}
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Export the full plan for a detailed 16-week training schedule following the Uphill Athlete methodology.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back to Preferences
                </Button>
                <Button onClick={exportTrainingPlan}>
                  <FileDown className="mr-2 h-4 w-4" /> Export Plan
                </Button>
              </CardFooter>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">PTL Training Plan Generator</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Customized for Armand and Fred using Uphill Athlete methodology and Strava data analysis
        </p>
        <div className="flex items-center">
          <div className="w-full bg-gray-200 h-2 rounded-full">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(step / 5) * 100}%` }}
            ></div>
          </div>
          <span className="ml-4 text-sm font-medium">Step {step} of 5</span>
        </div>
      </div>
      
      {renderStep()}
    </div>
  );
};

export default TrainingPlanGenerator;