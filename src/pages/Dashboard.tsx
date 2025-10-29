import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Plus, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  team_id: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      setProfile(profileData);

      // If no team, redirect to team setup
      if (!profileData.team_id) {
        navigate("/team-setup");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">BonaCRM</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile?.email}</span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Welcome, {profile?.name}!</h2>
            <p className="text-muted-foreground mt-1">Manage your outreach campaigns</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Folder
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FolderOpen className="h-8 w-8 text-primary" />
                <span className="text-sm text-muted-foreground">125 contacts</span>
              </div>
              <CardTitle className="mt-4">Example Campaign</CardTitle>
              <CardDescription>Tech startup outreach</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Sent: </span>
                  <span className="font-medium">80%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Response: </span>
                  <span className="font-medium text-success">15%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]">
            <div className="text-center p-6">
              <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Create your first folder</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
