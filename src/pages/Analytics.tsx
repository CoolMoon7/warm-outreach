import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Mail, Users, Target } from "lucide-react";

export default function Analytics() {
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

      // Get overall stats from contacts table (more accurate)
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("status, last_contacted_at")
        .eq("team_id", profile?.team_id);

      const { count: contactCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("team_id", profile?.team_id);

      // Only count contacts that have been sent emails (have last_contacted_at)
      const sentContacts = allContacts?.filter((c) => c.last_contacted_at) || [];
      const totalSent = sentContacts.length;
      
      // Count all engagement statuses as responses
      const responseStatuses = ['responded', 'called', 'met_in_person', 'pitched', 'closed'];
      const totalResponded = sentContacts.filter((c) => responseStatuses.includes(c.status)).length;

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
    <div className="container mx-auto px-4 py-8">
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
    </div>
  );
}
