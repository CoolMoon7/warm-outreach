import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

type Platform = "email" | "linkedin" | "x";

interface AddContactDialogProps {
  defaultPlatform?: Platform;
  onContactAdded: () => void;
}

export const AddContactDialog = ({ defaultPlatform = "email", onContactAdded }: AddContactDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    platform: defaultPlatform as Platform,
    first_name: "",
    last_name: "",
    email: "",
    linkedin_profile: "",
    x_handle: "",
    company: "",
    job_title: "",
    notes: "",
  });

  const reset = () =>
    setFormData({
      platform: defaultPlatform,
      first_name: "",
      last_name: "",
      email: "",
      linkedin_profile: "",
      x_handle: "",
      company: "",
      job_title: "",
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();
      if (!profile?.team_id) throw new Error("No team found");

      const name = `${formData.first_name} ${formData.last_name}`.trim() || formData.email || formData.linkedin_profile || formData.x_handle || "Unnamed";

      const { error } = await supabase.from("contacts").insert({
        team_id: profile.team_id,
        created_by: user.id,
        platform: formData.platform,
        name,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email || null,
        linkedin_profile: formData.linkedin_profile || null,
        x_handle: formData.x_handle || null,
        company: formData.company || null,
        job_title: formData.job_title || null,
      } as any);

      if (error) throw error;

      sonnerToast.success("Contact added");
      reset();
      setOpen(false);
      onContactAdded();
    } catch (err: any) {
      sonnerToast.error("Error", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Choose a platform and enter contact details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={formData.platform} onValueChange={(v: Platform) => setFormData({ ...formData, platform: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="x">X</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
            </div>
          </div>

          {formData.platform === "email" && (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          )}
          {formData.platform === "linkedin" && (
            <div className="space-y-2">
              <Label>LinkedIn Profile URL</Label>
              <Input required value={formData.linkedin_profile} onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </div>
          )}
          {formData.platform === "x" && (
            <div className="space-y-2">
              <Label>X Handle</Label>
              <Input required value={formData.x_handle} onChange={(e) => setFormData({ ...formData, x_handle: e.target.value })} placeholder="@username" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add Contact"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
