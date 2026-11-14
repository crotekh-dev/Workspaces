(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const els = {
    monthTitle: $("#wsMonthTitle"), grid: $("#wsDateGrid"), selectedHeading: $("#wsSelectedHeading"),
    selectedDate: $("#wsSelectedDate"), dayEvents: $("#wsDayEvents"), upcoming: $("#wsUpcomingList"),
    search: $("#wsEventSearch"), view: $("#wsViewSelect"), eventDialog: $("#wsEventDialog"),
    eventForm: $("#wsEventForm"), eventTitle: $("#wsEventTitle"), eventDate: $("#wsEventDate"),
    eventTime: $("#wsEventTime"), eventCategory: $("#wsEventCategory"), eventNotes: $("#wsEventNotes"),
    dialogTitle: $("#wsDialogTitle"), deleteButton: $("#wsDeleteEvent"), toast: $("#wsToast"),
    jumpDialog: $("#wsJumpDialog"), jumpInput: $("#wsJumpInput"), formFeedback: $("#wsFormFeedback")
  };

  const STORAGE_KEY = "workspaces-calendar-events-v1";
  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fromKey = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  };
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const addDays = (date, count) => {
    const result = startOfDay(date);
    result.setDate(result.getDate() + count);
    return result;
  };
  const sameDay = (a, b) => dateKey(a) === dateKey(b);
  const dateLabel = (date, options = { weekday: "long", month: "long", day: "numeric", year: "numeric" }) =>
    new Intl.DateTimeFormat(undefined, options).format(date);
  const monthLabel = (date) => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
  const safeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  let today = startOfDay(new Date());
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  let selectedDate = today;
  let editingId = null;
  let toastTimer = null;
  let events = loadEvents();

  function loadEvents() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((event) => event && typeof event.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date))
        .map((event) => ({
          id: event.id, title: String(event.title || "Untitled event").slice(0, 100),
          date: event.date, time: String(event.time || ""), category: String(event.category || "personal"),
          notes: String(event.notes || "").slice(0, 500)
        }));
    } catch (error) {
      return [];
    }
  }

  function saveEvents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
      return true;
    } catch (error) {
      showToast("Could not save. Browser storage may be full or disabled.");
      return false;
    }
  }

  function sortedEvents(list = events) {
    return [...list].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title));
  }

  function matchesSearch(event) {
    const query = els.search.value.trim().toLowerCase();
    return !query || `${event.title} ${event.notes} ${event.category} ${event.date}`.toLowerCase().includes(query);
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2500);
  }

  function render() {
    els.monthTitle.textContent = monthLabel(visibleMonth);
    renderGrid();
    renderSelectedDay();
    renderUpcoming();
  }

  function renderGrid() {
    const view = els.view.value;
    if (view === "agenda") {
      renderAgenda();
      return;
    }
    els.grid.classList.toggle("ws-week-view", view === "week");
    els.grid.classList.remove("ws-agenda-view");
    els.grid.setAttribute("role", "grid");
    els.grid.innerHTML = "";
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
    const firstDay = view === "week"
      ? addDays(selectedDate, -selectedDate.getDay())
      : addDays(monthStart, -monthStart.getDay());
    const count = view === "week" ? 7 : 42;

    for (let i = 0; i < count; i++) {
      const date = addDays(firstDay, i);
      const key = dateKey(date);
      const inMonth = date.getMonth() === visibleMonth.getMonth();
      const dayEvents = sortedEvents(events.filter((event) => event.date === key && matchesSearch(event)));
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "ws-date-cell";
      if (!inMonth && view === "month") cell.classList.add("is-outside");
      if (sameDay(date, today)) cell.classList.add("is-today");
      if (sameDay(date, selectedDate)) cell.classList.add("is-selected");
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `${dateLabel(date)}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`);
      cell.setAttribute("aria-pressed", String(sameDay(date, selectedDate)));
      const visibleChips = dayEvents.slice(0, window.innerWidth <= 420 ? 1 : 3);
      cell.innerHTML = `<span class="ws-day-number">${date.getDate()}</span><span class="ws-cell-events">${visibleChips.map((event) =>
        `<span class="ws-event-chip cat-${safeText(event.category)}" data-event-id="${safeText(event.id)}" title="${safeText(event.title)}">${safeText(event.title)}</span>`
      ).join("")}${dayEvents.length > visibleChips.length ? `<span class="ws-more-events">+${dayEvents.length - visibleChips.length} more</span>` : ""}</span>`;
      cell.addEventListener("click", (event) => {
        const chip = event.target.closest("[data-event-id]");
        if (chip) {
          event.stopPropagation();
          openEvent(chip.dataset.eventId);
          return;
        }
        selectedDate = date;
        if (view === "month" && !inMonth) visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1, 12);
        render();
      });
      els.grid.appendChild(cell);
    }
  }

  function renderAgenda() {
    els.grid.classList.remove("ws-week-view");
    els.grid.classList.add("ws-agenda-view");
    els.grid.setAttribute("role", "list");
    const filtered = sortedEvents(events.filter((event) => matchesSearch(event) && event.date >= dateKey(today)));
    if (!filtered.length) {
      els.grid.innerHTML = `<div class="ws-empty-state"><i class="fa-regular fa-calendar-check"></i><p>No upcoming events match this search.</p><button type="button" data-action="add">Create an event</button></div>`;
      els.grid.querySelector('[data-action="add"]').addEventListener("click", () => openNewEvent(selectedDate));
      return;
    }
    const grouped = new Map();
    filtered.forEach((event) => {
      if (!grouped.has(event.date)) grouped.set(event.date, []);
      grouped.get(event.date).push(event);
    });
    els.grid.innerHTML = [...grouped.entries()].map(([key, list]) =>
      `<div class="ws-agenda-day">${safeText(dateLabel(fromKey(key)))}</div>${list.map((event) => eventRow(event, true)).join("")}`
    ).join("");
    els.grid.querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", () => openEvent(button.dataset.editEvent)));
  }

  function eventRow(event, showDate = false) {
    const date = fromKey(event.date);
    const meta = [showDate ? dateLabel(date, { month: "short", day: "numeric" }) : "", event.time ? formatTime(event.time) : "Any time", categoryLabel(event.category)].filter(Boolean).join(" · ");
    return `<div class="ws-event-row"><span class="ws-event-color cat-${safeText(event.category)}"></span><div class="ws-event-row-content"><div class="ws-event-row-title">${safeText(event.title)}</div><div class="ws-event-row-meta">${safeText(meta)}</div>${event.notes ? `<div class="ws-event-row-notes">${safeText(event.notes)}</div>` : ""}</div><button type="button" class="ws-event-row-edit" data-edit-event="${safeText(event.id)}" aria-label="Edit ${safeText(event.title)}" title="Edit event"><i class="fa-solid fa-pen"></i></button></div>`;
  }

  function renderSelectedDay() {
    els.selectedHeading.textContent = sameDay(selectedDate, today) ? "Today" : dateLabel(selectedDate, { month: "short", day: "numeric" });
    els.selectedDate.textContent = dateLabel(selectedDate);
    const dayEvents = sortedEvents(events.filter((event) => event.date === dateKey(selectedDate) && matchesSearch(event)));
    if (!dayEvents.length) {
      els.dayEvents.innerHTML = `<div class="ws-empty-state"><i class="fa-regular fa-calendar-plus"></i><p>${els.search.value.trim() ? "No matching events for this day." : "Nothing planned for this day yet."}</p><button type="button" id="wsEmptyAdd">+ Add an event</button></div>`;
      $("#wsEmptyAdd").addEventListener("click", () => openNewEvent(selectedDate));
      return;
    }
    els.dayEvents.innerHTML = dayEvents.map((event) => eventRow(event)).join("");
    els.dayEvents.querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", () => openEvent(button.dataset.editEvent)));
  }

  function renderUpcoming() {
    const upcoming = sortedEvents(events.filter((event) => event.date >= dateKey(today) && matchesSearch(event))).slice(0, 4);
    if (!upcoming.length) {
      els.upcoming.innerHTML = `<div class="ws-empty-state"><i class="fa-regular fa-clock"></i><p>Your next events will appear here.</p></div>`;
      return;
    }
    els.upcoming.innerHTML = upcoming.map((event) => {
      const date = fromKey(event.date);
      return `<div class="ws-event-row"><div class="ws-upcoming-date"><b>${date.getDate()}</b><small>${new Intl.DateTimeFormat(undefined, { month: "short" }).format(date)}</small></div><span class="ws-event-color cat-${safeText(event.category)}"></span><div class="ws-event-row-content"><div class="ws-event-row-title">${safeText(event.title)}</div><div class="ws-event-row-meta">${sameDay(date, today) ? "Today" : dateLabel(date, { weekday: "short" })}${event.time ? ` · ${formatTime(event.time)}` : ""}</div></div><button type="button" class="ws-event-row-edit" data-edit-event="${safeText(event.id)}" aria-label="Edit ${safeText(event.title)}"><i class="fa-solid fa-pen"></i></button></div>`;
    }).join("");
    els.upcoming.querySelectorAll("[data-edit-event]").forEach((button) => button.addEventListener("click", () => openEvent(button.dataset.editEvent)));
  }

  function categoryLabel(category) {
    return ({ personal: "Personal", work: "Work", study: "Study", health: "Health", other: "Other" })[category] || "Personal";
  }
  function formatTime(time) {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function openNewEvent(date = selectedDate) {
    if (els.jumpDialog.open) closeDialog(els.jumpDialog);
    editingId = null;
    els.eventForm.reset();
    els.dialogTitle.textContent = "Create an event";
    els.deleteButton.hidden = true;
    els.eventDate.value = dateKey(date);
    els.eventTime.value = "09:00";
    els.eventCategory.value = "personal";
    els.formFeedback.textContent = "";
    if (!els.eventDialog.open) els.eventDialog.showModal();
    setTimeout(() => els.eventTitle.focus(), 30);
  }

  function openEvent(id) {
    if (els.jumpDialog.open) closeDialog(els.jumpDialog);
    const event = events.find((item) => item.id === id);
    if (!event) return;
    editingId = id;
    els.dialogTitle.textContent = "Edit event";
    els.eventTitle.value = event.title;
    els.eventDate.value = event.date;
    els.eventTime.value = event.time;
    els.eventCategory.value = event.category;
    els.eventNotes.value = event.notes;
    els.deleteButton.hidden = false;
    els.formFeedback.textContent = "";
    if (!els.eventDialog.open) els.eventDialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function navigateMonth(offset) {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1, 12);
    selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), Math.min(selectedDate.getDate(), new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()), 12);
    render();
  }

  function exportICS() {
    const list = sortedEvents(events);
    if (!list.length) {
      showToast("There are no events to export yet.");
      return;
    }
    const escapeICS = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const stamp = (date, time) => {
      const [y, m, d] = date.split("-");
      const [hh = "09", mm = "00"] = (time || "09:00").split(":");
      return `${y}${m}${d}T${hh}${mm}00`;
    };
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Workspaces//Offline Calendar//EN", "CALSCALE:GREGORIAN"];
    list.forEach((event) => {
      const start = stamp(event.date, event.time);
      const [y, m, d] = event.date.split("-").map(Number);
      const endDate = new Date(y, m - 1, d + 1, 12);
      const end = event.time ? (() => {
        const [hh, mm] = event.time.split(":").map(Number);
        const endTime = new Date(y, m - 1, d, hh, mm + 60, 0);
        return `${endTime.getFullYear()}${pad(endTime.getMonth() + 1)}${pad(endTime.getDate())}T${pad(endTime.getHours())}${pad(endTime.getMinutes())}00`;
      })() : `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;
      lines.push("BEGIN:VEVENT", `UID:${event.id}@workspaces.local`, `DTSTAMP:${stamp(dateKey(new Date()), "12:00")}`,
        event.time ? `DTSTART:${start}` : `DTSTART;VALUE=DATE:${event.date.replaceAll("-", "")}`,
        event.time ? `DTEND:${end}` : `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeICS(event.title)}`);
      if (event.notes) lines.push(`DESCRIPTION:${escapeICS(event.notes)}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "workspaces-calendar.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Calendar exported as an .ics file.");
  }

  $("#wsPrevMonth").addEventListener("click", () => navigateMonth(-1));
  $("#wsNextMonth").addEventListener("click", () => navigateMonth(1));
  $("#wsToday").addEventListener("click", () => {
    today = startOfDay(new Date());
    selectedDate = today;
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    render();
  });
  $("#wsAddEventTop").addEventListener("click", () => openNewEvent(selectedDate));
  $("#wsAddSelected").addEventListener("click", () => openNewEvent(selectedDate));
  $("#wsCloseDialog").addEventListener("click", () => closeDialog(els.eventDialog));
  $("#wsCancelDialog").addEventListener("click", () => closeDialog(els.eventDialog));
  $("#wsCloseJump").addEventListener("click", () => closeDialog(els.jumpDialog));
  $("#wsCancelJump").addEventListener("click", () => closeDialog(els.jumpDialog));
  els.eventDialog.addEventListener("click", (e) => {
    if (e.target === els.eventDialog) closeDialog(els.eventDialog);
  });
  els.jumpDialog.addEventListener("click", (e) => {
    if (e.target === els.jumpDialog) closeDialog(els.jumpDialog);
  });
  $("#wsJumpDate").addEventListener("click", () => {
    if (els.eventDialog.open) closeDialog(els.eventDialog);
    els.jumpInput.value = dateKey(selectedDate);
    if (!els.jumpDialog.open) els.jumpDialog.showModal();
  });
  $("#wsJumpForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!els.jumpInput.value) return;
    selectedDate = fromKey(els.jumpInput.value);
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    els.view.value = "month";
    closeDialog(els.jumpDialog);
    render();
  });
  $("#wsExportEvents").addEventListener("click", exportICS);
  $("#wsClearSearch").addEventListener("click", () => {
    els.search.value = "";
    render();
    showToast("Search cleared.");
  });
  els.search.addEventListener("input", render);
  els.view.addEventListener("change", () => {
    if (els.view.value === "week") visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    render();
  });

  els.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = els.eventTitle.value.trim();
    const date = els.eventDate.value;
    if (!title || !date) {
      els.formFeedback.textContent = "Add a title and choose a date.";
      return;
    }
    const record = {
      id: editingId || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      title, date, time: els.eventTime.value, category: els.eventCategory.value,
      notes: els.eventNotes.value.trim()
    };
    if (editingId) events = events.map((item) => item.id === editingId ? record : item);
    else events.push(record);
    if (!saveEvents()) return;
    selectedDate = fromKey(date);
    visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
    els.view.value = "month";
    closeDialog(els.eventDialog);
    render();
    showToast(editingId ? "Event updated." : "Event saved on this device.");
    editingId = null;
  });

  els.deleteButton.addEventListener("click", () => {
    if (!editingId) return;
    const event = events.find((item) => item.id === editingId);
    if (!event) return;
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    events = events.filter((item) => item.id !== editingId);
    saveEvents();
    closeDialog(els.eventDialog);
    render();
    showToast("Event deleted.");
    editingId = null;
  });

  // Keep calendar dates accurate if the page stays open over midnight.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      const now = startOfDay(new Date());
      if (!sameDay(now, today)) {
        today = now;
        render();
      }
    }
  });
  window.addEventListener("resize", () => {
    clearTimeout(window.__wsCalendarResizeTimer);
    window.__wsCalendarResizeTimer = setTimeout(renderGrid, 120);
  });

  render();
})();
