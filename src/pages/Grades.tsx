import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calculator, Trash2, Edit, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Grade {
  id: string;
  course_name: string;
  course_code?: string;
  grade_value?: number;
  grade_letter?: string;
  credit_hours: number;
  semester?: string;
  year?: number;
  category: string;
  created_at: string;
}

export default function Grades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    grade_value: '',
    grade_letter: '',
    credit_hours: '3',
    semester: '',
    year: new Date().getFullYear().toString(),
    category: 'course'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      toast({
        title: "Error loading grades",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGPA = () => {
    const courseGrades = grades.filter(g => g.category === 'course' && g.grade_value);
    if (courseGrades.length === 0) return 0;

    const totalPoints = courseGrades.reduce((sum, grade) => {
      return sum + (grade.grade_value! * grade.credit_hours);
    }, 0);

    const totalCredits = courseGrades.reduce((sum, grade) => sum + grade.credit_hours, 0);
    return totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  };

  const letterToGPA = (letter: string): number => {
    const gradeMap: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0
    };
    return gradeMap[letter.toUpperCase()] || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const gradeData = {
        user_id: user.id,
        course_name: formData.course_name,
        course_code: formData.course_code || null,
        grade_value: formData.grade_value ? parseFloat(formData.grade_value) : 
                    formData.grade_letter ? letterToGPA(formData.grade_letter) : null,
        grade_letter: formData.grade_letter || null,
        credit_hours: parseInt(formData.credit_hours),
        semester: formData.semester || null,
        year: formData.year ? parseInt(formData.year) : null,
        category: formData.category
      };

      if (editingGrade) {
        const { error } = await supabase
          .from('grades')
          .update(gradeData)
          .eq('id', editingGrade.id);
        if (error) throw error;
        toast({ title: "Grade updated successfully!" });
      } else {
        const { error } = await supabase
          .from('grades')
          .insert(gradeData);
        if (error) throw error;
        toast({ title: "Grade added successfully!" });
      }

      setDialogOpen(false);
      setEditingGrade(null);
      resetForm();
      fetchGrades();
    } catch (error: any) {
      toast({
        title: "Error saving grade",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setFormData({
      course_name: grade.course_name,
      course_code: grade.course_code || '',
      grade_value: grade.grade_value?.toString() || '',
      grade_letter: grade.grade_letter || '',
      credit_hours: grade.credit_hours.toString(),
      semester: grade.semester || '',
      year: grade.year?.toString() || '',
      category: grade.category
    });
    setDialogOpen(true);
  };

  const handleDelete = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', gradeId);

      if (error) throw error;
      toast({ title: "Grade deleted successfully!" });
      fetchGrades();
    } catch (error) {
      toast({
        title: "Error deleting grade",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      course_name: '',
      course_code: '',
      grade_value: '',
      grade_letter: '',
      credit_hours: '3',
      semester: '',
      year: new Date().getFullYear().toString(),
      category: 'course'
    });
  };

  const getGradeColor = (gradeValue?: number) => {
    if (!gradeValue) return 'bg-muted text-muted-foreground';
    if (gradeValue >= 3.7) return 'bg-green-100 text-green-800';
    if (gradeValue >= 3.0) return 'bg-blue-100 text-blue-800';
    if (gradeValue >= 2.0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'course': return 'bg-primary/10 text-primary';
      case 'assignment': return 'bg-secondary/10 text-secondary-foreground';
      case 'exam': return 'bg-accent/10 text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
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

  const currentGPA = calculateGPA();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Grade Tracker</h1>
          <p className="text-muted-foreground">Track your academic performance and calculate GPA</p>
        </div>
      </div>

      {/* GPA Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Current GPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary mb-2">
              {currentGPA.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              Based on {grades.filter(g => g.category === 'course').length} courses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Academic Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Credits:</span>
                <span className="font-medium">
                  {grades.filter(g => g.category === 'course').reduce((sum, g) => sum + g.credit_hours, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Grade Status:</span>
                <Badge variant={currentGPA >= 3.0 ? 'default' : 'destructive'}>
                  {currentGPA >= 3.7 ? 'Excellent' : currentGPA >= 3.0 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Grade Button */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingGrade(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Grade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingGrade ? 'Edit Grade' : 'Add New Grade'}</DialogTitle>
              <DialogDescription>
                Enter the details for your grade. You can use either a numeric value or letter grade.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course_name">Course Name</Label>
                  <Input
                    id="course_name"
                    value={formData.course_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, course_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="course_code">Course Code</Label>
                  <Input
                    id="course_code"
                    value={formData.course_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                    placeholder="e.g., CS101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grade_value">Numeric Grade (0-4.0)</Label>
                  <Input
                    id="grade_value"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={formData.grade_value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      grade_value: e.target.value,
                      grade_letter: e.target.value ? '' : prev.grade_letter
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="grade_letter">Letter Grade</Label>
                  <Select
                    value={formData.grade_letter}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      grade_letter: value,
                      grade_value: value ? '' : prev.grade_value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="C+">C+</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="C-">C-</SelectItem>
                      <SelectItem value="D+">D+</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="D-">D-</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="credit_hours">Credit Hours</Label>
                  <Input
                    id="credit_hours"
                    type="number"
                    min="1"
                    max="6"
                    value={formData.credit_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit_hours: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    value={formData.semester}
                    onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                    placeholder="Fall, Spring, Summer"
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingGrade ? 'Update Grade' : 'Add Grade'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grades List */}
      {grades.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calculator className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No grades recorded yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your academic performance by adding your first grade.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grades.map((grade) => (
            <Card key={grade.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {grade.course_name}
                    </h3>
                    {grade.course_code && (
                      <p className="text-xs text-muted-foreground">{grade.course_code}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(grade)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(grade.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Grade:</span>
                    <Badge className={getGradeColor(grade.grade_value)} variant="secondary">
                      {grade.grade_letter || grade.grade_value?.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Credits:</span>
                    <span className="text-xs font-medium">{grade.credit_hours}</span>
                  </div>
                  {(grade.semester || grade.year) && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Term:</span>
                      <span className="text-xs">{grade.semester} {grade.year}</span>
                    </div>
                  )}
                </div>

                <Badge className={getCategoryColor(grade.category)} variant="outline">
                  {grade.category}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}