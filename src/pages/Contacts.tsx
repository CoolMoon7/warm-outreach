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
import { CheckCircle, Mail, Circle, Search, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditContactDialog } from "@/components/EditContactDialog";

export default function Contacts() {
  const { toast } = useToast();
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
      toast({
        title: "Error loading contacts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    if (!searchQuery) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(
      (contact) =>
        contact.name?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.job_title?.toLowerCase().includes(query)
    );
    setFilteredContacts(filtered);
  };

  const toggleResponded = async (contactId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      await supabase
        .from("contacts")
        .update({ responded: newStatus })
        .eq("id", contactId);

      await supabase
        .from("emails")
        .update({ responded: newStatus })
        .eq("contact_id", contactId);

      loadContacts();
      toast({
        title: "Status updated",
        description: `Contact marked as ${newStatus ? "responded" : "not responded"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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

      toast({
        title: "Contact deleted",
        description: "The contact has been removed.",
      });

      loadContacts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteContactId(null);
    }
  };

  const getStatusBadge = (contact: any) => {
    if (contact.responded) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Responded
        </Badge>
      );
    }
    if (contact.last_contacted_at) {
      return (
        <Badge variant="secondary">
          <Mail className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Circle className="h-3 w-3 mr-1" />
        Not Sent
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
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Contact</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contactsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No contacts found
              </TableCell>
            </TableRow>
          ) : (
            contactsList.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{contact.name}</div>
                    {contact.first_name && contact.last_name && (
                      <div className="text-xs text-muted-foreground">
                        {contact.first_name} {contact.last_name}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{contact.company}</div>
                    {contact.company_domain && (
                      <div className="text-xs text-muted-foreground">{contact.company_domain}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{contact.job_title || "-"}</TableCell>
                <TableCell className="max-w-[150px] truncate">{contact.location || "-"}</TableCell>
                <TableCell>{getStatusBadge(contact)}</TableCell>
                <TableCell>
                  {contact.last_contacted_at
                    ? new Date(contact.last_contacted_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
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

  const sentContacts = filteredContacts.filter((c) => c.last_contacted_at && !c.responded);
  const respondedContacts = filteredContacts.filter((c) => c.responded);

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
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredContacts.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentContacts.length})
          </TabsTrigger>
          <TabsTrigger value="responded">
            Responded ({respondedContacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {renderContactsTable(filteredContacts)}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {renderContactsTable(sentContacts)}
        </TabsContent>

        <TabsContent value="responded" className="mt-4">
          {renderContactsTable(respondedContacts)}
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
