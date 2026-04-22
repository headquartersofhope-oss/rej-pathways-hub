import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Mail, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export default function Messages() {
  const { user } = useOutletContext();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 50),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <PageHeader
        title="Messages"
        subtitle="Alerts, reminders, and direct messages"
        icon={MessageSquare}
        actions={
          <Button className="gap-2"><Plus className="w-4 h-4" /> New Message</Button>
        }
      />

      {messages.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Mail className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No messages yet</p>
          <p className="text-sm text-muted-foreground mt-1">Messages from staff, system alerts, and reminders will appear here</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <Card key={msg.id} className={`p-4 hover:shadow-sm transition-shadow ${!msg.is_read ? 'border-l-2 border-l-primary' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${msg.is_read ? 'bg-muted' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.subject && <p className="font-medium text-sm truncate">{msg.subject}</p>}
                    <Badge className={`text-[10px] flex-shrink-0 ${priorityColors[msg.priority] || ''}`}>
                      {msg.priority || 'normal'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {msg.type || 'direct'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{msg.body}</p>
                  {msg.created_date && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(msg.created_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}