import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    name: string;
    email: string;
    company: string;
    folder_id: string;
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
  const { toast } = useToast();

  const replacePlaceholders = (text: string) => {
    return text
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

      await supabase.from("emails").insert({
        contact_id: contact.id,
        template_id: template.id,
        folder_id: contact.folder_id,
        sender_id: user.id,
        sent_at: new Date().toISOString(),
      });

      await supabase
        .from("contacts")
        .update({
          last_contacted_at: new Date().toISOString(),
          last_template_id: template.id,
          last_sender_id: user.id,
        })
        .eq("id", contact.id);

      toast({
        title: "Email marked as sent",
        description: "The email has been logged successfully.",
      });

      onEmailSent();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
