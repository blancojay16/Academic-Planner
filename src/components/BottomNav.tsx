import { Calendar, FileText, Upload, Home, Calculator, Camera } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Tesseract from "tesseract.js";
import { Textarea } from "@/components/ui/textarea";

const navigationItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Notes", url: "/notes", icon: FileText },
  { title: "Files", url: "/files", icon: Upload },
  { title: "Grades", url: "/grades", icon: Calculator },
];

export function BottomNav() {
  const { toast } = useToast();
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setPreviewImage(imageUrl);
    setIsOcrOpen(true);
    setIsProcessing(true);
    setExtractedText("");

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => console.log(m),
      });

      setExtractedText(result.data.text);
      toast({
        title: "Text extracted successfully",
        description: "You can now copy the extracted text.",
      });
    } catch (error) {
      console.error("OCR Error:", error);
      toast({
        title: "Error extracting text",
        description: "Please try again with a clearer image.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied successfully.",
    });
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-elevated">
        <div className="flex items-center justify-around h-20 px-2 max-w-screen-xl mx-auto">
          {navigationItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl min-w-[70px] transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-primary to-accent text-white scale-105"
                    : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                }`
              }
            >
              <item.icon className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-xs font-medium">{item.title}</span>
            </NavLink>
          ))}

          {/* Camera Button - Center */}
          <button
            onClick={handleCameraClick}
            className="flex flex-col items-center justify-center -mt-8 bg-gradient-to-br from-primary via-primary to-accent rounded-full h-16 w-16 shadow-elevated hover:shadow-academic transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <Camera className="h-7 w-7 text-white" strokeWidth={2.5} />
          </button>

          {navigationItems.slice(2).map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl min-w-[70px] transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-primary to-accent text-white scale-105"
                    : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                }`
              }
            >
              <item.icon className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-xs font-medium">{item.title}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
      />

      {/* OCR Dialog */}
      <Dialog open={isOcrOpen} onOpenChange={setIsOcrOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Text Extraction</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {previewImage && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={previewImage}
                  alt="Captured"
                  className="w-full h-auto"
                />
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Extracting text...
                  </p>
                </div>
              </div>
            )}

            {!isProcessing && extractedText && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Extracted Text</label>
                  <Button onClick={handleCopyText} size="sm" variant="outline">
                    Copy Text
                  </Button>
                </div>
                <Textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Extracted text will appear here..."
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
