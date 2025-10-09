import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out successfully",
      description: "You have been logged out.",
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => navigate("/grades")}
            variant="outline"
            className="w-full justify-start"
          >
            View Grades Calculator
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="destructive" className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
