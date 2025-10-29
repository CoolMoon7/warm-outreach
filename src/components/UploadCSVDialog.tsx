import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

interface UploadCSVDialogProps {
  folderId: string;
  onUploadComplete: () => void;
}

export const UploadCSVDialog = ({ folderId, onUploadComplete }: UploadCSVDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const contacts = results.data.map((row: any) => ({
            folder_id: folderId,
            team_id: profile.team_id,
            name: row.name || row.Name || "",
            email: row.email || row.Email || "",
            company: row.company || row.Company || "",
          }));

          const { error } = await supabase.from("contacts").insert(contacts);

          if (error) throw error;

          toast({
            title: "Contacts imported",
            description: `Successfully imported ${contacts.length} contacts.`,
          });

          setOpen(false);
          onUploadComplete();
        },
        error: (error) => {
          throw new Error(`CSV parsing error: ${error.message}`);
        },
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Contacts CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: name, email, company
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Make sure your CSV includes: name, email, and company columns
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
