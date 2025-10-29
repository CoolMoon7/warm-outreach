import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Mail, Copy, Check, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamName, setTeamName] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.team_id) return;

      // Check if current user is founder
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      setIsFounder(!!roleData);

      // Get team info
      const { data: teamData } = await supabase
        .from("teams")
        .select("name, invite_code")
        .eq("id", profile.team_id)
        .single();

      setTeamName(teamData?.name || "");
      setInviteCode(teamData?.invite_code || "");

      // Get all team members
      const { data: members } = await supabase
        .from("profiles")
        .select("id, name, email, user_id")
        .eq("team_id", profile.team_id);

      // Get roles and email counts for each member
      const membersWithData = await Promise.all(
        (members || []).map(async (member) => {
          const { count } = await supabase
            .from("emails")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", member.user_id);

          // Get role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", member.user_id)
            .maybeSingle();

          return {
            ...member,
            emailCount: count || 0,
            role: roleData?.role || "member",
          };
        })
      );

      setTeamMembers(membersWithData);
    } catch (error) {
      console.error("Error loading team data:", error);
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast({
        title: "Invite code copied!",
        description: "Share this code with your team members.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase.rpc('remove_team_member', { _target_user_id: memberToRemove.user_id });
      if (error) throw error;

      toast({
        title: "Member removed",
        description: `${memberToRemove.name || memberToRemove.email} has been removed from the team.`,
      });

      setMemberToRemove(null);
      loadTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLeaveTeam = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ team_id: null })
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);
      if (roleError) throw roleError;

      toast({ title: "Left team", description: "You have left the team." });
      setLeaveOpen(false);
      loadTeamData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{teamName}</h1>
          <p className="text-muted-foreground">Manage your team members and track performance</p>
        </div>
        <Button variant="outline" onClick={() => setLeaveOpen(true)}>
          <UserX className="h-4 w-4 mr-2" />
          Leave Team
        </Button>
      </div>

      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invite Team Members
            </CardTitle>
            <CardDescription>
              Share this invite code with people you want to add to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteCode}
                className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm font-mono text-lg tracking-wider text-center"
              />
              <Button onClick={copyInviteCode} variant="outline">
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
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Mail className="h-4 w-4" />
                      Emails Sent
                    </div>
                  </TableHead>
                  {isFounder && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || "Unnamed"}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === "founder" ? "default" : "secondary"}>
                        {member.role === "founder" ? "Owner" : "Member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">{member.emailCount}</span>
                    </TableCell>
                    {isFounder && (
                      <TableCell className="text-right">
                        {member.role !== "founder" && member.user_id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {teamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isFounder ? 5 : 4} className="text-center text-muted-foreground">
                      No team members yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name || memberToRemove?.email} from the team?
              They will lose access to all team folders and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave {teamName}? You will lose access to all team folders and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveTeam}>
              Leave Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
