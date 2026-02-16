import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchLists, fetchTasks, fetchBoardMembers,
  createList, createTask, deleteList,
  updateTask, logActivity, addBoardMember,
  searchTasks, type Task, type List, type Profile,
} from "@/lib/supabase-helpers";
import { useAuth } from "@/hooks/useAuth";
import TaskCard from "@/components/TaskCard";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import ActivitySidebar from "@/components/ActivitySidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Search, Activity, Users, X,
} from "lucide-react";

export default function BoardView() {
  const { id: boardId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newListName, setNewListName] = useState("");
  const [addingTaskToList, setAddingTaskToList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: lists = [] } = useQuery({
    queryKey: ["lists", boardId],
    queryFn: () => fetchLists(boardId!),
    enabled: !!boardId,
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", boardId, searchQuery],
    queryFn: () =>
      searchQuery ? searchTasks(boardId!, searchQuery) : fetchTasks(boardId!),
    enabled: !!boardId,
  });

  const { data: membersData = [] } = useQuery({
    queryKey: ["members", boardId],
    queryFn: () => fetchBoardMembers(boardId!),
    enabled: !!boardId,
  });

  const members: Profile[] = membersData
    .map((m: any) => m.profiles)
    .filter(Boolean);

  // Real-time subscriptions
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-${boardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${boardId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lists", filter: `board_id=eq.${boardId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs", filter: `board_id=eq.${boardId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["activity", boardId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [boardId, queryClient]);

  const getTasksForList = useCallback(
    (listId: string) => tasks.filter((t) => t.list_id === listId).sort((a, b) => a.position - b.position),
    [tasks]
  );

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !boardId) return;

    const taskId = result.draggableId;
    const newListId = result.destination.droppableId;
    const newPos = result.destination.index;

    await updateTask(taskId, { list_id: newListId, position: newPos });
    await logActivity(boardId, "moved", "task", undefined, taskId);
    refetchTasks();
  };

  const handleAddList = async () => {
    if (!newListName.trim() || !boardId) return;
    await createList(boardId, newListName.trim(), lists.length);
    await logActivity(boardId, "created", "list", newListName.trim());
    setNewListName("");
    queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
  };

  const handleAddTask = async (listId: string) => {
    if (!newTaskTitle.trim() || !boardId) return;
    const listTasks = getTasksForList(listId);
    await createTask(listId, boardId, newTaskTitle.trim(), listTasks.length);
    await logActivity(boardId, "created", "task", newTaskTitle.trim());
    setNewTaskTitle("");
    setAddingTaskToList(null);
    refetchTasks();
  };

  const handleDeleteList = async (listId: string) => {
    if (!boardId) return;
    await deleteList(listId);
    await logActivity(boardId, "deleted", "list");
    queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !boardId) return;
    try {
      await addBoardMember(boardId, inviteEmail.trim());
      await logActivity(boardId, "assigned", "member", inviteEmail.trim());
      setInviteEmail("");
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["members", boardId] });
      toast({ title: "Member added!" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-semibold text-lg truncate">Board</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48 h-8 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Users className="w-4 h-4 mr-1" />Invite</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <Button onClick={handleInvite} className="w-full">Add Member</Button>
                {members.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Current members</Label>
                    <div className="mt-2 space-y-1">
                      {members.map((m) => (
                        <div key={m.id} className="text-sm px-2 py-1 rounded bg-muted">
                          {m.full_name || m.email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={activityOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setActivityOpen(!activityOpen)}
          >
            <Activity className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Board Content */}
      <div className="flex flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="flex-1">
            <div className="flex gap-4 p-4 h-full items-start min-w-max">
              {lists.map((list) => (
                <div key={list.id} className="kanban-column flex flex-col max-h-[calc(100vh-8rem)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{list.name}</h3>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {getTasksForList(list.id).length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteList(list.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <Droppable droppableId={list.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-2 min-h-[40px]"
                      >
                        {getTasksForList(list.id).map((task, idx) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={idx}
                            members={members}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {addingTaskToList === list.id ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTask(list.id)}
                        autoFocus
                        className="text-sm"
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="flex-1" onClick={() => handleAddTask(list.id)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingTaskToList(null); setNewTaskTitle(""); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full justify-start text-muted-foreground"
                      onClick={() => setAddingTaskToList(list.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />Add task
                    </Button>
                  )}
                </div>
              ))}

              {/* Add list column */}
              <div className="min-w-[280px]">
                <div className="flex gap-2">
                  <Input
                    placeholder="New list name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={handleAddList} disabled={!newListName.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DragDropContext>

        <ActivitySidebar boardId={boardId!} open={activityOpen} onClose={() => setActivityOpen(false)} />
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        members={members}
        onUpdated={() => refetchTasks()}
      />
    </div>
  );
}
