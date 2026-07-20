"use strict";

const STORAGE_KEY = "daylight.pages.tasks.v1";
const LOCK_KEY = "daylight.pages.lock.v1";
const SESSION_KEY = "daylight.pages.unlocked";
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayClass = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const views = [
  { id: "annual", label: "Year", glyph: "◫" },
  { id: "monthly", label: "Month", glyph: "▦" },
  { id: "weekly", label: "Week", glyph: "Ⅲ" },
  { id: "daily", label: "Day", glyph: "○" },
];

const lockScreen = document.querySelector("#lock-screen");
const planner = document.querySelector("#planner");
const lockForm = document.querySelector("#lock-form");
const passwordInput = document.querySelector("#lock-password");
const confirmInput = document.querySelector("#lock-confirm");
const confirmWrap = document.querySelector("#confirm-wrap");
const lockError = document.querySelector("#lock-error");
const lockTitle = document.querySelector("#lock-title");
const lockCopy = document.querySelector("#lock-copy");
const passwordLabel = document.querySelector("#password-label");
const lockSubmit = document.querySelector("#lock-submit");
const taskDialog = document.querySelector("#task-dialog");
const taskForm = document.querySelector("#task-form");
const taskText = document.querySelector("#task-text");
const taskDate = document.querySelector("#task-date");
const taskId = document.querySelector("#task-id");
const importFile = document.querySelector("#import-file");
const toast = document.querySelector("#toast");

const today = atNoon(new Date());
const state = {
  cursor: today,
  view: matchMedia("(max-width: 700px)").matches ? "daily" : "weekly",
  tasks: readTasks(),
  menuOpen: false,
  draggingId: null,
  lockMode: "setup",
};

function atNoon(date) { const next = new Date(date); next.setHours(12, 0, 0, 0); return next; }
function fromISO(value) { return atNoon(new Date(`${value}T12:00:00`)); }
function iso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(date, count) { const next = atNoon(date); next.setDate(next.getDate() + count); return next; }
function startOfWeek(date) { return addDays(date, -((date.getDay() + 6) % 7)); }
function startOfMonth(date) { return atNoon(new Date(date.getFullYear(), date.getMonth(), 1)); }
function sameDay(a, b) { return iso(a) === iso(b); }
function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function makeId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function readTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data.filter(validTask).map(normalizeTask) : [];
  } catch { return []; }
}
function validTask(task) { return task && typeof task.text === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.date || ""); }
function normalizeTask(task, index = 0) {
  return {
    id: String(task.id || makeId()), date: task.date, text: task.text.trim().slice(0, 240),
    completed: Boolean(task.completed), completedAt: task.completedAt || null,
    order: Number.isFinite(task.order) ? task.order : index,
  };
}
function saveTasks(message = "Saved in this browser") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  const status = document.querySelector("#save-status");
  if (status) status.textContent = message;
}
function tasksFor(date) {
  const key = typeof date === "string" ? date : iso(date);
  return state.tasks.filter((task) => task.date === key).sort((a, b) => a.order - b.order);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function base64ToBytes(value) { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
async function derivePassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 180000, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}
async function makeLock(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  return { version: 1, salt: bytesToBase64(salt), hash: bytesToBase64(hash), iterations: 180000 };
}
async function verifyLock(password, config) {
  try {
    const actual = await derivePassword(password, base64ToBytes(config.salt));
    const expected = base64ToBytes(config.hash);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    actual.forEach((byte, index) => { difference |= byte ^ expected[index]; });
    return difference === 0;
  } catch { return false; }
}
function readLock() {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "null"); }
  catch { return null; }
}
function configureLockScreen(mode) {
  state.lockMode = mode;
  lockError.textContent = "";
  lockForm.reset();
  const setup = mode === "setup" || mode === "change";
  confirmWrap.hidden = !setup;
  confirmInput.required = setup;
  passwordInput.minLength = setup ? 8 : 1;
  passwordInput.autocomplete = setup ? "new-password" : "current-password";
  passwordLabel.textContent = setup ? "New password" : "Password";
  lockTitle.textContent = mode === "setup" ? "Create your local lock." : mode === "change" ? "Choose a new local lock." : "Welcome back.";
  lockCopy.textContent = setup
    ? "Choose a password for this browser. It keeps casual visitors out, but it is not server-grade security."
    : "Enter the password saved in this browser to open your planner.";
  lockSubmit.textContent = mode === "setup" ? "Create lock & open" : mode === "change" ? "Save new lock" : "Open Daylight";
  planner.hidden = true;
  lockScreen.hidden = false;
  setTimeout(() => passwordInput.focus(), 0);
}
function openPlanner() {
  sessionStorage.setItem(SESSION_KEY, "yes");
  lockScreen.hidden = true;
  planner.hidden = false;
  render();
}
function lockPlanner() {
  sessionStorage.removeItem(SESSION_KEY);
  state.menuOpen = false;
  configureLockScreen("unlock");
}

lockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  lockError.textContent = "";
  lockSubmit.disabled = true;
  const password = passwordInput.value;
  try {
    if (state.lockMode === "unlock") {
      if (!(await verifyLock(password, readLock()))) {
        lockError.textContent = "That password did not match.";
        return;
      }
      openPlanner();
      return;
    }
    if (password.length < 8) { lockError.textContent = "Use at least 8 characters."; return; }
    if (password !== confirmInput.value) { lockError.textContent = "The passwords did not match."; return; }
    localStorage.setItem(LOCK_KEY, JSON.stringify(await makeLock(password)));
    openPlanner();
  } finally { lockSubmit.disabled = false; }
});

document.querySelector("#reset-local").addEventListener("click", () => {
  if (!confirm("Erase the lock and every task stored by Daylight in this browser? This cannot be undone without an exported backup.")) return;
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  state.tasks = [];
  configureLockScreen("setup");
});

function navigate(direction) {
  const next = new Date(state.cursor);
  if (state.view === "annual") next.setFullYear(next.getFullYear() + direction);
  if (state.view === "monthly") next.setMonth(next.getMonth() + direction);
  if (state.view === "weekly") next.setDate(next.getDate() + 7 * direction);
  if (state.view === "daily") next.setDate(next.getDate() + direction);
  state.cursor = atNoon(next);
  render();
}
function titleForView() {
  const week = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(state.cursor), index));
  if (state.view === "annual") return String(state.cursor.getFullYear());
  if (state.view === "monthly") return state.cursor.toLocaleDateString("en", { month: "long", year: "numeric" });
  if (state.view === "weekly") return `${week[0].toLocaleDateString("en", { month: "short", day: "numeric" })} – ${week[6].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
  return state.cursor.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
}

function taskHTML(task) {
  return `<div class="task-row ${task.completed ? "is-done" : ""}" draggable="true" data-task-id="${escapeHTML(task.id)}">
    <button class="drag-handle" type="button" aria-label="Reorder ${escapeHTML(task.text)}">⠿</button>
    <label class="task-check"><input type="checkbox" data-action="toggle-task" data-id="${escapeHTML(task.id)}" ${task.completed ? "checked" : ""}><span aria-hidden="true"></span></label>
    <button class="task-text" type="button" data-action="edit-task" data-id="${escapeHTML(task.id)}">${escapeHTML(task.text)}</button>
    <div class="task-actions"><button type="button" data-action="edit-task" data-id="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.text)}">Edit</button><button type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}" aria-label="Delete ${escapeHTML(task.text)}">Delete</button></div>
  </div>`;
}
function dayCardHTML(date, daily = false) {
  const list = tasksFor(date);
  const done = list.filter((task) => task.completed).length;
  return `<section class="day-card day-${dayClass[date.getDay()]} ${sameDay(date, today) ? "is-today" : ""} ${daily ? "day-focus" : ""}">
    <header class="day-heading"><button type="button" data-action="select-date" data-date="${iso(date)}" aria-label="Open ${escapeHTML(date.toDateString())}"><span>${dayNames[date.getDay()]}</span><strong>${date.getDate()}</strong></button><span class="day-count">${list.length ? `${done}/${list.length}` : "Open"}</span></header>
    <div class="task-list">${list.map(taskHTML).join("")}</div>
    <button class="add-task" type="button" data-action="add-task" data-date="${iso(date)}">＋ <span>Add task</span></button>
  </section>`;
}
function miniMonthHTML(date, interactive) {
  const first = startOfMonth(date);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: offset }, () => "<span></span>").join("");
  const buttons = Array.from({ length: days }, (_, index) => {
    const item = atNoon(new Date(date.getFullYear(), date.getMonth(), index + 1));
    const hasTasks = tasksFor(item).length > 0;
    if (interactive) return `<button type="button" class="${sameDay(item, today) ? "is-today" : ""} ${hasTasks ? "has-tasks" : ""}" data-action="select-date" data-date="${iso(item)}">${index + 1}</button>`;
    return `<button type="button" class="day-${dayClass[item.getDay()]} ${sameDay(item, today) ? "is-today" : ""}" data-action="select-date" data-date="${iso(item)}"><span>${index + 1}</span>${hasTasks ? "<i></i>" : ""}</button>`;
  }).join("");
  return `<div class="${interactive ? "mini-calendar" : "year-month"}">${interactive ? "" : `<h3>${date.toLocaleDateString("en", { month: "long" })}</h3>`}<div class="mini-days">${["M", "T", "W", "T", "F", "S", "S"].map((day) => `<span class="mini-weekday">${day}</span>`).join("")}${blanks}${buttons}</div></div>`;
}
function monthlyHTML() {
  const first = startOfMonth(state.cursor);
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => addDays(first, index - offset));
  return `<section class="month-view" aria-label="${escapeHTML(titleForView())}"><div class="weekday-labels">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<span>${day}</span>`).join("")}</div><div class="month-grid">${cells.map((date) => {
    const list = tasksFor(date);
    return `<button type="button" class="month-day day-${dayClass[date.getDay()]} ${date.getMonth() === state.cursor.getMonth() ? "" : "outside"} ${sameDay(date, today) ? "is-today" : ""}" data-action="select-date" data-date="${iso(date)}"><span class="month-number">${date.getDate()}</span>${list.slice(0, 3).map((task) => `<span class="month-task ${task.completed ? "is-done" : ""}">${escapeHTML(task.text)}</span>`).join("")}${list.length > 3 ? `<span class="more-tasks">+${list.length - 3} more</span>` : ""}</button>`;
  }).join("")}</div></section>`;
}
function contentHTML() {
  if (state.view === "weekly") {
    const week = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(state.cursor), index));
    return `<div class="week-board">${week.map((date) => dayCardHTML(date)).join("")}</div>`;
  }
  if (state.view === "daily") {
    const list = tasksFor(state.cursor);
    return `<div class="daily-wrap"><div class="daily-aura day-${dayClass[state.cursor.getDay()]}" aria-hidden="true"></div><div class="daily-intro"><span>${sameDay(state.cursor, today) ? "Today" : dayNames[state.cursor.getDay()]}</span><h2>${state.cursor.getDate()}</h2><p>${list.length ? "A little room for what matters." : "A clear day. Add only what feels useful."}</p></div>${dayCardHTML(state.cursor, true)}</div>`;
  }
  if (state.view === "monthly") return monthlyHTML();
  return `<section class="year-view" aria-label="${state.cursor.getFullYear()} calendar">${Array.from({ length: 12 }, (_, month) => miniMonthHTML(atNoon(new Date(state.cursor.getFullYear(), month, 1)), false)).join("")}</section>`;
}
function navHTML(className) {
  return `<nav class="${className}" aria-label="Planner views">${views.map((item) => `<button type="button" data-action="view" data-view="${item.id}" class="${state.view === item.id ? "active" : ""}"><span>${item.glyph}</span>${className === "mobile-tabs glass" ? `<small>${item.label}</small>` : item.label}</button>`).join("")}</nav>`;
}
function render() {
  const title = titleForView();
  planner.innerHTML = `<div class="planner-shell"><div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <aside class="sidebar glass ${state.menuOpen ? "is-open" : ""}">
      <div class="brand"><span class="brand-mark">D</span><div><strong>Daylight</strong><small>Your time, softly held.</small></div></div>
      ${navHTML("view-nav")}
      <div class="sidebar-calendar"><div class="calendar-title"><button type="button" data-action="mini-prev" aria-label="Previous month">‹</button><strong>${state.cursor.toLocaleDateString("en", { month: "long", year: "numeric" })}</strong><button type="button" data-action="mini-next" aria-label="Next month">›</button></div>${miniMonthHTML(state.cursor, true)}</div>
      <div class="sidebar-spacer"></div>
      <div class="data-actions"><button type="button" data-action="export">⇩ <span>Export a backup</span></button><button type="button" data-action="import">⇧ <span>Import a backup</span></button><button type="button" data-action="change-lock">⌁ <span>Change local lock</span></button><button type="button" data-action="lock">↪ <span>Lock planner</span></button></div>
      <div class="privacy"><span>⌁</span><div><strong>Browser-local space</strong><small id="save-status">Saved in this browser</small></div></div>
    </aside>
    ${state.menuOpen ? '<button class="scrim" type="button" data-action="close-menu" aria-label="Close menu"></button>' : ""}
    <main class="workspace"><header class="topbar glass"><button class="round-control menu-control" type="button" data-action="open-menu" aria-label="Open menu">☰</button><div class="range-title"><span>${state.view}</span><h1>${escapeHTML(title)}</h1></div><div class="date-controls"><button class="today-control" type="button" data-action="today">Today</button><div class="stepper"><button type="button" data-action="previous" aria-label="Previous ${state.view}">‹</button><button type="button" data-action="next" aria-label="Next ${state.view}">›</button></div></div></header><div class="content">${contentHTML()}</div></main>
    ${navHTML("mobile-tabs glass")}
  </div>`;
}

