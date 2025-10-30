import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EmailGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    company: string;
    job_title?: string;
    folder_id: string;
    linkedin_profile?: string;
  };
  template: {
    id: string;
    subject: string;
    body_html: string;
  };
  onEmailSent: () => void;
}

export const EmailGeneratorModal = ({ open, onOpenChange, contact, template, onEmailSent }: EmailGeneratorModalProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/\{\{First Name\}\}/gi, contact.first_name || contact.name.split(' ')[0] || '')
      .replace(/\{\{Last Name\}\}/gi, contact.last_name || contact.name.split(' ').slice(1).join(' ') || '')
      .replace(/\{\{Job Title\}\}/gi, contact.job_title || '')
      .replace(/\{\{Company Name\}\}/gi, contact.company || '')
      .replace(/\{\{name\}\}/g, contact.name)
      .replace(/\{\{email\}\}/g, contact.email)
      .replace(/\{\{company\}\}/g, contact.company);
  };

  const subject = replacePlaceholders(template.subject);
  const body = replacePlaceholders(template.body_html);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMarkAsSent = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current contact values to restore if undone
      const { data: currentContact } = await supabase
        .from("contacts")
        .select("last_contacted_at, last_template_id, last_sender_id")
        .eq("id", contact.id)
        .single();

      const previousValues = {
        last_contacted_at: currentContact?.last_contacted_at || null,
        last_template_id: currentContact?.last_template_id || null,
        last_sender_id: currentContact?.last_sender_id || null,
      };

      // Insert email record
      const { data: emailRecord, error: emailError } = await supabase
        .from("emails")
        .insert({
          contact_id: contact.id,
          template_id: template.id,
          folder_id: contact.folder_id,
          sender_id: user.id,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (emailError) throw emailError;

      // Update contact
      await supabase
        .from("contacts")
        .update({
          last_contacted_at: new Date().toISOString(),
          last_template_id: template.id,
          last_sender_id: user.id,
        })
        .eq("id", contact.id);

      // Show toast with undo action
      sonnerToast.success("Email marked as sent", {
        description: "The email has been logged successfully.",
        duration: 8000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              // Delete the email record
              await supabase
                .from("emails")
                .delete()
                .eq("id", emailRecord.id);

              // Restore previous contact values
              await supabase
                .from("contacts")
                .update(previousValues)
                .eq("id", contact.id);

              sonnerToast.success("Email send undone");
              onEmailSent(); // Refresh the data
            } catch (error: any) {
              sonnerToast.error("Failed to undo", {
                description: error.message,
              });
            }
          },
        },
      });

      onEmailSent();
      onOpenChange(false);
    } catch (error: any) {
      sonnerToast.error("Error", {
        description: error.message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Email</DialogTitle>
          <DialogDescription>
            Copy the email content and paste it into your email client
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {contact.linkedin_profile && (
            <div className="space-y-2">
              <Label>LinkedIn Profile</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-muted rounded-md text-sm truncate">
                  <a 
                    href={contact.linkedin_profile} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {contact.linkedin_profile}
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(contact.linkedin_profile, '_blank')}
                >
                  Open Profile
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded-md font-mono text-sm">
                {contact.email}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(contact.email, "email")}
              >
                {copied === "email" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded-md text-sm">
                {subject}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(subject, "subject")}
              >
                {copied === "subject" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <div className="relative">
              <Textarea
                value={body}
                readOnly
                rows={10}
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(body, "body")}
              >
                {copied === "body" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsSent} disabled={sending}>
              {sending ? "Marking..." : "Mark as Sent"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
