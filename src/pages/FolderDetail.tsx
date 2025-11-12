import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Mail, CheckCircle, Circle, Trash, Edit, FolderX, Undo, Phone, Users, Briefcase, DollarSign, ChevronDown } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { UploadCSVDialog } from "@/components/UploadCSVDialog";
import { EmailGeneratorModal } from "@/components/EmailGeneratorModal";
import { EditContactDialog } from "@/components/EditContactDialog";

type ContactStatus = 'not_sent' | 'sent' | 'responded' | 'called' | 'met_in_person' | 'pitched' | 'closed';

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
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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

  const updateContactStatus = async (contactId: string, newStatus: ContactStatus) => {
    try {
      await supabase
        .from("contacts")
        .update({ 
          status: newStatus,
          responded: newStatus === 'responded'
        })
        .eq("id", contactId);

      if (newStatus === 'responded') {
        await supabase
          .from("emails")
          .update({ responded: true })
          .eq("contact_id", contactId);
      }

      loadData();
      sonnerToast.success("Status updated", {
        description: `Contact status changed to ${getStatusLabel(newStatus)}.`,
      });
    } catch (error: any) {
      sonnerToast.error("Error", {
        description: error.message,
      });
    }
  };

  const getStatusLabel = (status: ContactStatus) => {
    const labels: Record<ContactStatus, string> = {
      not_sent: 'Not Sent',
      sent: 'Sent',
      responded: 'Responded',
      called: 'Called',
      met_in_person: 'Met in Person',
      pitched: 'Pitched',
      closed: 'Closed'
    };
    return labels[status];
  };

  const getStatusBadge = (status: ContactStatus) => {
    const statusConfig: Record<ContactStatus, { icon: any, className: string, label: string }> = {
      not_sent: { icon: Circle, className: 'bg-gray-500', label: 'Not Sent' },
      sent: { icon: Mail, className: 'bg-blue-500', label: 'Sent' },
      responded: { icon: CheckCircle, className: 'bg-green-500', label: 'Responded' },
      called: { icon: Phone, className: 'bg-purple-500', label: 'Called' },
      met_in_person: { icon: Users, className: 'bg-orange-500', label: 'Met in Person' },
      pitched: { icon: Briefcase, className: 'bg-yellow-500', label: 'Pitched' },
      closed: { icon: DollarSign, className: 'bg-emerald-600', label: 'Closed' }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
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

            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="all">
                  All ({contacts.length})
                </TabsTrigger>
                <TabsTrigger value="not_sent">
                  Not Sent ({contacts.filter((c) => c.status === 'not_sent').length})
                </TabsTrigger>
                <TabsTrigger value="sent">
                  Sent ({contacts.filter((c) => c.status === 'sent').length})
                </TabsTrigger>
                <TabsTrigger value="responded">
                  Responded ({contacts.filter((c) => c.status === 'responded').length})
                </TabsTrigger>
                <TabsTrigger value="called">
                  Called ({contacts.filter((c) => c.status === 'called').length})
                </TabsTrigger>
                <TabsTrigger value="met_in_person">
                  Met in Person ({contacts.filter((c) => c.status === 'met_in_person').length})
                </TabsTrigger>
                <TabsTrigger value="pitched">
                  Pitched ({contacts.filter((c) => c.status === 'pitched').length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({contacts.filter((c) => c.status === 'closed').length})
                </TabsTrigger>
              </TabsList>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Last Contacted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts
                      .filter((c) => selectedStatus === 'all' || c.status === selectedStatus)
                      .map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.company || "-"}</TableCell>
                        <TableCell>{contact.job_title || "-"}</TableCell>
                        <TableCell>
                          {contact.last_contacted_at
                            ? new Date(contact.last_contacted_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(contact.status || 'not_sent')}
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
                            {contact.last_contacted_at && contact.status === 'sent' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUndoSend(contact.id)}
                              >
                                <Undo className="h-4 w-4 mr-1" />
                                Undo Send
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!contact.last_contacted_at}
                                  title={!contact.last_contacted_at ? "Contact must be sent first" : ""}
                                >
                                  Change Status
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'responded')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Responded
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'called')}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Called
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'met_in_person')}>
                                  <Users className="h-4 w-4 mr-2" />
                                  Met in Person
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'pitched')}>
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  Pitched
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'closed')}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Closed
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
            </Tabs>
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
