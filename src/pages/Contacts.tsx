import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, Mail, Circle, Search, Edit, Trash, Undo, Phone, Users, Briefcase, DollarSign, ChevronDown } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { EditContactDialog } from "@/components/EditContactDialog";

type ContactStatus = 'not_sent' | 'sent' | 'responded' | 'called' | 'met_in_person' | 'pitched' | 'closed';

export default function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<any>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery]);

  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user?.id)
        .single();

      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("team_id", profile?.team_id)
        .order("created_at", { ascending: false });

      setContacts(contactsData || []);
    } catch (error: any) {
      sonnerToast.error("Error loading contacts", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query) ||
          contact.job_title?.toLowerCase().includes(query)
      );
    }

    // Sort so sent emails (with last_contacted_at) go to the bottom
    const sorted = filtered.sort((a, b) => {
      const aHasSent = !!a.last_contacted_at;
      const bHasSent = !!b.last_contacted_at;
      
      if (aHasSent && !bHasSent) return 1;
      if (!aHasSent && bHasSent) return -1;
      return 0;
    });
    
    setFilteredContacts(sorted);
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

      loadContacts();
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
      loadContacts();
    } catch (error: any) {
      sonnerToast.error("Failed to undo send", {
        description: error.message,
      });
    }
  };

  const handleEditContact = (contact: any) => {
    setContactToEdit(contact);
    setEditContactOpen(true);
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

      loadContacts();
    } catch (error: any) {
      sonnerToast.error("Error", {
        description: error.message,
      });
    } finally {
      setDeleteContactId(null);
    }
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

  const renderContactsTable = (contactsList: any[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contactsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No contacts found
              </TableCell>
            </TableRow>
          ) : (
            contactsList.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>{contact.company || "-"}</TableCell>
                <TableCell>{contact.job_title || "-"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="cursor-pointer">
                        {getStatusBadge(contact.status || 'not_sent')}
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background">
                      <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'sent')}>
                        <Mail className="h-4 w-4 mr-2" />
                        Sent
                      </DropdownMenuItem>
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
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  const notSentContacts = filteredContacts.filter((c) => c.status === 'not_sent');
  const sentContacts = filteredContacts.filter((c) => c.status === 'sent');
  const respondedContacts = filteredContacts.filter((c) => c.status === 'responded');
  const calledContacts = filteredContacts.filter((c) => c.status === 'called');
  const metInPersonContacts = filteredContacts.filter((c) => c.status === 'met_in_person');
  const pitchedContacts = filteredContacts.filter((c) => c.status === 'pitched');
  const closedContacts = filteredContacts.filter((c) => c.status === 'closed');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Contacts</h1>
        <p className="text-muted-foreground">Manage all your outreach contacts</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">
            All ({filteredContacts.length})
          </TabsTrigger>
          <TabsTrigger value="not_sent">
            Not Sent ({notSentContacts.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentContacts.length})
          </TabsTrigger>
          <TabsTrigger value="responded">
            Responded ({respondedContacts.length})
          </TabsTrigger>
          <TabsTrigger value="called">
            Called ({calledContacts.length})
          </TabsTrigger>
          <TabsTrigger value="met_in_person">
            Met in Person ({metInPersonContacts.length})
          </TabsTrigger>
          <TabsTrigger value="pitched">
            Pitched ({pitchedContacts.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedContacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {renderContactsTable(filteredContacts)}
        </TabsContent>

        <TabsContent value="not_sent" className="mt-4">
          {renderContactsTable(notSentContacts)}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {renderContactsTable(sentContacts)}
        </TabsContent>

        <TabsContent value="responded" className="mt-4">
          {renderContactsTable(respondedContacts)}
        </TabsContent>

        <TabsContent value="called" className="mt-4">
          {renderContactsTable(calledContacts)}
        </TabsContent>

        <TabsContent value="met_in_person" className="mt-4">
          {renderContactsTable(metInPersonContacts)}
        </TabsContent>

        <TabsContent value="pitched" className="mt-4">
          {renderContactsTable(pitchedContacts)}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          {renderContactsTable(closedContacts)}
        </TabsContent>
      </Tabs>

      {contactToEdit && (
        <EditContactDialog
          open={editContactOpen}
          onOpenChange={setEditContactOpen}
          contact={contactToEdit}
          onContactUpdated={loadContacts}
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
    </div>
  );
}
