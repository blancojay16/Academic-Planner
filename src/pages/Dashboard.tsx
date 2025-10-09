import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Upload, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import MotivationalQuote from "@/components/MotivationalQuote";
import StudyAssistant from "@/components/StudyAssistant";

interface DashboardStats {
  schedules: number;
  notes: number;
  files: number;
  upcomingEvents: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    schedules: 0,
    notes: 0,
    files: 0,
    upcomingEvents: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch counts for each section
      const [schedulesResult, notesResult, filesResult, upcomingResult] = await Promise.all([
        supabase.from('schedules').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('schedules')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5)
      ]);

      setStats({
        schedules: schedulesResult.count || 0,
        notes: notesResult.count || 0,
        files: filesResult.count || 0,
        upcomingEvents: upcomingResult.data || []
      });
    } catch (error) {
      toast({
        title: "Error loading dashboard",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your academic schedule, notes, and files</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-card to-card/50 border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4">
            <CardTitle className="text-xs font-medium">Schedule Events</CardTitle>
            <Calendar className="h-3 w-3 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-primary">{stats.schedules}</div>
            <p className="text-[10px] text-muted-foreground">Total scheduled events</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-card/50 border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4">
            <CardTitle className="text-xs font-medium">Notes</CardTitle>
            <FileText className="h-3 w-3 text-accent" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-accent">{stats.notes}</div>
            <p className="text-[10px] text-muted-foreground">Total notes created</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-card/50 border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4">
            <CardTitle className="text-xs font-medium">Files</CardTitle>
            <Upload className="h-3 w-3 text-secondary-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold text-secondary-foreground">{stats.files}</div>
            <p className="text-[10px] text-muted-foreground">Files uploaded</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-xs">Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap p-4 pt-2">
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/schedule">
              <Calendar className="h-3 w-3 mr-1" />
              Add Event
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Link to="/notes">
              <FileText className="h-3 w-3 mr-1" />
              Create Note
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-secondary-foreground/50 hover:bg-secondary">
            <Link to="/files">
              <Upload className="h-3 w-3 mr-1" />
              Upload File
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* AI Study Assistant */}
      <StudyAssistant />

      {/* Motivational Quote */}
      <MotivationalQuote />

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Upcoming Events</CardTitle>
          <CardDescription className="text-xs">Your next 5 scheduled events</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {stats.upcomingEvents.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming events scheduled</p>
              <Button asChild className="mt-2" size="sm" variant="outline">
                <Link to="/schedule">Create your first event</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">{formatDate(event.start_time)}</p>
                    {event.location && (
                      <p className="text-[10px] text-muted-foreground">📍 {event.location}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={getPriorityColor(event.priority)} className="text-[10px] px-1.5 py-0">{event.priority}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{event.category}</Badge>
                  </div>
                </div>
              ))}
              <Button asChild variant="outline" size="sm" className="w-full mt-2">
                <Link to="/schedule">View All Events</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}