function openTaskDialog(date, task = null) {
  taskForm.reset();
  taskDate.value = date;
  taskId.value = task ? task.id : "";
  taskText.value = task ? task.text : "";
  document.querySelector("#task-dialog-kicker").textContent = task ? "Edit task" : "New task";
  document.querySelector("#task-dialog-title").textContent = task ? "Refine the wording." : "Add something gentle.";
  taskDialog.showModal();
  setTimeout(() => taskText.focus(), 0);
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}
function exportData() {
  const payload = { version: 1, edition: "github-pages", exportedAt: new Date().toISOString(), tasks: state.tasks };
  const href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = href; link.download = `daylight-planner-${iso(today)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
  showToast("Backup exported");
}

planner.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "view") { state.view = button.dataset.view; state.menuOpen = false; render(); }
  if (action === "previous") navigate(-1);
  if (action === "next") navigate(1);
  if (action === "today") { state.cursor = today; render(); }
  if (action === "open-menu") { state.menuOpen = true; render(); }
  if (action === "close-menu") { state.menuOpen = false; render(); }
  if (action === "mini-prev") { state.cursor = atNoon(new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1)); render(); }
  if (action === "mini-next") { state.cursor = atNoon(new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1)); render(); }
  if (action === "select-date") { state.cursor = fromISO(button.dataset.date); state.view = "daily"; state.menuOpen = false; render(); }
  if (action === "add-task") openTaskDialog(button.dataset.date);
  if (action === "toggle-task") {
    const task = state.tasks.find((item) => item.id === button.dataset.id);
    if (task) { task.completed = button.checked; task.completedAt = task.completed ? new Date().toISOString() : null; saveTasks(); render(); }
  }
  if (action === "edit-task") {
    const task = state.tasks.find((item) => item.id === button.dataset.id);
    if (task) openTaskDialog(task.date, task);
  }
  if (action === "delete-task") {
    const task = state.tasks.find((item) => item.id === button.dataset.id);
    if (task && confirm(`Delete “${task.text}”?`)) { state.tasks = state.tasks.filter((item) => item.id !== task.id); saveTasks(); render(); }
  }
  if (action === "export") exportData();
  if (action === "import") importFile.click();
  if (action === "change-lock") configureLockScreen("change");
  if (action === "lock") lockPlanner();
});

planner.addEventListener("dragstart", (event) => {
  const row = event.target.closest("[data-task-id]");
  if (!row) return;
  state.draggingId = row.dataset.taskId;
  row.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
});
planner.addEventListener("dragover", (event) => { if (event.target.closest("[data-task-id]")) event.preventDefault(); });
planner.addEventListener("drop", (event) => {
  const targetRow = event.target.closest("[data-task-id]");
  const source = state.tasks.find((task) => task.id === state.draggingId);
  const target = targetRow && state.tasks.find((task) => task.id === targetRow.dataset.taskId);
  if (!source || !target || source.id === target.id || source.date !== target.date) return;
  event.preventDefault();
  const list = tasksFor(source.date).filter((task) => task.id !== source.id);
  list.splice(list.findIndex((task) => task.id === target.id), 0, source);
  list.forEach((task, index) => { task.order = index; });
  saveTasks(); render();
});
planner.addEventListener("dragend", () => { state.draggingId = null; render(); });

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskText.value.trim();
  if (!text) return;
  if (taskId.value) {
    const task = state.tasks.find((item) => item.id === taskId.value);
    if (task) task.text = text.slice(0, 240);
  } else {
    state.tasks.push({ id: makeId(), date: taskDate.value, text: text.slice(0, 240), completed: false, completedAt: null, order: tasksFor(taskDate.value).length });
  }
  saveTasks(); taskDialog.close(); render();
});
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => taskDialog.close()));
taskDialog.addEventListener("click", (event) => { if (event.target === taskDialog) taskDialog.close(); });

importFile.addEventListener("change", async () => {
  const file = importFile.files && importFile.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.tasks)) throw new Error("invalid");
    const imported = data.tasks.filter(validTask).map(normalizeTask);
    if (!confirm(`Replace this browser's current planner with ${imported.length} imported task${imported.length === 1 ? "" : "s"}?`)) return;
    state.tasks = imported;
    saveTasks("Imported and saved"); render(); showToast("Backup imported");
  } catch { showToast("That backup file could not be read"); }
  finally { importFile.value = ""; }
});

let swipeStart = null;
planner.addEventListener("touchstart", (event) => { if (state.view === "daily") swipeStart = event.touches[0].clientX; }, { passive: true });
planner.addEventListener("touchend", (event) => {
  if (state.view !== "daily" || swipeStart === null) return;
  const delta = event.changedTouches[0].clientX - swipeStart;
  if (Math.abs(delta) > 60) navigate(delta < 0 ? 1 : -1);
  swipeStart = null;
}, { passive: true });

const existingLock = readLock();
if (!existingLock) configureLockScreen("setup");
else if (sessionStorage.getItem(SESSION_KEY) === "yes") openPlanner();
else configureLockScreen("unlock");
