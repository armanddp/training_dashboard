import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from "@/components/ui/button"; // Import Shadcn Button
import { cn } from "@/lib/utils"; // Import cn utility

const FileUpload = ({ onFileUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFile) {
      await onFileUpload(selectedFile);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center w-full max-w-lg mx-auto"
      onDragEnter={handleDrag}
    >
      <div
        className={cn(
          "w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors",
          "border-border hover:border-primary/50", // Use Shadcn border colors
          dragActive && "border-primary bg-accent", // Use Shadcn primary/accent colors
          selectedFile && "border-green-500 bg-green-50 dark:bg-green-900/20"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <Upload className={cn(
            "w-12 h-12",
            selectedFile ? 'text-green-600' : 'text-primary' // Use primary color
          )} />

          {selectedFile ? (
            <div>
              <p className="text-lg font-medium text-green-600">File selected:</p>
              <p className="text-sm text-muted-foreground">{selectedFile.name}</p> {/* Use muted-foreground */}
            </div>
          ) : (
            <>
              <p className="text-lg font-medium">Drag & drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">or click to select a file</p> {/* Use muted-foreground */}
              <p className="mt-2 text-xs text-muted-foreground/80">Supported format: CSV</p> {/* Use muted-foreground */}
            </>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!selectedFile || isLoading}
        className="mt-6 w-full md:w-auto"
        size="lg"
      >
        {isLoading ? (
          <>
            {/* Optional: Add a spinner icon here */}
            Processing...
          </>
        ) : (
          'Analyze Data'
        )}
      </Button>
    </form>
  );
};

export default FileUpload;