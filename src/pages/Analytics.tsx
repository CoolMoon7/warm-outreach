import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, Mail, Users, Target } from "lucide-react";

export default function Analytics() {
  const navigate = useNavigate();
  const [templatePerformance, setTemplatePerformance] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalResponded: 0,
    totalContacts: 0,
    responseRate: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user?.id)
        .single();

      // Get template performance
      const { data: perfData } = await supabase
        .from("template_performance")
        .select("*")
        .eq("team_id", profile?.team_id);

      setTemplatePerformance(perfData || []);

      // Get overall stats - first get folder IDs for this team
      const { data: teamFolders } = await supabase
        .from("folders")
        .select("id")
        .eq("team_id", profile?.team_id);

      const folderIds = teamFolders?.map((f) => f.id) || [];

      let emails: any[] = [];
      if (folderIds.length > 0) {
        const { data: emailsData } = await supabase
          .from("emails")
          .select("responded")
          .in("folder_id", folderIds);
        emails = emailsData || [];
      }

      const { count: contactCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile?.team_id);

      const totalSent = emails.length || 0;
      const totalResponded = emails.filter((e) => e.responded).length || 0;

      setStats({
        totalSent,
        totalResponded,
        totalContacts: contactCount || 0,
        responseRate: totalSent > 0 ? (totalResponded / totalSent) * 100 : 0,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Analytics</h1>

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

        <Card>
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
            <CardDescription>
              See which templates are getting the best response rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Total Sent</TableHead>
                  <TableHead>Responded</TableHead>
                  <TableHead>Response Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatePerformance.map((perf, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{perf.template_name}</TableCell>
                    <TableCell>{perf.total_sent}</TableCell>
                    <TableCell>{perf.responded_count}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{perf.response_rate}%</span>
                    </TableCell>
                  </TableRow>
                ))}
                {templatePerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No data yet. Start sending emails to see analytics!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
