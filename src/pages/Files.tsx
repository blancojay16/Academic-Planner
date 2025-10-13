import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, Search, File, Image, Video, Music, Sparkles, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import SummaryViewer from "@/components/SummaryViewer";
import { QuizViewer } from "@/components/QuizViewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FileItem {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
  created_at: string;
}

export default function Files() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileForSummary, setSelectedFileForSummary] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState<Record<string, boolean>>({});
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    filterFiles();
  }, [files, searchTerm]);

  const fetchFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      toast({
        title: "Error loading files",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = () => {
    if (!searchTerm) {
      setFilteredFiles(files);
      return;
    }

    const filtered = files.filter(file =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.file_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const category = getCategoryFromFileType(file.type);
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          category: category
        });

      if (dbError) throw dbError;

      toast({ title: "File uploaded successfully!" });
      fetchFiles();
    } catch (error: any) {
      toast({
        title: "Error uploading file",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('student-files')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "File downloaded successfully!" });
    } catch (error) {
      toast({
        title: "Error downloading file",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('student-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({ title: "File deleted successfully!" });
      fetchFiles();
    } catch (error) {
      toast({
        title: "Error deleting file",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryFromFileType = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.includes('pdf')) return 'document';
    if (fileType.includes('word') || fileType.includes('document')) return 'document';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'spreadsheet';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'presentation';
    return 'document';
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        return FileText;
      default: return File;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'image': return 'bg-green-100 text-green-800';
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'audio': return 'bg-yellow-100 text-yellow-800';
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'spreadsheet': return 'bg-emerald-100 text-emerald-800';
      case 'presentation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUploadedFileId = async (filePath: string, userId: string) => {
    const { data, error } = await supabase
      .from('files')
      .select('id')
      .eq('file_path', filePath)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data.id;
  };

  const shouldGenerateSummary = (fileType: string, fileName: string): boolean => {
    const textTypes = ['text/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    const studyExtensions = ['.txt', '.md', '.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    
    return textTypes.some(type => fileType.includes(type)) || 
           studyExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const generateSummary = async (fileId: string, fileName: string, type: string) => {
    try {
      setGeneratingSummary(fileId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { fileId, userId: user.id, summaryType: type }
      });

      if (error) throw error;

      toast({
        title: "Summary generated!",
        description: `Created ${type.replace('_', ' ')} from ${fileName}`,
      });
      
      setSelectedFileForSummary(fileId);
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error generating summary",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(null);
    }
  };

  const generateQuiz = async (file: FileItem) => {
    try {
      setGeneratingQuiz(prev => ({ ...prev, [file.id]: true }));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to generate a quiz",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { fileId: file.id, userId: session.user.id }
      });

      if (error) throw error;

      if (data?.quizId) {
        toast({
          title: "Quiz generated!",
          description: `Created ${data.questionCount} questions from ${file.name}`,
        });
        setSelectedQuizId(data.quizId);
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Error generating quiz",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGeneratingQuiz(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const viewFileQuiz = async (fileId: string) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id')
        .eq('file_id', fileId)
        .single();

      if (error) {
        toast({
          title: "No quiz found",
          description: "Generate a quiz first",
          variant: "destructive",
        });
        return;
      }

      setSelectedQuizId(data.id);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: "Error loading quiz",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSummary = async (file: FileItem) => {
    const type = summaryType[file.id] || 'concise';
    await generateSummary(file.id, file.name, type);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Files</h1>
          <p className="text-muted-foreground">Upload and manage your academic files and documents</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="shrink-0">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button
              asChild
              className="bg-primary hover:bg-primary/90"
              disabled={uploading}
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </label>
            </Button>
          </div>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {files.length === 0 
                ? 'Start uploading your academic documents, images, and other files.'
                : 'Try adjusting your search term or upload a new file.'
              }
            </p>
            <div>
              <input
                type="file"
                id="first-file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                asChild
                className="bg-primary hover:bg-primary/90"
                disabled={uploading}
              >
                <label htmlFor="first-file-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First File
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file.category);
            return (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">
                          {file.name}
                        </h3>
                        <Badge className={getCategoryColor(file.category)} variant="secondary">
                          {file.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    <div>Size: {formatFileSize(file.file_size)}</div>
                    <div>Uploaded: {formatDate(file.created_at)}</div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {shouldGenerateSummary(file.file_type, file.name) && (
                      <div className="flex gap-2 items-center flex-wrap w-full">
                        <Select
                          value={summaryType[file.id] || 'concise'}
                          onValueChange={(value) => setSummaryType(prev => ({ ...prev, [file.id]: value }))}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="concise">Concise</SelectItem>
                            <SelectItem value="bullet_points">Bullet Points</SelectItem>
                            <SelectItem value="key_definitions">Key Definitions</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatingSummary === file.id ? null : handleGenerateSummary(file)}
                          disabled={generatingSummary === file.id}
                          title="Generate Summary"
                        >
                          {generatingSummary === file.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFileForSummary(file.id)}
                          title="View Summaries"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => generateQuiz(file)}
                          disabled={generatingQuiz[file.id]}
                          title="Generate Quiz"
                        >
                          {generatingQuiz[file.id] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(file)}
                      className="text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Viewer Modal */}
      {selectedFileForSummary && (
        <SummaryViewer
          fileId={selectedFileForSummary}
          onClose={() => setSelectedFileForSummary(null)}
        />
      )}

      {/* Quiz Viewer Modal */}
      {selectedQuizId && (
        <QuizViewer
          quizId={selectedQuizId}
          onClose={() => setSelectedQuizId(null)}
        />
      )}
    </div>
  );
}
