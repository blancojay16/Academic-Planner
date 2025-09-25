import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Quote, Edit, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserQuote {
  id: string;
  quote_text: string;
  author?: string;
  is_active: boolean;
}

const defaultQuotes = [
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
];

export default function MotivationalQuote() {
  const [currentQuote, setCurrentQuote] = useState<{ text: string; author?: string } | null>(null);
  const [userQuotes, setUserQuotes] = useState<UserQuote[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ quote_text: '', author: '' });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserQuotes();
  }, []);

  const fetchUserQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRandomDefaultQuote();
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserQuotes(data || []);
      
      // Find active quote or use first quote or default
      const activeQuote = data?.find(q => q.is_active);
      if (activeQuote) {
        setCurrentQuote({ text: activeQuote.quote_text, author: activeQuote.author });
      } else if (data && data.length > 0) {
        setCurrentQuote({ text: data[0].quote_text, author: data[0].author });
        // Set first quote as active
        await supabase
          .from('user_quotes')
          .update({ is_active: true })
          .eq('id', data[0].id);
      } else {
        setRandomDefaultQuote();
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setRandomDefaultQuote();
    } finally {
      setLoading(false);
    }
  };

  const setRandomDefaultQuote = () => {
    const randomQuote = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
    setCurrentQuote({ text: randomQuote.text, author: randomQuote.author });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, set all existing quotes to inactive
      await supabase
        .from('user_quotes')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Then insert the new quote as active
      const { error } = await supabase
        .from('user_quotes')
        .insert({
          user_id: user.id,
          quote_text: formData.quote_text,
          author: formData.author || null,
          is_active: true
        });

      if (error) throw error;

      setCurrentQuote({ text: formData.quote_text, author: formData.author });
      setDialogOpen(false);
      setFormData({ quote_text: '', author: '' });
      fetchUserQuotes();
      
      toast({ title: "Quote updated successfully!" });
    } catch (error: any) {
      toast({
        title: "Error saving quote",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetActive = async (quoteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set all quotes to inactive
      await supabase
        .from('user_quotes')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Set selected quote to active
      await supabase
        .from('user_quotes')
        .update({ is_active: true })
        .eq('id', quoteId);

      const activeQuote = userQuotes.find(q => q.id === quoteId);
      if (activeQuote) {
        setCurrentQuote({ text: activeQuote.quote_text, author: activeQuote.author });
      }

      fetchUserQuotes();
      toast({ title: "Quote activated!" });
    } catch (error) {
      toast({
        title: "Error updating quote",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshQuote = () => {
    if (userQuotes.length > 0) {
      const randomUserQuote = userQuotes[Math.floor(Math.random() * userQuotes.length)];
      setCurrentQuote({ text: randomUserQuote.quote_text, author: randomUserQuote.author });
    } else {
      setRandomDefaultQuote();
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-accent" />
            Quote of the Day
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshQuote}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Manage Your Quotes</DialogTitle>
                  <DialogDescription>
                    Add a new motivational quote or select from your existing ones.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="quote_text">Quote</Label>
                    <Textarea
                      id="quote_text"
                      value={formData.quote_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, quote_text: e.target.value }))}
                      placeholder="Enter your motivational quote..."
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="author">Author (Optional)</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="e.g., Anonymous, Albert Einstein"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit" className="bg-accent hover:bg-accent/90">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Set as Active Quote
                    </Button>
                  </DialogFooter>
                </form>

                {userQuotes.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    <h4 className="font-medium mb-3">Your Saved Quotes</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userQuotes.map((quote) => (
                        <div
                          key={quote.id}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                            quote.is_active ? 'bg-accent/10 border-accent' : 'bg-muted/20'
                          }`}
                          onClick={() => handleSetActive(quote.id)}
                        >
                          <p className="text-sm font-medium line-clamp-2">{quote.quote_text}</p>
                          {quote.author && (
                            <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
                          )}
                          {quote.is_active && (
                            <div className="flex items-center gap-1 mt-2">
                              <Sparkles className="h-3 w-3 text-accent" />
                              <span className="text-xs text-accent font-medium">Active</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {currentQuote && (
          <div className="space-y-2">
            <blockquote className="text-foreground font-medium italic leading-relaxed">
              "{currentQuote.text}"
            </blockquote>
            {currentQuote.author && (
              <p className="text-sm text-muted-foreground">
                — {currentQuote.author}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}