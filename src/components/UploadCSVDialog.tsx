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
  const [skipEmptyEmails, setSkipEmptyEmails] = useState(true);
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
          let contactsToProcess = results.data.map((row: any) => ({
            folder_id: folderId,
            team_id: profile.team_id,
            name: row["Full Name"] || row.name || row.Name || `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim(),
            first_name: row["First Name"] || row.first_name || "",
            last_name: row["Last Name"] || row.last_name || "",
            email: row["Work Email"] || row.email || row.Email || "",
            company: row["Company Name"] || row.company || row.Company || "",
            company_domain: row["Company Domain"] || row.company_domain || "",
            job_title: row["Job Title"] || row.job_title || row.role || "",
            role: row["Job Title"] || row.role || row.job_title || "",
            location: row.Location || row.location || "",
            linkedin_profile: row["LinkedIn Profile"] || row.linkedin_profile || "",
          }));

          // Filter based on checkbox
          if (skipEmptyEmails) {
            contactsToProcess = contactsToProcess.filter((contact: any) => contact.email && contact.email.trim() !== "");
          }

          // Insert contacts with upsert to handle duplicates
          const { error } = await supabase
            .from("contacts")
            .upsert(contactsToProcess, { 
              onConflict: "email,team_id",
              ignoreDuplicates: true 
            });

          if (error) throw error;

          toast({
            title: "Contacts imported",
            description: `Successfully imported ${contactsToProcess.length} contacts. Duplicates were skipped.`,
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
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="skip-empty"
              checked={skipEmptyEmails}
              onChange={(e) => setSkipEmptyEmails(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="skip-empty" className="text-sm font-normal cursor-pointer">
              Skip contacts with empty email fields
            </Label>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-semibold">Supported CSV columns:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>Full Name, First Name, Last Name</li>
              <li>Work Email</li>
              <li>Company Name, Company Domain</li>
              <li>Job Title / Role, Location</li>
              <li>LinkedIn Profile</li>
            </ul>
            <p className="text-xs mt-2">Duplicate contacts (same email) will be automatically skipped.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
