import { all, getDatabase, run } from "../../../lib/database";
import { isAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TaskRow = { id: number; date: string; text: string; completed: number; completed_at: string | null; position: number };
type TaskInput = { id?: number; date?: string; text?: string; completed?: boolean; completedAt?: string | null; order?: number };

function validDate(value: unknown): value is string { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value); }
function jsonTask(row: TaskRow) {
  return { id: row.id, date: row.date, text: row.text, completed: Boolean(row.completed), completedAt: row.completed_at, order: row.position };
}
function rows() {
  return all<TaskRow>("SELECT id, date, text, completed, completed_at, position FROM tasks ORDER BY date, position, id").map(jsonTask);
}
async function authorized() { return await isAuthenticated(); }

export async function GET() {
  if (!(await authorized())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ tasks: rows() }); }
  catch { return Response.json({ error: "The local database could not be opened." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as TaskInput;
  const text = input.text?.trim() ?? "";
  if (!text || !validDate(input.date)) return Response.json({ error: "A date and task are required." }, { status: 400 });
  const result = run("INSERT INTO tasks (date, text, completed, completed_at, position, created_at) VALUES (?, ?, 0, NULL, ?, ?)",
    input.date, text, Number.isFinite(input.order) ? input.order! : 0, new Date().toISOString());
  const [task] = all<TaskRow>("SELECT id, date, text, completed, completed_at, position FROM tasks WHERE id = ?", Number(result.lastInsertRowid));
  return Response.json({ task: jsonTask(task) }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = await request.json() as TaskInput;
  if (!Number.isInteger(input.id)) return Response.json({ error: "A task id is required." }, { status: 400 });
  const current = all<TaskRow>("SELECT id, date, text, completed, completed_at, position FROM tasks WHERE id = ?", input.id!)[0];
  if (!current) return Response.json({ error: "Task not found." }, { status: 404 });
  const date = validDate(input.date) ? input.date : current.date;
  const text = typeof input.text === "string" && input.text.trim() ? input.text.trim() : current.text;
  const completed = typeof input.completed === "boolean" ? input.completed : Boolean(current.completed);
  const completedAt = typeof input.completed === "boolean" ? (completed ? new Date().toISOString() : null) : current.completed_at;
  const order = typeof input.order === "number" ? input.order : current.position;
  run("UPDATE tasks SET date = ?, text = ?, completed = ?, completed_at = ?, position = ? WHERE id = ?",
    date, text, completed ? 1 : 0, completedAt, order, input.id!);
  const updated = all<TaskRow>("SELECT id, date, text, completed, completed_at, position FROM tasks WHERE id = ?", input.id!)[0];
  return Response.json({ task: jsonTask(updated) });
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "A task id is required." }, { status: 400 });
  run("DELETE FROM tasks WHERE id = ?", id);
  return Response.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await authorized())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { tasks?: TaskInput[] };
  const imported = Array.isArray(payload.tasks) ? payload.tasks : [];
  const clean = imported.filter((task) => validDate(task.date) && task.text?.trim());
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM tasks");
    const insert = db.prepare("INSERT INTO tasks (date, text, completed, completed_at, position, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    clean.forEach((task, index) => insert.run(task.date!, task.text!.trim(), task.completed ? 1 : 0,
      task.completed ? task.completedAt ?? new Date().toISOString() : null,
      typeof task.order === "number" ? task.order : index, new Date().toISOString()));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return Response.json({ tasks: rows() });
}
