import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CheckCircle, Mail, Circle, Search, Edit, Trash, Phone, Users, Briefcase, DollarSign, Linkedin, Twitter, StickyNote } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { EditContactDialog } from "@/components/EditContactDialog";
import { AddContactDialog } from "@/components/AddContactDialog";
import { EmailGeneratorModal } from "@/components/EmailGeneratorModal";

type ContactStatus = 'not_sent' | 'sent' | 'responded' | 'called' | 'met_in_person' | 'pitched' | 'closed';
type Platform = 'email' | 'linkedin' | 'x';

export default function Contacts() {
  const { platform } = useParams<{ platform?: Platform }>();
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<any>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [statusTab, setStatusTab] = useState("all");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles").select("team_id").eq("user_id", user?.id).single();
      const teamId = profile?.team_id;

      const [{ data: contactsData }, { data: templatesData }, { data: profilesData }] = await Promise.all([
        supabase.from("contacts").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
        supabase.from("templates").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, name, email").eq("team_id", teamId),
      ]);
      setContacts(contactsData || []);
      setTemplates(templatesData || []);
      setProfiles(profilesData || []);
    } catch (error: any) {
      sonnerToast.error("Error loading contacts", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateContactStatus = async (contactId: string, newStatus: ContactStatus) => {
    try {
      await supabase.from("contacts").update({
        status: newStatus, responded: newStatus === 'responded',
      }).eq("id", contactId);
      loadData();
      sonnerToast.success("Status updated");
    } catch (error: any) {
      sonnerToast.error("Error", { description: error.message });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await supabase.from("contacts").delete().eq("id", contactId);
      sonnerToast.success("Contact deleted");
      loadData();
    } catch (error: any) {
      sonnerToast.error("Error", { description: error.message });
    } finally {
      setDeleteContactId(null);
    }
  };

  const handleGenerateEmail = (contact: any) => {
    if (!selectedTemplate) {
      sonnerToast.error("Select a template first");
      return;
    }
    setSelectedContact(contact);
    setEmailModalOpen(true);
  };

  const getStatusBadge = (status: ContactStatus) => {
    const cfg: Record<ContactStatus, { icon: any; className: string; label: string }> = {
      not_sent: { icon: Circle, className: 'bg-gray-500', label: 'Not Sent' },
      sent: { icon: Mail, className: 'bg-blue-500', label: 'Sent' },
      responded: { icon: CheckCircle, className: 'bg-green-500', label: 'Responded' },
      called: { icon: Phone, className: 'bg-purple-500', label: 'Called' },
      met_in_person: { icon: Users, className: 'bg-orange-500', label: 'Met in Person' },
      pitched: { icon: Briefcase, className: 'bg-yellow-500', label: 'Pitched' },
      closed: { icon: DollarSign, className: 'bg-emerald-600', label: 'Closed' },
    };
    const c = cfg[status]; const Icon = c.icon;
    return <Badge className={c.className}><Icon className="h-3 w-3 mr-1" />{c.label}</Badge>;
  };

  const platformLabel = (p: Platform) => p === 'email' ? 'Email' : p === 'linkedin' ? 'LinkedIn' : 'X';
  const platformIcon = (p: Platform) => {
    const Icon = p === 'email' ? Mail : p === 'linkedin' ? Linkedin : Twitter;
    return <Icon className="h-3 w-3 mr-1" />;
  };

  // Filter by platform from route
  let scopedContacts = contacts;
  if (platform) {
    scopedContacts = contacts.filter((c) => c.platform === platform);
  }

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    scopedContacts = scopedContacts.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.linkedin_profile?.toLowerCase().includes(q) ||
      c.x_handle?.toLowerCase().includes(q)
    );
  }

  // Filter by status tab
  const byStatus = (s: string) =>
    s === 'all' ? scopedContacts
    : s === 'responses' ? scopedContacts.filter((c) => ['responded','called','met_in_person','pitched','closed'].includes(c.status))
    : scopedContacts.filter((c) => c.status === s);

  const filtered = byStatus(statusTab);

  const getContactHandle = (c: any) => {
    if (c.platform === 'linkedin') return c.linkedin_profile || '-';
    if (c.platform === 'x') return c.x_handle || '-';
    return c.email || '-';
  };

  const title = platform ? `${platformLabel(platform)} Contacts` : "All Contacts";

  const getCreatorName = (userId?: string | null) => {
    if (!userId) return "—";
    const p = profiles.find((x) => x.user_id === userId);
    const source = p?.name || p?.email || "Unknown";
    return source.split(/[\s@.]+/).filter(Boolean)[0] || source;
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">Manage your outreach contacts</p>
        </div>
        <AddContactDialog defaultPlatform={platform || 'email'} onContactAdded={loadData} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, company, handle..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select template for outreach" /></SelectTrigger>
          <SelectContent>
            {templates.length === 0 && <div className="px-2 py-1 text-sm text-muted-foreground">No templates yet</div>}
            {templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({scopedContacts.length})</TabsTrigger>
          <TabsTrigger value="responses">Responses ({scopedContacts.filter(c => ['responded','called','met_in_person','pitched','closed'].includes(c.status)).length})</TabsTrigger>
          <TabsTrigger value="not_sent">Not Sent ({scopedContacts.filter(c => c.status === 'not_sent').length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({scopedContacts.filter(c => c.status === 'sent').length})</TabsTrigger>
          <TabsTrigger value="responded">Responded ({scopedContacts.filter(c => c.status === 'responded').length})</TabsTrigger>
          <TabsTrigger value="called">Called ({scopedContacts.filter(c => c.status === 'called').length})</TabsTrigger>
          <TabsTrigger value="met_in_person">Met ({scopedContacts.filter(c => c.status === 'met_in_person').length})</TabsTrigger>
          <TabsTrigger value="pitched">Pitched ({scopedContacts.filter(c => c.status === 'pitched').length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({scopedContacts.filter(c => c.status === 'closed').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {!platform && <TableHead>Platform</TableHead>}
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={platform ? 7 : 8} className="text-center text-muted-foreground py-8">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : filtered.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    {!platform && (
                      <TableCell>
                        <Badge variant="outline">{platformIcon(contact.platform)}{platformLabel(contact.platform)}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="max-w-[220px] truncate">{getContactHandle(contact)}</TableCell>
                    <TableCell>{contact.company || "-"}</TableCell>
                    <TableCell>{contact.job_title || "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="cursor-pointer">{getStatusBadge(contact.status || 'not_sent')}</div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background">
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'not_sent')}><Circle className="h-4 w-4 mr-2" />Not Sent</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'sent')}><Mail className="h-4 w-4 mr-2" />Sent</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'responded')}><CheckCircle className="h-4 w-4 mr-2" />Responded</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'called')}><Phone className="h-4 w-4 mr-2" />Called</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'met_in_person')}><Users className="h-4 w-4 mr-2" />Met in Person</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'pitched')}><Briefcase className="h-4 w-4 mr-2" />Pitched</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateContactStatus(contact.id, 'closed')}><DollarSign className="h-4 w-4 mr-2" />Closed</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCreatorName(contact.created_by)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleGenerateEmail(contact)} disabled={!selectedTemplate}>
                          Generate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setContactToEdit(contact); setEditContactOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteContactId(contact.id)}>
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
      </Tabs>

      {contactToEdit && (
        <EditContactDialog
          open={editContactOpen}
          onOpenChange={setEditContactOpen}
          contact={contactToEdit}
          onContactUpdated={loadData}
        />
      )}

      {selectedContact && selectedTemplate && (
        <EmailGeneratorModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          contact={selectedContact}
          template={templates.find((t) => t.id === selectedTemplate)!}
          onEmailSent={loadData}
        />
      )}

      <AlertDialog open={!!deleteContactId} onOpenChange={(o) => !o && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteContactId && handleDeleteContact(deleteContactId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
