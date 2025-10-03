import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuizViewerProps {
  quizId: string;
  onClose: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: any;
  correct_answer: string;
  explanation: string;
}

export const QuizViewer = ({ quizId, onClose }: QuizViewerProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setQuestions(data || []);
    } catch (error: any) {
      toast.error('Failed to load quiz questions');
      console.error('Error fetching quiz questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct_answer) {
        correct++;
      }
    });
    return { correct, total: questions.length };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-3xl mx-4">
          <CardContent className="p-8">
            <div className="text-center">Loading quiz...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-3xl mx-4">
          <CardContent className="p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Quiz</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center text-muted-foreground">
              No questions found for this quiz.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const { correct, total } = calculateScore();
  const percentage = Math.round((correct / total) * 100);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {showResults ? 'Quiz Results' : 'Take Quiz'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!showResults ? (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <Badge variant="outline">
                    Question {currentQuestion + 1} of {questions.length}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {Object.keys(selectedAnswers).length}/{questions.length} answered
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-6">{currentQ.question}</h3>
                
                <div className="space-y-3 mb-6">
                  {Object.entries(currentQ.options).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleAnswerSelect(key)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedAnswers[currentQuestion] === key
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="font-medium">{key}.</span> {String(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                
                {currentQuestion === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={Object.keys(selectedAnswers).length !== questions.length}
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="text-6xl font-bold mb-4">
                  {percentage}%
                </div>
                <p className="text-xl text-muted-foreground">
                  You got {correct} out of {total} questions correct
                </p>
              </div>

              <div className="space-y-6">
                {questions.map((q, index) => {
                  const userAnswer = selectedAnswers[index];
                  const isCorrect = userAnswer === q.correct_answer;
                  
                  return (
                    <Card key={q.id} className={isCorrect ? 'border-green-500' : 'border-red-500'}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 mb-4">
                          <Badge variant={isCorrect ? 'default' : 'destructive'}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                          <h4 className="font-semibold flex-1">{q.question}</h4>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-sm">
                        <span className="font-medium">Your answer:</span>{' '}
                          <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {userAnswer ? String(q.options[userAnswer]) : 'Not answered'}
                          </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm">
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-600">
                              {String(q.options[q.correct_answer])}
                            </span>
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm font-medium mb-1">Explanation:</p>
                          <p className="text-sm text-muted-foreground">{q.explanation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center">
                <Button onClick={onClose}>Close</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
