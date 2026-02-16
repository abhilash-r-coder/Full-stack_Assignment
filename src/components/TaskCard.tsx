import { Task, Profile } from "@/lib/supabase-helpers";
import { Draggable } from "@hello-pangea/dnd";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Props = {
  task: Task;
  index: number;
  members: (Profile | null)[];
  onClick: () => void;
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  urgent: "Urgent",
};

export default function TaskCard({ task, index, members, onClick }: Props) {
  const assignee = members.find((m) => m?.id === task.assigned_to);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "task-card",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/30"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                `priority-badge-${task.priority}`
              )}
            >
              {priorityLabels[task.priority] || "Med"}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            {task.due_date ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            ) : (
              <span />
            )}

            {assignee ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="w-3 h-3" />
                {assignee.full_name || assignee.email}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </Draggable>
  );
}
