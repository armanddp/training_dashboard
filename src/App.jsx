import { useState } from 'react';
import { parseActivitiesCSV } from './utils/csvParser';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import TrainingPlanGenerator from './components/TrainingPlanGenerator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Terminal } from "lucide-react";

function App() {
  const [activitiesData, setActivitiesData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleFileUpload = async (file) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await parseActivitiesCSV(file);
      setActivitiesData(data);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError('Failed to parse CSV file. Please make sure it\'s in the correct format.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="strava-gradient text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold">PTL Training Dashboard</h1>
          <p className="text-primary-foreground/80">Import Strava training data and generate our PTL training plans</p>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8 flex-grow">
        {!activitiesData ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Upload Your Strava Activities CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto mb-8 grid-cols-2">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="training-plan">Training Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <Dashboard activitiesData={activitiesData} />
            </TabsContent>
            
            <TabsContent value="training-plan">
              <TrainingPlanGenerator activitiesData={activitiesData} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="mt-auto p-4 bg-muted text-muted-foreground text-center text-sm">
        <p>Created for Strava data analysis • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;