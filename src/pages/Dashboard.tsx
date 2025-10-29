import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FolderCard } from "@/components/FolderCard";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadFolders();
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadFolders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user?.id)
        .single();

      const { data: foldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("team_id", profile?.team_id)
        .order("created_at", { ascending: false });

      // Get contact counts and stats for each folder
      const foldersWithStats = await Promise.all(
        (foldersData || []).map(async (folder) => {
          const { count: contactCount } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id);

          const { data: emails } = await supabase
            .from("emails")
            .select("responded")
            .eq("folder_id", folder.id);

          const sentCount = emails?.length || 0;
          const respondedCount = emails?.filter((e) => e.responded).length || 0;
          const responseRate = sentCount > 0 ? (respondedCount / sentCount) * 100 : 0;

          return {
            ...folder,
            contactsCount: contactCount || 0,
            sentCount,
            responseRate: Math.round(responseRate),
          };
        })
      );

      setFolders(foldersWithStats);
    } catch (error: any) {
      toast({
        title: "Error loading folders",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">BonaCRM</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/templates")}>
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button variant="ghost" onClick={() => navigate("/analytics")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Manage your outreach campaigns</p>
          </div>
          <CreateFolderDialog onFolderCreated={loadFolders} />
        </div>

        {folders.length === 0 ? (
          <div className="p-12 rounded-lg border bg-card text-center">
            <h3 className="font-semibold text-lg mb-2">Welcome to BonaCRM!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by creating your first folder to organize contacts and campaigns.
            </p>
            <CreateFolderDialog onFolderCreated={loadFolders} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                id={folder.id}
                name={folder.name}
                description={folder.description}
                contactsCount={folder.contactsCount}
                sentCount={folder.sentCount}
                responseRate={folder.responseRate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
