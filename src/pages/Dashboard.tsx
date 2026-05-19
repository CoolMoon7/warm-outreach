import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Mail, Users, Target, CheckCircle, Linkedin, Twitter } from "lucide-react";

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalContacts: 0, totalSent: 0, totalResponded: 0, responseRate: 0 });
  const [platformCounts, setPlatformCounts] = useState({ email: 0, linkedin: 0, x: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles").select("team_id").eq("user_id", user?.id).single();
      if (!profile?.team_id) { setLoading(false); return; }

      const { data: allContacts } = await supabase
        .from("contacts")
        .select("name, email, company, platform, status, last_contacted_at, responded")
        .eq("team_id", profile.team_id);

      const contacts = allContacts || [];
      const sentContacts = contacts.filter((c) => c.last_contacted_at);
      const responseStatuses = ['responded', 'called', 'met_in_person', 'pitched', 'closed'];
      const responded = sentContacts.filter((c) => responseStatuses.includes(c.status || ''));

      setStats({
        totalContacts: contacts.length,
        totalSent: sentContacts.length,
        totalResponded: responded.length,
        responseRate: sentContacts.length > 0 ? (responded.length / sentContacts.length) * 100 : 0,
      });

      setPlatformCounts({
        email: contacts.filter((c) => c.platform === 'email').length,
        linkedin: contacts.filter((c) => c.platform === 'linkedin').length,
        x: contacts.filter((c) => c.platform === 'x').length,
      });

      const recent = [...contacts]
        .filter((c) => responseStatuses.includes(c.status || '') && c.last_contacted_at)
        .sort((a, b) => new Date(b.last_contacted_at!).getTime() - new Date(a.last_contacted_at!).getTime())
        .slice(0, 5);
      setRecentActivity(recent);
    } catch (error: any) {
      toast({ title: "Error loading dashboard", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your outreach performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle><Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalContacts}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle><Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalSent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle><Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalResponded}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.responseRate.toFixed(1)}%</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[
          { label: "Email", count: platformCounts.email, icon: Mail, url: "/contacts/email" },
          { label: "LinkedIn", count: platformCounts.linkedin, icon: Linkedin, url: "/contacts/linkedin" },
          { label: "X", count: platformCounts.x, icon: Twitter, url: "/contacts/x" },
        ].map((p) => (
          <Card key={p.label} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate(p.url)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{p.label} Contacts</CardTitle>
              <p.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{p.count}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />Recent Responses</CardTitle>
          <CardDescription>Latest contacts who engaged with your outreach</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No responses yet. Keep reaching out!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Contact</TableHead><TableHead>Platform</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((a, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.company}</p></div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.platform}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{a.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(a.last_contacted_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
