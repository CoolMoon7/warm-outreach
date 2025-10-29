import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Users, Mail, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FolderCardProps {
  id: string;
  name: string;
  description?: string;
  contactsCount: number;
  sentCount: number;
  responseRate: number;
}

export const FolderCard = ({ id, name, description, contactsCount, sentCount, responseRate }: FolderCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/folders/${id}`)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{name}</CardTitle>
          </div>
        </div>
        {description && (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center">
            <Users className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="font-semibold">{contactsCount}</span>
            <span className="text-xs text-muted-foreground">Contacts</span>
          </div>
          <div className="flex flex-col items-center">
            <Mail className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="font-semibold">{sentCount}</span>
            <span className="text-xs text-muted-foreground">Sent</span>
          </div>
          <div className="flex flex-col items-center">
            <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="font-semibold">{responseRate}%</span>
            <span className="text-xs text-muted-foreground">Response</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
