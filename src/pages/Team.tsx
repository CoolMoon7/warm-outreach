import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, Mail, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamName, setTeamName] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.team_id) return;

      // Get team info
      const { data: teamData } = await supabase
        .from("teams")
        .select("name")
        .eq("id", profile.team_id)
        .single();

      setTeamName(teamData?.name || "");

      // Get all team members
      const { data: members } = await supabase
        .from("profiles")
        .select("id, name, email, user_id")
        .eq("team_id", profile.team_id);

      // Get email counts for each member
      const membersWithCounts = await Promise.all(
        (members || []).map(async (member) => {
          const { count } = await supabase
            .from("emails")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", member.user_id);

          return {
            ...member,
            emailCount: count || 0,
          };
        })
      );

      setTeamMembers(membersWithCounts);

      // Generate invite link (team_id in URL)
      const inviteUrl = `${window.location.origin}/team-setup?invite=${profile.team_id}`;
      setInviteLink(inviteUrl);
    } catch (error) {
      console.error("Error loading team data:", error);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Invite link copied!",
        description: "Share this link with your team members.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{teamName}</h1>
          <p className="text-muted-foreground">Manage your team members and track performance</p>
        </div>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invite Team Members
            </CardTitle>
            <CardDescription>
              Share this invite link with people you want to add to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
              />
              <Button onClick={copyInviteLink} variant="outline">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              View all team members and their email activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Mail className="h-4 w-4" />
                      Emails Sent
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || "Unnamed"}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">{member.emailCount}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {teamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No team members yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
