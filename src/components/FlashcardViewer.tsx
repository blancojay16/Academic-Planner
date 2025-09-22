import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty_level: string;
  last_reviewed?: string;
  review_count: number;
  mastery_level: number;
  file_id: string;
}

interface FlashcardViewerProps {
  fileId?: string;
  onClose?: () => void;
}

export default function FlashcardViewer({ fileId, onClose }: FlashcardViewerProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyMode, setStudyMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFlashcards();
  }, [fileId]);

  const fetchFlashcards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id);

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      toast({
        title: 'Error loading flashcards',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFlashcardProgress = async (flashcardId: string, wasCorrect: boolean) => {
    try {
      const flashcard = flashcards[currentIndex];
      const newMasteryLevel = wasCorrect 
        ? Math.min(flashcard.mastery_level + 1, 5)
        : Math.max(flashcard.mastery_level - 1, 0);

      const { error } = await supabase
        .from('flashcards')
        .update({
          last_reviewed: new Date().toISOString(),
          review_count: flashcard.review_count + 1,
          mastery_level: newMasteryLevel,
        })
        .eq('id', flashcardId);

      if (error) throw error;

      // Update local state
      setFlashcards(prev => prev.map(card => 
        card.id === flashcardId 
          ? { 
              ...card, 
              last_reviewed: new Date().toISOString(),
              review_count: card.review_count + 1,
              mastery_level: newMasteryLevel,
            }
          : card
      ));

      toast({
        title: wasCorrect ? 'Correct!' : 'Keep practicing!',
        description: `Mastery level: ${newMasteryLevel}/5`,
      });

    } catch (error) {
      console.error('Error updating flashcard progress:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleStudyResponse = (wasCorrect: boolean) => {
    if (studyMode && flashcards[currentIndex]) {
      updateFlashcardProgress(flashcards[currentIndex].id, wasCorrect);
    }
    
    // Auto-advance to next card after a short delay
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        handleNext();
      } else {
        setStudyMode(false);
        toast({
          title: 'Study session complete!',
          description: 'Great job reviewing your flashcards.',
        });
      }
    }, 1500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMasteryColor = (level: number) => {
    if (level >= 4) return 'text-green-600';
    if (level >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No flashcards available</h3>
          <p className="text-muted-foreground mb-4">
            Upload some files to automatically generate flashcards for studying!
          </p>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Back to Files
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Flashcard Study</h2>
          <Badge variant="outline">
            {currentIndex + 1} of {flashcards.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={studyMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStudyMode(!studyMode)}
          >
            <Brain className="h-4 w-4 mr-2" />
            Study Mode
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <Progress value={progress} className="w-full" />

      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getDifficultyColor(currentCard.difficulty_level)}>
                {currentCard.difficulty_level}
              </Badge>
              {currentCard.mastery_level > 0 && (
                <Badge variant="outline" className={getMasteryColor(currentCard.mastery_level)}>
                  Mastery: {currentCard.mastery_level}/5
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentCard.review_count > 0 && `Reviewed ${currentCard.review_count} times`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Question</h3>
              <p className="text-lg font-medium">{currentCard.question}</p>
            </div>

            {showAnswer && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Answer</h3>
                <p className="text-base text-muted-foreground whitespace-pre-wrap">
                  {currentCard.answer}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {!showAnswer ? (
              <Button onClick={() => setShowAnswer(true)} className="bg-primary hover:bg-primary/90">
                <RotateCcw className="h-4 w-4 mr-2" />
                Show Answer
              </Button>
            ) : studyMode ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleStudyResponse(false)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Incorrect
                </Button>
                <Button
                  onClick={() => handleStudyResponse(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Correct
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}