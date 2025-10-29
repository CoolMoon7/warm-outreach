import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const TeamSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkTeam();
  }, []);

  const checkTeam = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.team_id) {
      navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Error checking team:", error);
    }
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure profile exists (safety net in case trigger didn't fire)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email!,
          });

        if (createProfileError) throw createProfileError;
      }

      // Create new team with invite code
      const teamId = crypto.randomUUID();
      const newInviteCode = generateInviteCode();
      
      const { error: teamError } = await supabase
        .from("teams")
        .insert({ id: teamId, name: teamName, invite_code: newInviteCode });

      if (teamError) throw teamError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ team_id: teamId })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Assign founder role to the team creator
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "founder" });

      if (roleError && roleError.code !== "23505") throw roleError;

      toast({
        title: "Team created!",
        description: "Your team has been created successfully.",
      });

      // Small delay to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email!,
          });

        if (createProfileError) throw createProfileError;
      }

      // Find team by invite code
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase())
        .maybeSingle();

      if (teamError) throw teamError;
      if (!team) throw new Error("Invalid invite code");

      // Join the team
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ team_id: team.id })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Assign member role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "member" });

      if (roleError && roleError.code !== "23505") throw roleError;

      toast({
        title: "Success!",
        description: "You've joined the team.",
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Team Setup</CardTitle>
          <CardDescription>
            Create a new team or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Team</TabsTrigger>
              <TabsTrigger value="join">Join Team</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create">
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    type="text"
                    placeholder="My Company"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Team"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="join">
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="ABC12345"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    maxLength={8}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the 8-character code provided by your team
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Joining..." : "Join Team"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamSetup;
