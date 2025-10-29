import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Mail, Users, Target, FolderOpen, CheckCircle } from "lucide-react";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalSent: 0,
    totalResponded: 0,
    responseRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.team_id) {
        setLoading(false);
        return;
      }

      // Get overall stats
      const { count: contactCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile.team_id);

      const { data: allContacts } = await supabase
        .from("contacts")
        .select("responded, last_contacted_at")
        .eq("team_id", profile.team_id);

      const sentContacts = allContacts?.filter((c) => c.last_contacted_at) || [];
      const totalSent = sentContacts.length;
      const totalResponded = sentContacts.filter((c) => c.responded).length;

      setStats({
        totalContacts: contactCount || 0,
        totalSent,
        totalResponded,
        responseRate: totalSent > 0 ? (totalResponded / totalSent) * 100 : 0,
      });

      // Get recent responses (contacts that responded, ordered by last contact date)
      const { data: recentResponses } = await supabase
        .from("contacts")
        .select("name, email, company, last_contacted_at, folder_id")
        .eq("team_id", profile.team_id)
        .eq("responded", true)
        .not("last_contacted_at", "is", null)
        .order("last_contacted_at", { ascending: false })
        .limit(5);

      // Get folder names for recent responses
      if (recentResponses && recentResponses.length > 0) {
        const folderIds = [...new Set(recentResponses.map(r => r.folder_id))];
        const { data: foldersData } = await supabase
          .from("folders")
          .select("id, name")
          .in("id", folderIds);

        const folderMap = new Map(foldersData?.map(f => [f.id, f.name]) || []);
        
        setRecentActivity(
          recentResponses.map(r => ({
            ...r,
            folderName: folderMap.get(r.folder_id) || "Unknown",
          }))
        );
      }

      // Get folders summary (limited to 6 for quick access)
      const { data: foldersData } = await supabase
        .from("folders")
        .select("id, name, description")
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false })
        .limit(6);

      // Get counts for each folder
      const foldersWithCounts = await Promise.all(
        (foldersData || []).map(async (folder) => {
          const { count } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id);

          return { ...folder, contactsCount: count || 0 };
        })
      );

      setFolders(foldersWithCounts);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Overview of your outreach performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResponded}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Recent Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Responses
            </CardTitle>
            <CardDescription>Latest contacts who responded to your outreach</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No responses yet. Keep reaching out!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{activity.name}</p>
                          <p className="text-xs text-muted-foreground">{activity.company}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{activity.folderName}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(activity.last_contacted_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Folders Access */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Your Folders
                </CardTitle>
                <CardDescription>Quick access to your campaigns</CardDescription>
              </div>
              <CreateFolderDialog onFolderCreated={loadDashboard} />
            </div>
          </CardHeader>
          <CardContent>
            {folders.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No folders yet. Create one to get started!
                </p>
                <CreateFolderDialog onFolderCreated={loadDashboard} />
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/folders/${folder.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      {folder.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {folder.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {folder.contactsCount} contacts
                    </Badge>
                  </div>
                ))}
                {folders.length >= 6 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => navigate("/folders")}
                  >
                    View All Folders
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
