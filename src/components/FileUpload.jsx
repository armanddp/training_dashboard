import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { motion } from "framer-motion";

const FileUpload = ({ onFileUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Check if file is CSV
    if (file.name.endsWith('.csv')) {
      setFileName(file.name);
      setUploadSuccess(false);
      setUploadProgress(0);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          return newProgress > 90 ? 90 : newProgress; // Cap at 90% until complete
        });
      }, 200);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Pass the file to parent component
          onFileUpload(file);
          clearInterval(progressInterval);
          setUploadProgress(100);
          setUploadSuccess(true);
        } catch (error) {
          clearInterval(progressInterval);
          setError("Failed to process the CSV file. Please ensure it's a valid activities export from Strava.");
        }
      };
      reader.onerror = () => {
        clearInterval(progressInterval);
        setError("Failed to read the file.");
      };
      reader.readAsText(file);
    } else {
      setError("Please upload a CSV file exported from Strava.");
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <Card className={`border-2 ${dragActive ? 'border-uphill-blue border-dashed bg-blue-50' : 'border-gray-200'} transition-all duration-200`}>
        <CardContent className="p-6">
          <form
            className="flex flex-col items-center justify-center gap-4"
            onDragEnter={handleDrag}
            onSubmit={(e) => e.preventDefault()}
          >
            <input 
              ref={inputRef}
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div 
              className={`w-full flex flex-col items-center justify-center gap-4 p-8 rounded-lg transition-all duration-300
                ${dragActive ? 'bg-uphill-blue/10' : 'bg-gray-50/50'} backdrop-blur-sm border border-uphill-blue/10`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-full bg-uphill-blue/10 p-4"
              >
                <motion.div
                  animate={isLoading ? { rotate: 360 } : { scale: [1, 1.1, 1] }}
                  transition={isLoading ? { repeat: Infinity, duration: 2, ease: "linear" } : { duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  {uploadSuccess ? (
                    <CheckCircle size={36} className="text-green-500" />
                  ) : isLoading ? (
                    <div className="h-9 w-9 rounded-full border-2 border-uphill-blue border-r-transparent animate-spin" />
                  ) : (
                    <FileSpreadsheet size={36} className="text-uphill-blue" />
                  )}
                </motion.div>
              </motion.div>
              
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-1">Upload Your Strava Activities</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag & drop your <span className="font-semibold">activities.csv</span> from Strava or click to browse
                </p>
                <div className="text-xs text-gray-500 max-w-sm mx-auto">
                  <p className="mb-1">1. Go to <a href="https://www.strava.com/athlete/delete_your_account" className="text-uphill-blue underline" target="_blank" rel="noopener noreferrer">https://www.strava.com/athlete/delete_your_account</a></p>
                  <p className="mb-1">2. Click the "Download Request (optional)" button.</p>
                  <p>3. Wait for the export to arrive and unzip somewhere"</p>
                </div>
              </div>
              
              <Button 
                onClick={onButtonClick}
                className="bg-uphill-blue hover:bg-uphill-navy text-white font-medium transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-pulse">Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Browse Files
                  </>
                )}
              </Button>
              
              {/* Upload Progress Bar */}
              {(isLoading || uploadProgress > 0) && (
                <div className="w-full mt-2">
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-uphill-blue transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-600">
                    {uploadProgress < 100 ? "Analyzing data..." : "Analysis complete!"}
                  </p>
                </div>
              )}
              
              {fileName && !error && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-green-600 flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" /> {fileName}
                </motion.div>
              )}
            </div>
              
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>Activities loaded successfully! Scroll down to analyze your data.</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;