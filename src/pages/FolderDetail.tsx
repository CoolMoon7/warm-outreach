import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadCSVDialog } from "@/components/UploadCSVDialog";
import { EmailGeneratorModal } from "@/components/EmailGeneratorModal";

export default function FolderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [folder, setFolder] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: folderData } = await supabase
        .from("folders")
        .select("*")
        .eq("id", id)
        .single();

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("folder_id", id)
        .order("created_at", { ascending: false });

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user?.id)
        .single();

      const { data: templatesData } = await supabase
        .from("templates")
        .select("*")
        .eq("team_id", profile?.team_id)
        .order("created_at", { ascending: false });

      setFolder(folderData);
      setContacts(contactsData || []);
      setTemplates(templatesData || []);
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

  const toggleResponded = async (contactId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from("contacts")
        .update({ responded: !currentStatus })
        .eq("id", contactId);

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateEmail = (contact: any) => {
    if (!selectedTemplate) {
      toast({
        title: "No template selected",
        description: "Please select a template first",
        variant: "destructive",
      });
      return;
    }
    setSelectedContact(contact);
    setEmailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{folder?.name}</h1>
          {folder?.description && (
            <p className="text-muted-foreground mt-1">{folder.description}</p>
          )}
        </div>

        <Tabs defaultValue="contacts">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <UploadCSVDialog folderId={id!} onUploadComplete={loadData} />
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Last Contacted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell>{contact.company}</TableCell>
                      <TableCell>
                        {contact.last_contacted_at
                          ? new Date(contact.last_contacted_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {contact.responded ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Responded
                          </Badge>
                        ) : contact.last_contacted_at ? (
                          <Badge variant="secondary">
                            <Mail className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Circle className="h-3 w-3 mr-1" />
                            Not Sent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleGenerateEmail(contact)}
                            disabled={!selectedTemplate}
                          >
                            Generate Email
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleResponded(contact.id, contact.responded)}
                          >
                            {contact.responded ? "Mark Unresponded" : "Mark Responded"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Available Templates</h3>
              <Button onClick={() => navigate("/templates")}>
                Create Template
              </Button>
            </div>
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Subject: {template.subject}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {selectedContact && selectedTemplate && (
        <EmailGeneratorModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          contact={selectedContact}
          template={templates.find((t) => t.id === selectedTemplate)!}
          onEmailSent={loadData}
        />
      )}
    </div>
  );
}
