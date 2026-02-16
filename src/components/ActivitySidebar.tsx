import { useQuery } from "@tanstack/react-query";
import { fetchActivityLogs } from "@/lib/supabase-helpers";
import { formatDistanceToNow } from "date-fns";
import { Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  boardId: string;
  open: boolean;
  onClose: () => void;
};

const actionIcons: Record<string, string> = {
  created: "🆕",
  updated: "✏️",
  deleted: "🗑️",
  moved: "↔️",
  assigned: "👤",
};

export default function ActivitySidebar({ boardId, open, onClose }: Props) {
  const { data: logs = [] } = useQuery({
    queryKey: ["activity", boardId],
    queryFn: () => fetchActivityLogs(boardId),
    refetchInterval: 5000,
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="w-80 border-l bg-card h-full flex flex-col shrink-0">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Activity</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="flex gap-2 text-sm animate-fade-in">
                <span className="shrink-0 mt-0.5">{actionIcons[log.action] || "📋"}</span>
                <div className="min-w-0">
                  <p className="leading-snug">
                    <span className="font-medium">{log.profiles?.full_name || log.profiles?.email || "Someone"}</span>
                    {" "}{log.action} {log.entity_type}
                    {log.entity_name && <span className="font-medium"> "{log.entity_name}"</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
