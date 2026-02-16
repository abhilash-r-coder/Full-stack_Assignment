import { supabase } from "@/integrations/supabase/client";

export type Board = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type List = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  list_id: string;
  board_id: string;
  title: string;
  description: string | null;
  position: number;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type BoardMember = {
  id: string;
  board_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

// Board operations
export async function fetchBoards() {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Board[];
}

export async function createBoard(name: string, description?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  
  const { data, error } = await supabase
    .from("boards")
    .insert({ name, description, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Board;
}

export async function deleteBoard(id: string) {
  const { error } = await supabase.from("boards").delete().eq("id", id);
  if (error) throw error;
}

// List operations
export async function fetchLists(boardId: string) {
  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("board_id", boardId)
    .order("position");
  if (error) throw error;
  return data as List[];
}

export async function createList(boardId: string, name: string, position: number) {
  const { data, error } = await supabase
    .from("lists")
    .insert({ board_id: boardId, name, position })
    .select()
    .single();
  if (error) throw error;
  return data as List;
}

export async function deleteList(id: string) {
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw error;
}

export async function updateList(id: string, updates: Partial<Pick<List, "name" | "position">>) {
  const { error } = await supabase.from("lists").update(updates).eq("id", id);
  if (error) throw error;
}

// Task operations
export async function fetchTasks(boardId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId)
    .order("position");
  if (error) throw error;
  return data as Task[];
}

export async function createTask(listId: string, boardId: string, title: string, position: number) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ list_id: listId, board_id: boardId, title, position, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Pick<Task, "title" | "description" | "list_id" | "position" | "priority" | "due_date" | "assigned_to">>) {
  const { error } = await supabase.from("tasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// Search tasks
export async function searchTasks(boardId: string, query: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId)
    .ilike("title", `%${query}%`)
    .order("position");
  if (error) throw error;
  return data as Task[];
}

// Board members
export async function fetchBoardMembers(boardId: string) {
  const { data, error } = await supabase
    .from("board_members")
    .select("*, profiles:user_id(id, email, full_name, avatar_url)")
    .eq("board_id", boardId);
  if (error) throw error;
  return data;
}

export async function addBoardMember(boardId: string, email: string) {
  // Find user by email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("User not found with that email");

  const { error } = await supabase
    .from("board_members")
    .insert({ board_id: boardId, user_id: profile.id });
  if (error) throw error;
}

// Activity logs
export async function fetchActivityLogs(boardId: string, limit = 50) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*, profiles:user_id(full_name, email)")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function logActivity(
  boardId: string,
  action: string,
  entityType: string,
  entityName?: string,
  entityId?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("activity_logs").insert({
    board_id: boardId,
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_name: entityName,
    entity_id: entityId,
  });
}
