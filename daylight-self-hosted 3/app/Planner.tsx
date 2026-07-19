"use client";

import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "annual" | "monthly" | "weekly" | "daily";
type Task = { id: number; date: string; text: string; completed: boolean; completedAt: string | null; order: number };

const views: { id: View; label: string; glyph: string }[] = [
  { id: "annual", label: "Year", glyph: "◫" },
  { id: "monthly", label: "Month", glyph: "▦" },
  { id: "weekly", label: "Week", glyph: "Ⅲ" },
  { id: "daily", label: "Day", glyph: "○" },
];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayClass = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function atNoon(date: Date) { const next = new Date(date); next.setHours(12, 0, 0, 0); return next; }
function fromISO(value: string) { return atNoon(new Date(`${value}T12:00:00`)); }
function iso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(date: Date, count: number) { const next = atNoon(date); next.setDate(next.getDate() + count); return next; }
function startOfWeek(date: Date) { const shift = (date.getDay() + 6) % 7; return addDays(date, -shift); }
function startOfMonth(date: Date) { return atNoon(new Date(date.getFullYear(), date.getMonth(), 1)); }
function sameDay(a: Date, b: Date) { return iso(a) === iso(b); }
function monthCells(date: Date) {
  const first = startOfMonth(date);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
}

export default function Planner() {
  const today = useMemo(() => atNoon(new Date()), []);
  const [cursor, setCursor] = useState(today);
  const [view, setView] = useState<View>("weekly");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newFor, setNewFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"loading" | "saved" | "offline">("loading");
  const swipeStart = useRef<number | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 700px)").matches) setView("daily");
    fetch("/api/tasks").then(async (response) => {
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json() as { tasks: Task[] };
      setTasks(data.tasks);
      setSaveState("saved");
    }).catch(() => setSaveState("offline"));
  }, []);

  const tasksFor = (date: Date | string) => {
    const key = typeof date === "string" ? date : iso(date);
    return tasks.filter((task) => task.date === key).sort((a, b) => a.order - b.order);
  };
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)), [cursor]);

  const persist = async (method: string, body?: unknown, suffix = "") => {
    setSaveState("loading");
    try {
      const response = await fetch(`/api/tasks${suffix}`, {
        method, headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error("Unable to save");
      setSaveState("saved");
      return await response.json();
    } catch {
      setSaveState("offline");
      return null;
    }
  };

  const navigate = (direction: number) => {
    const next = new Date(cursor);
    if (view === "annual") next.setFullYear(next.getFullYear() + direction);
    if (view === "monthly") next.setMonth(next.getMonth() + direction);
    if (view === "weekly") next.setDate(next.getDate() + 7 * direction);
    if (view === "daily") next.setDate(next.getDate() + direction);
    setCursor(atNoon(next));
  };

  const title = view === "annual" ? String(cursor.getFullYear())
    : view === "monthly" ? cursor.toLocaleDateString("en", { month: "long", year: "numeric" })
    : view === "weekly" ? `${week[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – ${week[6].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`
    : cursor.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });

  const selectView = (next: View) => { setView(next); setMenuOpen(false); };

  const addTask = async (event: FormEvent, date: string) => {
    event.preventDefault();
    const text = draft.trim(); if (!text) return;
    const temp: Task = { id: -Date.now(), date, text, completed: false, completedAt: null, order: tasksFor(date).length };
    setTasks((current) => [...current, temp]); setDraft(""); setNewFor(null);
    const data = await persist("POST", temp) as { task?: Task } | null;
    if (data?.task) setTasks((current) => current.map((task) => task.id === temp.id ? data.task! : task));
  };

  const toggleTask = (task: Task) => {
    const completed = !task.completed;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed, completedAt: completed ? new Date().toISOString() : null } : item));
    if (task.id > 0) void persist("PATCH", { id: task.id, completed });
  };

  const commitEdit = (task: Task) => {
    const text = editText.trim(); setEditing(null);
    if (!text || text === task.text) return;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, text } : item));
    if (task.id > 0) void persist("PATCH", { id: task.id, text });
  };

  const deleteTask = (task: Task) => {
    setTasks((current) => current.filter((item) => item.id !== task.id));
    if (task.id > 0) void persist("DELETE", undefined, `?id=${task.id}`);
  };

  const dropTask = (event: DragEvent, target: Task) => {
    event.preventDefault();
    const source = tasks.find((task) => task.id === dragging);
    setDragging(null);
    if (!source || source.date !== target.date || source.id === target.id) return;
    const list = tasksFor(target.date).filter((task) => task.id !== source.id);
    list.splice(list.findIndex((task) => task.id === target.id), 0, source);
    const orders = new Map(list.map((task, index) => [task.id, index]));
    setTasks((current) => current.map((task) => orders.has(task.id) ? { ...task, order: orders.get(task.id)! } : task));
    list.filter((task) => task.id > 0).forEach((task, index) => void persist("PATCH", { id: task.id, order: index }));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = href; link.download = `daylight-planner-${iso(today)}.json`; link.click(); URL.revokeObjectURL(href);
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as { tasks?: Task[] };
      if (!Array.isArray(data.tasks)) throw new Error("Invalid file");
      setTasks(data.tasks);
      const saved = await persist("PUT", { tasks: data.tasks }) as { tasks?: Task[] } | null;
      if (saved?.tasks) setTasks(saved.tasks);
    } catch { setSaveState("offline"); }
    event.target.value = "";
  };

  const renderTask = (task: Task, compact = false) => (
    <div key={task.id} className={`task-row ${task.completed ? "is-done" : ""} ${dragging === task.id ? "is-dragging" : ""}`} draggable
      onDragStart={() => setDragging(task.id)} onDragEnd={() => setDragging(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropTask(event, task)}>
      <button className="drag-handle" aria-label={`Reorder ${task.text}`}>⠿</button>
      <label className="task-check">
        <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)} />
        <span aria-hidden="true" />
      </label>
      {editing === task.id ? (
        <input className="task-edit" value={editText} autoFocus onChange={(event) => setEditText(event.target.value)}
          onBlur={() => commitEdit(task)} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") commitEdit(task); if (event.key === "Escape") setEditing(null);
          }} aria-label="Edit task" />
      ) : (
        <button className="task-text" onDoubleClick={() => { setEditing(task.id); setEditText(task.text); }}
          onClick={() => compact && toggleTask(task)}>{task.text}</button>
      )}
      <div className="task-actions">
        <button onClick={() => { setEditing(task.id); setEditText(task.text); }} aria-label={`Edit ${task.text}`}>Edit</button>
        <button onClick={() => deleteTask(task)} aria-label={`Delete ${task.text}`}>Delete</button>
      </div>
    </div>
  );

  const addForm = (date: string) => newFor === date ? (
    <form className="add-form" onSubmit={(event) => addTask(event, date)}>
      <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What would feel good to finish?" aria-label="New task" />
      <button type="submit" aria-label="Add task">Add</button>
    </form>
  ) : <button className="add-task" onClick={() => { setNewFor(date); setDraft(""); }}>＋ <span>Add task</span></button>;

  const DayList = ({ date, daily = false }: { date: Date; daily?: boolean }) => {
    const list = tasksFor(date); const done = list.filter((task) => task.completed).length;
    return (
      <section className={`day-card day-${dayClass[date.getDay()]} ${sameDay(date, today) ? "is-today" : ""} ${daily ? "day-focus" : ""}`}>
        <header className="day-heading">
          <button onClick={() => { setCursor(date); setView("daily"); }} aria-label={`Open ${date.toDateString()}`}>
            <span>{dayNames[date.getDay()]}</span><strong>{date.getDate()}</strong>
          </button>
          <span className="day-count">{list.length ? `${done}/${list.length}` : "Open"}</span>
        </header>
        <div className="task-list">{list.map((task) => renderTask(task, !daily))}</div>
        {addForm(iso(date))}
      </section>
    );
  };

  const Monthly = () => {
    const cells = monthCells(cursor);
    return <section className="month-view" aria-label={title}>
      <div className="weekday-labels">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="month-grid">{cells.map((date) => {
        const list = tasksFor(date); const inMonth = date.getMonth() === cursor.getMonth();
        return <button key={iso(date)} className={`month-day day-${dayClass[date.getDay()]} ${inMonth ? "" : "outside"} ${sameDay(date, today) ? "is-today" : ""}`}
          onClick={() => { setCursor(date); setView("daily"); }}>
          <span className="month-number">{date.getDate()}</span>
          {list.slice(0, 3).map((task) => <span key={task.id} className={`month-task ${task.completed ? "is-done" : ""}`}>{task.text}</span>)}
          {list.length > 3 && <span className="more-tasks">+{list.length - 3} more</span>}
        </button>;
      })}</div>
    </section>;
  };

  const MiniMonth = ({ date, interactive = false }: { date: Date; interactive?: boolean }) => {
    const first = startOfMonth(date); const offset = (first.getDay() + 6) % 7;
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return <div className={interactive ? "mini-calendar" : "year-month"}>
      <h3>{date.toLocaleDateString("en", { month: "long" })}</h3>
      <div className="mini-days">{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <span key={`${day}-${i}`} className="mini-weekday">{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const item = atNoon(new Date(date.getFullYear(), date.getMonth(), i + 1)); const list = tasksFor(item);
          return interactive ? <button key={i} className={`${sameDay(item, today) ? "is-today" : ""} ${list.length ? "has-tasks" : ""}`}
            onClick={() => { setCursor(item); setView("daily"); }}>{i + 1}</button>
            : <button key={i} className={`day-${dayClass[item.getDay()]} ${sameDay(item, today) ? "is-today" : ""}`}
              onClick={() => { setCursor(item); setView("daily"); }}><span>{i + 1}</span>{list.length > 0 && <i />}</button>;
        })}
      </div>
    </div>;
  };

  return (
    <div className="planner-shell">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <aside className={`sidebar glass ${menuOpen ? "is-open" : ""}`}>
        <div className="brand"><span className="brand-mark">D</span><div><strong>Daylight</strong><small>Your time, softly held.</small></div></div>
        <nav className="view-nav" aria-label="Planner views">{views.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><span>{item.glyph}</span>{item.label}</button>)}</nav>
        <div className="sidebar-calendar"><div className="calendar-title"><button onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}>‹</button><strong>{cursor.toLocaleDateString("en", { month: "long", year: "numeric" })}</strong><button onClick={() => setCursor(addDays(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1), 0))}>›</button></div><MiniMonth date={cursor} interactive /></div>
        <div className="sidebar-spacer" />
        <div className="data-actions">
          <button onClick={exportData}>⇩ <span>Export a backup</span></button>
          <button onClick={() => importRef.current?.click()}>⇧ <span>Import a backup</span></button>
          <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={importData} />
          <form action="/api/auth/logout" method="post"><button type="submit">↪ <span>Lock planner</span></button></form>
        </div>
        <div className="privacy"><span>⌁</span><div><strong>Private space</strong><small>{saveState === "saved" ? "All changes saved" : saveState === "loading" ? "Saving…" : "Preview mode"}</small></div></div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}

      <main className="workspace">
        <header className="topbar glass">
          <button className="round-control menu-control" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
          <div className="range-title"><span>{view}</span><h1>{title}</h1></div>
          <div className="date-controls"><button className="today-control" onClick={() => setCursor(today)}>Today</button><div className="stepper"><button onClick={() => navigate(-1)} aria-label={`Previous ${view}`}>‹</button><button onClick={() => navigate(1)} aria-label={`Next ${view}`}>›</button></div></div>
        </header>

        <div className="content">
          {view === "weekly" && <div className="week-board">{week.map((date) => <DayList key={iso(date)} date={date} />)}</div>}
          {view === "daily" && <div className="daily-wrap" onTouchStart={(event) => { swipeStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (swipeStart.current === null) return; const delta = event.changedTouches[0].clientX - swipeStart.current; if (Math.abs(delta) > 60) navigate(delta < 0 ? 1 : -1); swipeStart.current = null; }}><div className={`daily-aura day-${dayClass[cursor.getDay()]}`} aria-hidden="true" /><div className="daily-intro"><span>{sameDay(cursor, today) ? "Today" : cursor.toLocaleDateString("en", { weekday: "long" })}</span><h2>{cursor.getDate()}</h2><p>{tasksFor(cursor).length ? "A little room for what matters." : "A clear day. Add only what feels useful."}</p></div><DayList date={cursor} daily /></div>}
          {view === "monthly" && <Monthly />}
          {view === "annual" && <section className="year-view" aria-label={`${cursor.getFullYear()} calendar`}>{Array.from({ length: 12 }, (_, month) => <MiniMonth key={month} date={atNoon(new Date(cursor.getFullYear(), month, 1))} />)}</section>}
        </div>
      </main>

      <nav className="mobile-tabs glass" aria-label="Planner views">{views.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => selectView(item.id)}><span>{item.glyph}</span><small>{item.label}</small></button>)}</nav>
    </div>
  );
}
