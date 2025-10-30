import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Mail, CheckCircle, Circle, Trash, Edit, FolderX, Undo } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { UploadCSVDialog } from "@/components/UploadCSVDialog";
import { EmailGeneratorModal } from "@/components/EmailGeneratorModal";
import { EditContactDialog } from "@/components/EditContactDialog";

export default function FolderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<any>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
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
      sonnerToast.error("Error", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleResponded = async (contactId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Update contact
      await supabase
        .from("contacts")
        .update({ responded: newStatus })
        .eq("id", contactId);

      // Also update all emails for this contact
      await supabase
        .from("emails")
        .update({ responded: newStatus })
        .eq("contact_id", contactId);

      loadData();
    } catch (error: any) {
      sonnerToast.error("Error", {
        description: error.message,
      });
    }
  };

  const handleGenerateEmail = (contact: any) => {
    if (!selectedTemplate) {
      sonnerToast.error("No template selected", {
        description: "Please select a template first",
      });
      return;
    }
    setSelectedContact(contact);
    setEmailModalOpen(true);
  };

  const handleUndoSend = async (contactId: string) => {
    try {
      // Get all emails for this contact, sorted by sent date
      const { data: emails } = await supabase
        .from("emails")
        .select("*")
        .eq("contact_id", contactId)
        .order("sent_at", { ascending: false });

      if (!emails || emails.length === 0) {
        sonnerToast.error("No sent emails found for this contact");
        return;
      }

      // Get the most recent email
      const mostRecentEmail = emails[0];

      // Delete the most recent email
      await supabase
        .from("emails")
        .delete()
        .eq("id", mostRecentEmail.id);

      // Check if there are any remaining emails
      const remainingEmails = emails.slice(1);

      if (remainingEmails.length > 0) {
        // Set contact state to the previous email
        const previousEmail = remainingEmails[0];
        await supabase
          .from("contacts")
          .update({
            last_contacted_at: previousEmail.sent_at,
            last_template_id: previousEmail.template_id,
            last_sender_id: previousEmail.sender_id,
          })
          .eq("id", contactId);
      } else {
        // No remaining emails, clear the contact state
        await supabase
          .from("contacts")
          .update({
            last_contacted_at: null,
            last_template_id: null,
            last_sender_id: null,
          })
          .eq("id", contactId);
      }

      sonnerToast.success("Email send undone");
      loadData();
    } catch (error: any) {
      sonnerToast.error("Failed to undo send", {
        description: error.message,
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      sonnerToast.success("Contact deleted", {
        description: "The contact has been removed.",
      });

      loadData();
    } catch (error: any) {
      sonnerToast.error("Error", {
        description: error.message,
      });
    } finally {
      setDeleteContactId(null);
    }
  };

  const handleDeleteFolder = async () => {
    try {
      // Delete folder (contacts will be handled by cascade delete if set up)
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      sonnerToast.success("Folder deleted", {
        description: "The folder and all its contents have been removed.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      sonnerToast.error("Error", {
        description: error.message,
      });
    } finally {
      setDeleteFolderOpen(false);
    }
  };

  const handleEditContact = (contact: any) => {
    setContactToEdit(contact);
    setEditContactOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{folder?.name}</h1>
            {folder?.description && (
              <p className="text-muted-foreground mt-1">{folder.description}</p>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteFolderOpen(true)}
          >
            <FolderX className="h-4 w-4 mr-2" />
            Delete Folder
          </Button>
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
                          {contact.last_contacted_at && !contact.responded && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoSend(contact.id)}
                            >
                              <Undo className="h-4 w-4 mr-1" />
                              Undo Send
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleResponded(contact.id, contact.responded)}
                          >
                            {contact.responded ? "Mark Unresponded" : "Mark Responded"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteContactId(contact.id)}
                          >
                            <Trash className="h-4 w-4" />
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
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Available Templates</h3>
              <p className="text-sm text-muted-foreground">
                Use the sidebar to create new templates
              </p>
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

      {selectedContact && selectedTemplate && (
        <EmailGeneratorModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          contact={selectedContact}
          template={templates.find((t) => t.id === selectedTemplate)!}
          onEmailSent={loadData}
        />
      )}

      {contactToEdit && (
        <EditContactDialog
          open={editContactOpen}
          onOpenChange={setEditContactOpen}
          contact={contactToEdit}
          onContactUpdated={loadData}
        />
      )}

      <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteContactId && handleDeleteContact(deleteContactId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? All contacts within this folder will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground">
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
