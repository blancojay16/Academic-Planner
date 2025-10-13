import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Summary {
  id: string;
  content: string;
  summary_type: string;
  created_at: string;
}

interface SummaryViewerProps {
  fileId?: string;
  onClose?: () => void;
}

export default function SummaryViewer({ fileId, onClose }: SummaryViewerProps) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSummaries();
  }, [fileId]);

  const fetchSummaries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSummaries(data || []);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      toast({
        title: "Error loading summaries",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSummaryTypeLabel = (type: string) => {
    switch (type) {
      case 'concise':
        return 'Concise Summary';
      case 'bullet_points':
        return 'Bullet Points';
      case 'key_definitions':
        return 'Key Definitions';
      default:
        return type;
    }
  };

  const getSummaryTypeColor = (type: string) => {
    switch (type) {
      case 'concise':
        return 'bg-blue-100 text-blue-800';
      case 'bullet_points':
        return 'bg-green-100 text-green-800';
      case 'key_definitions':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Note Summaries
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No summaries found</h3>
            <p className="text-muted-foreground">
              Generate a summary from your uploaded files to see them here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Note Summaries
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto p-6 space-y-6">
          {summaries.map((summary) => (
            <Card key={summary.id} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge className={getSummaryTypeColor(summary.summary_type)}>
                    {getSummaryTypeLabel(summary.summary_type)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(summary.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap">{summary.content}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
