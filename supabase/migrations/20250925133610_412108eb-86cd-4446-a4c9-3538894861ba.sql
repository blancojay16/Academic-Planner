-- Create grades table for GPA tracking
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_name TEXT NOT NULL,
  course_code TEXT,
  grade_value DECIMAL(3,2), -- For numeric grades like 3.75
  grade_letter TEXT, -- For letter grades like A, B+
  credit_hours INTEGER NOT NULL DEFAULT 3,
  semester TEXT,
  year INTEGER,
  category TEXT DEFAULT 'course', -- course, assignment, exam
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own grades" 
ON public.grades 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grades" 
ON public.grades 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grades" 
ON public.grades 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grades" 
ON public.grades 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grades_updated_at
BEFORE UPDATE ON public.grades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_quotes table for motivational quotes
CREATE TABLE public.user_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quote_text TEXT NOT NULL,
  author TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for user quotes
CREATE POLICY "Users can view their own quotes" 
ON public.user_quotes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.user_quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.user_quotes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.user_quotes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_quotes_updated_at
BEFORE UPDATE ON public.user_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();