(function () {
  const STORAGE_KEY = "workspaces.todo.tasks.v1";
  const FILTER_KEY = "workspaces.todo.filter.v1";

  const INSPIRE_TASKS = [
    "Tidy your desk for 5 minutes",
    "Drink a glass of water",
    "Review today's top 3 priorities",
    "Send one kind message",
    "Stretch for 2 minutes",
    "Read 4 pages of a book",
    "Clear 5 emails",
    "Plan tomorrow's first task",
    "Take a short walk",
    "Write down one win from today",
  ];

  const EMPTY_IMAGES = {
    allLight: [
      "../../Assets/Todo-Img-White.jpg",
      "../../Assets/Todo-Img-White.JPG",
      "./assets/empty-all-light.jpg",
    ],
    allDark: [
      "../../Assets/Todo-Img-Black.jpg",
      "../../Assets/Todo-Img-Black.JPG",
      "./assets/empty-all-dark.jpg",
    ],
    doneLight: [
      "../../Assets/Todo-Img-Completed-White.jpg",
      "../../Assets/Todo-Img-Completed-W.jpg",
      "../../Assets/Todo-Img-Completed-White.JPG",
      "./assets/empty-completed-light.jpg",
    ],
    doneDark: [
      "../../Assets/Todo-Img-Completed-Black.jpg",
      "../../Assets/Todo-Img-Completed-Bla.jpg",
      "../../Assets/Todo-Img-Completed-Black.JPG",
      "./assets/empty-completed-dark.jpg",
    ],
  };

  const state = {
    tasks: [],
    filter: "all",
    celebratedFor: "",
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheBase();
    ensureShell();
    loadState();
    bindEvents();
    watchTheme();
    document.body.classList.add("todo-page");
    render();
    fitTaskPanel();
    window.addEventListener("resize", fitTaskPanel);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", fitTaskPanel);
    }
  }

  function cacheBase() {
    els.form =
      document.querySelector(".todo-app .input-area") ||
      document.querySelector(".input-area");
    els.input = document.getElementById("task-input");
    els.list = document.getElementById("task-list");
    els.app = document.querySelector(".todo-app");
    els.container = document.querySelector(".todos-container");
  }

  function ensureShell() {
    if (!els.app || !els.container || !els.list) return;

    if (!document.getElementById("progressTitle")) {
      const progress = document.createElement("section");
      progress.className = "progress-panel";
      progress.innerHTML = `
        <div class="progress-top">
          <div class="progress-copy">
            <h4 id="progressTitle">Ready when you are</h4>
            <p id="progressMessage">Add a task and start building momentum.</p>
          </div>
          <div class="progress-meta">
            <span class="progress-percent" id="progressPercent">0%</span>
            <span class="progress-count" id="progressCount">0 of 0 done</span>
          </div>
        </div>
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      `;
      const heading = els.app.querySelector("h3");
      if (heading) els.app.insertBefore(progress, heading.nextSibling);
      else els.app.prepend(progress);
    }

    if (!document.querySelector(".todo-toolbar")) {
      const toolbar = document.createElement("div");
      toolbar.className = "todo-toolbar";
      toolbar.innerHTML = `
        <div class="filter-group" role="tablist">
          <button class="todo-chip active" data-filter="all" type="button">All</button>
          <button class="todo-chip" data-filter="completed" type="button">Completed</button>
        </div>
        <div class="surprise-group">
          <button class="todo-chip ghost" id="inspireBtn" type="button">Inspire me</button>
          <button class="todo-chip ghost" id="focusBtn" type="button">Focus mode</button>
          <button class="todo-chip ghost" id="clearDoneBtn" type="button">Clear done</button>
        </div>
      `;
      if (els.form) els.app.insertBefore(toolbar, els.form);
      else els.app.appendChild(toolbar);
    }

    if (!document.getElementById("emptyState")) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.id = "emptyState";
      empty.innerHTML = `<img id="emptyImage" alt="Empty todo illustration" />`;
      els.container.insertBefore(empty, els.list);
    }

    if (!document.getElementById("celebration")) {
      const celebration = document.createElement("div");
      celebration.className = "celebration";
      celebration.id = "celebration";
      celebration.innerHTML = `
        <div class="celebration-card">
          <div class="badge"><i class="fa-solid fa-trophy"></i></div>
          <h3>All tasks complete</h3>
          <p>You finished every item on the list. That is a clean sweep.</p>
          <button class="todo-chip active" id="closeCelebration" type="button">Keep going</button>
        </div>
      `;
      document.body.appendChild(celebration);
    }

    if (!document.getElementById("todoToast")) {
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.id = "todoToast";
      document.body.appendChild(toast);
    }

    els.progressTitle = document.getElementById("progressTitle");
    els.progressMessage = document.getElementById("progressMessage");
    els.progressPercent = document.getElementById("progressPercent");
    els.progressCount = document.getElementById("progressCount");
    els.progressFill = document.getElementById("progressFill");
    els.progressPanel = document.querySelector(".progress-panel");
    els.empty = document.getElementById("emptyState");
    els.emptyImage = document.getElementById("emptyImage");
    els.celebration = document.getElementById("celebration");
    els.toast = document.getElementById("todoToast");

    if (els.emptyImage) {
      els.emptyImage.addEventListener("error", onEmptyImageError);
    }
  }

  function bindEvents() {
    if (els.form) {
      els.form.addEventListener("submit", function (event) {
        event.preventDefault();
        event.stopPropagation();
        addTask(els.input ? els.input.value : "");
      });
    }

    document
      .querySelectorAll(".todo-toolbar [data-filter]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          setFilter(btn.getAttribute("data-filter"));
        });
      });

    const inspireBtn = document.getElementById("inspireBtn");
    const focusBtn = document.getElementById("focusBtn");
    const clearDoneBtn = document.getElementById("clearDoneBtn");
    const closeCelebration = document.getElementById("closeCelebration");

    if (inspireBtn) inspireBtn.addEventListener("click", inspireMe);
    if (focusBtn) focusBtn.addEventListener("click", toggleFocusMode);
    if (clearDoneBtn) clearDoneBtn.addEventListener("click", clearCompleted);
    if (closeCelebration) {
      closeCelebration.addEventListener("click", function () {
        if (els.celebration) els.celebration.classList.remove("visible");
      });
    }
  }

  function watchTheme() {
    const apply = function () {
      if (els.empty && els.empty.classList.contains("visible")) {
        updateEmptyState(true);
      }
    };
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function isDarkMode() {
    const root = document.documentElement;
    const body = document.body;
    return (
      body.classList.contains("dark-mode") ||
      body.classList.contains("dark") ||
      root.classList.contains("dark-mode") ||
      root.classList.contains("dark")
    );
  }

  function loadState() {
    try {
      state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      if (!Array.isArray(state.tasks)) state.tasks = [];
    } catch (err) {
      state.tasks = [];
    }
    state.filter =
      localStorage.getItem(FILTER_KEY) === "completed" ? "completed" : "all";
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    localStorage.setItem(FILTER_KEY, state.filter);
  }

  function addTask(text, extra) {
    extra = extra || {};
    const value = String(text || "").trim();
    if (!value) {
      showToast("Type a task first");
      if (els.input) els.input.focus();
      return;
    }

    state.tasks.push({
      id: "task-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      text: value,
      completed: false,
      priority: extra.priority || "normal",
      createdAt: Date.now(),
    });

    if (els.input) els.input.value = "";
    saveState();
    render();
    showToast("Task added");
  }

  function deleteTask(id) {
    const card = els.list
      ? els.list.querySelector('[data-id="' + id + '"]')
      : null;
    if (card) {
      card.classList.add("exiting");
      setTimeout(function () {
        state.tasks = state.tasks.filter(function (task) {
          return task.id !== id;
        });
        saveState();
        render();
      }, 220);
      return;
    }
    state.tasks = state.tasks.filter(function (task) {
      return task.id !== id;
    });
    saveState();
    render();
  }

  function toggleComplete(id) {
    const task = state.tasks.find(function (item) {
      return item.id === id;
    });
    if (!task) return;
    task.completed = !task.completed;
    saveState();
    render();
  }

  function editTask(id, nextText) {
    const task = state.tasks.find(function (item) {
      return item.id === id;
    });
    if (!task) return;
    const value = String(nextText || "").trim();
    if (!value) {
      showToast("Task cannot be empty");
      render();
      return;
    }
    task.text = value;
    saveState();
    render();
  }

  function moveTask(id, direction) {
    const index = state.tasks.findIndex(function (item) {
      return item.id === id;
    });
    const next = index + direction;
    if (index < 0 || next < 0 || next >= state.tasks.length) return;
    const copy = state.tasks.splice(index, 1)[0];
    state.tasks.splice(next, 0, copy);
    saveState();
    render();
  }

  function cyclePriority(id) {
    const task = state.tasks.find(function (item) {
      return item.id === id;
    });
    if (!task) return;
    const order = ["low", "normal", "high"];
    const current = order.indexOf(task.priority || "normal");
    task.priority = order[(current + 1) % order.length];
    saveState();
    render();
    showToast("Priority set to " + task.priority);
  }

  function setFilter(filter) {
    state.filter = filter === "completed" ? "completed" : "all";
    document
      .querySelectorAll(".todo-toolbar [data-filter]")
      .forEach(function (btn) {
        btn.classList.toggle(
          "active",
          btn.getAttribute("data-filter") === state.filter,
        );
      });
    saveState();
    render();
  }

  function visibleTasks() {
    if (state.filter === "completed") {
      return state.tasks.filter(function (task) {
        return task.completed;
      });
    }
    return state.tasks;
  }

  function render() {
    if (!els.list) return;
    const items = visibleTasks();
    els.list.innerHTML = "";

    items.forEach(function (task) {
      const realIndex = state.tasks.findIndex(function (item) {
        return item.id === task.id;
      });
      const li = document.createElement("li");
      li.className =
        "task-card" +
        (task.completed ? " completed" : "") +
        (task.priority === "high" ? " priority-high" : "");
      li.setAttribute("data-id", task.id);

      const created = new Date(task.createdAt || Date.now());
      const timeLabel = created.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      li.innerHTML =
        '<button class="task-check" type="button" aria-label="Toggle complete"><i class="fa-solid fa-check"></i></button>' +
        '<div class="task-main"><div class="task-title"></div><div class="task-meta">' +
        '<button class="priority-pill" type="button">' +
        priorityLabel(task.priority) +
        '</button><span class="created-pill">' +
        timeLabel +
        "</span></div></div>" +
        '<div class="task-actions">' +
        '<button class="todo-icon-btn" data-act="up" type="button" aria-label="Move up"' +
        (realIndex === 0 ? " disabled" : "") +
        '><i class="fa-solid fa-arrow-up"></i></button>' +
        '<button class="todo-icon-btn" data-act="down" type="button" aria-label="Move down"' +
        (realIndex === state.tasks.length - 1 ? " disabled" : "") +
        '><i class="fa-solid fa-arrow-down"></i></button>' +
        '<button class="todo-icon-btn" data-act="edit" type="button" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="todo-icon-btn" data-act="delete" type="button" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>' +
        "</div>";

      li.querySelector(".task-title").textContent = task.text;
      li.querySelector(".task-check").addEventListener("click", function () {
        toggleComplete(task.id);
      });
      li.querySelector(".priority-pill").addEventListener("click", function () {
        cyclePriority(task.id);
      });
      li.querySelector('[data-act="up"]').addEventListener(
        "click",
        function () {
          moveTask(task.id, -1);
        },
      );
      li.querySelector('[data-act="down"]').addEventListener(
        "click",
        function () {
          moveTask(task.id, 1);
        },
      );
      li.querySelector('[data-act="delete"]').addEventListener(
        "click",
        function () {
          deleteTask(task.id);
        },
      );
      li.querySelector('[data-act="edit"]').addEventListener(
        "click",
        function () {
          startEdit(li, task);
        },
      );

      els.list.appendChild(li);
    });

    updateProgress();
    updateEmptyState(items.length === 0);
    maybeCelebrate();
    fitTaskPanel();
  }

  function fitTaskPanel() {
    if (!els.app || !els.container) return;
    const viewport = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    document.body.classList.add("todo-compact");

    const listHeight = Math.max(
      isMobile ? 280 : 360,
      Math.floor(viewport * (isMobile ? 0.56 : 0.58)),
    );
    els.app.style.height = "auto";
    els.app.style.maxHeight = "none";
    els.app.style.minHeight = "0";
    els.app.style.overflow = "hidden";
    els.app.style.display = "flex";
    els.app.style.flexDirection = "column";
    els.container.style.flex = "1 1 auto";
    els.container.style.height = listHeight + "px";
    els.container.style.minHeight = listHeight + "px";
    els.container.style.maxHeight = listHeight + "px";
    els.container.style.overflowY = "scroll";
    els.container.style.overflowX = "hidden";
    els.container.style.webkitOverflowScrolling = "touch";
    els.container.style.touchAction = "pan-y";
  }

  function startEdit(card, task) {
    const title = card.querySelector(".task-title");
    if (!title) return;
    const input = document.createElement("input");
    input.className = "task-edit-input";
    input.value = task.text;
    input.style.color = "#0a0a0a";
    input.style.backgroundColor = "#f7fff8";
    title.replaceWith(input);
    input.focus();

    const finish = function () {
      editTask(task.id, input.value);
    };
    input.addEventListener("blur", finish);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
      if (event.key === "Escape") render();
    });
  }

  function updateProgress() {
    if (!els.progressPercent || !els.progressFill) return;
    const total = state.tasks.length;
    const done = state.tasks.filter(function (task) {
      return task.completed;
    }).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    els.progressPercent.textContent = percent + "%";
    els.progressCount.textContent = done + " of " + total + " done";
    els.progressFill.style.width = percent + "%";
    if (els.progressPanel) {
      els.progressPanel.classList.toggle(
        "is-complete",
        total > 0 && done === total,
      );
    }

    const copy = progressCopy(total, percent);
    els.progressTitle.textContent = copy.title;
    els.progressMessage.textContent = copy.message;
  }

  function progressCopy(total, percent) {
    if (total === 0) {
      return {
        title: "Ready when you are",
        message: "Add a task and start building momentum.",
      };
    }
    if (percent === 0) {
      return {
        title: "A fresh list",
        message: "Check off the first one. Momentum loves a beginning.",
      };
    }
    if (percent < 40) {
      return {
        title: "Nice start",
        message: "You are moving. Keep stacking small wins.",
      };
    }
    if (percent < 75) {
      return {
        title: "In the zone",
        message: "More than halfway. Stay with the next clear task.",
      };
    }
    if (percent < 100) {
      return {
        title: "Almost there",
        message: "The finish line is close. Complete the last few.",
      };
    }
    return {
      title: "All clear",
      message: "Every task is done. That is an excellent close.",
    };
  }

  function currentImageList() {
    const dark = isDarkMode();
    const completedView = state.filter === "completed";
    if (completedView && dark) return EMPTY_IMAGES.doneDark.slice();
    if (completedView) return EMPTY_IMAGES.doneLight.slice();
    if (dark) return EMPTY_IMAGES.allDark.slice();
    return EMPTY_IMAGES.allLight.slice();
  }

  function updateEmptyState(isEmpty) {
    if (!els.empty || !els.emptyImage) return;
    els.empty.classList.toggle("visible", isEmpty);
    if (!isEmpty) return;

    els.emptyImage.dataset.tryIndex = "0";
    const list = currentImageList();
    els.emptyImage.alt =
      state.filter === "completed" ? "No completed tasks yet" : "No tasks yet";
    els.emptyImage.src = list[0];
  }

  function onEmptyImageError() {
    if (!els.emptyImage) return;
    const list = currentImageList();
    const next = Number(els.emptyImage.dataset.tryIndex || "0") + 1;
    if (next < list.length) {
      els.emptyImage.dataset.tryIndex = String(next);
      els.emptyImage.src = list[next];
    }
  }

  function maybeCelebrate() {
    const total = state.tasks.length;
    const done = state.tasks.filter(function (task) {
      return task.completed;
    }).length;
    const stamp = state.tasks
      .map(function (task) {
        return task.id;
      })
      .join("|");

    if (total > 0 && done === total && state.celebratedFor !== stamp) {
      state.celebratedFor = stamp;
      launchCelebration();
    }
  }

  function launchCelebration() {
    if (!els.celebration) return;
    els.celebration.classList.add("visible");
    const colors = ["#0a682c", "#19a34a", "#f4d35e", "#f1f5f9", "#86efac"];
    for (let i = 0; i < 36; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      document.body.appendChild(piece);
      setTimeout(function () {
        piece.remove();
      }, 3200);
      RT;
    }
  }

  function inspireMe() {
    const idea =
      INSPIRE_TASKS[Math.floor(Math.random() * INSPIRE_TASKS.length)];
    addTask(idea, { priority: "low" });
  }

  function toggleFocusMode() {
    const firstOpen = state.tasks.find(function (task) {
      return !task.completed;
    });
    if (!firstOpen) {
      showToast("No open tasks to focus on");
      return;
    }
    document.querySelectorAll(".task-card").forEach(function (card) {
      card.style.opacity =
        card.getAttribute("data-id") === firstOpen.id ? "1" : "0.28";
    });
    showToast("Focus: " + firstOpen.text);
  }

  function clearCompleted() {
    const before = state.tasks.length;
    state.tasks = state.tasks.filter(function (task) {
      return !task.completed;
    });
    if (state.tasks.length === before) {
      showToast("No completed tasks to clear");
      return;
    }
    saveState();
    render();
    showToast("Completed tasks cleared");
  }

  function priorityLabel(priority) {
    if (priority === "high") return "High";
    if (priority === "low") return "Low";
    return "Normal";
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      els.toast.classList.remove("show");
    }, 1800);
  }
})();
