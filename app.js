let notes = [];
let editingNoteId = null;
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", function () {
  const splash = document.getElementById("workspaceSplash");

  if (!splash) return;

  setTimeout(() => {
    splash.classList.add("hide");

    setTimeout(() => {
      splash.remove();
    }, 800);
  }, 2000);
});

function loadNotes() {
  const savedNotes = localStorage.getItem("quickNotes");
  return savedNotes ? JSON.parse(savedNotes) : [];
}

function showNotification(type, title, message) {
  let container = document.querySelector(".workspace-notification-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "workspace-notification-container";
    document.body.appendChild(container);
  }

  const notification = document.createElement("div");

  notification.className = `workspace-notification ${type}`;

  const notificationIcons = {
    added: "fa-check",
    updated: "fa-pen",
    deleted: "fa-trash",
  };

  notification.innerHTML = `
    <div class="notification-icon">
      <i class="fa-solid ${notificationIcons[type] || "fa-bell"}"></i>
    </div>

    <div class="notification-content">
      <h4 class="notification-title">${title}</h4>
      <p class="notification-message">${message}</p>
    </div>

    <button
      class="notification-close"
      type="button"
      aria-label="Close notification"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="notification-progress"></div>
  `;

  container.appendChild(notification);

  const closeNotification = () => {
    notification.style.animation = "notificationFadeOut 0.3s ease forwards";

    setTimeout(() => {
      notification.remove();

      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  };

  notification
    .querySelector(".notification-close")
    .addEventListener("click", closeNotification);

  setTimeout(closeNotification, 4000);
}

function notifyNoteAdded() {
  showNotification(
    "added",
    "Note added",
    "Your new note has been saved successfully.",
  );
}

function notifyNoteUpdated() {
  showNotification(
    "updated",
    "Note updated",
    "Your changes have been saved successfully.",
  );
}

function notifyNoteDeleted() {
  showNotification(
    "deleted",
    "Note deleted",
    "The note has been removed successfully.",
  );
}

function saveNote(event) {
  event.preventDefault();

  const title = document.getElementById("noteTitle").value;
  const content = document.getElementById("noteContent").value;
  const category = document.getElementById("noteCategory").value;
  console.log(notes);

  if (editingNoteId) {

    const noteIndex = notes.findIndex((note) => note.id === editingNoteId);

    if (noteIndex !== -1) {
      notes[noteIndex] = {
        ...notes[noteIndex],
        title: title,
        content: content,
        category: category,
      };
    }
  } else {
    notes.push({
      id: generateId(),
      title,
      content,
      category,
    });
  }

  saveNotes();
  renderNotes();

  if (editingNoteId) {
    notifyNoteUpdated();
  } else {
    notifyNoteAdded();
  }

  document.getElementById("noteForm").reset();
  closeNoteDialog();
}

function generateId() {
  return Date.now().toString();
}

function saveNotes() {
  localStorage.setItem("quickNotes", JSON.stringify(notes));
}

function deleteNote(noteid) {
  notes = notes.filter((note) => note.id !== noteid);
  saveNotes();
  renderNotes();
  notifyNoteDeleted();
}

function filterNotes(category) {
  currentFilter = category;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeButton = document.querySelector(`[data-filter="${category}"]`);

  if (activeButton) {
    activeButton.classList.add("active");
  }

  renderNotes();
}

function openNoteDialog(noteId = null) {
  const dialog = document.getElementById("noteDialog");
  const titleInput = document.getElementById("noteTitle");
  const contentInput = document.getElementById("noteContent");
  const categoryInput = document.getElementById("noteCategory");

  if (!dialog || !titleInput || !contentInput || !categoryInput) return;

  if (noteId) {

    const noteToEdit = notes.find((note) => note.id === noteId);

    if (!noteToEdit) return;

    editingNoteId = noteId;

    document.getElementById("dialogTitle").textContent = "Edit Note";

    titleInput.value = noteToEdit.title;
    contentInput.value = noteToEdit.content;
    categoryInput.value = noteToEdit.category || "";
  } else {

    editingNoteId = null;

    document.getElementById("dialogTitle").textContent = "Add Note";

    titleInput.value = "";
    contentInput.value = "";
    categoryInput.value = "";
  }

  dialog.showModal();
  titleInput.focus();
}

function renderNotes() {
  const notesContainer = document.getElementById("notesContainer");

  if (!notesContainer) return;

  const filteredNotes =
    currentFilter === "all"
      ? notes
      : notes.filter((note) => note.category === currentFilter);

  if (filteredNotes.length === 0) {

    notesContainer.innerHTML = `
      <div class="empty-container">
        <h2>${
          currentFilter === "all"
            ? "No Notes Added"
            : `No ${
                currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)
              } Notes`
        }</h2>

        <p>Create your first note to get started</p>

        <button class="add-note-btn" onclick="openNoteDialog()">
          Add your first note
        </button>
      </div>
    `;

    return;
  }

  notesContainer.innerHTML = filteredNotes
    .map(
      (note) => `
    <div class="note-card" id="note-${note.id}">
      <div class="note-header">

        <h3 class="note-title">${note.title}</h3>

        ${
          note.category && note.category !== "all"
            ? `<span class="note-category category-${note.category}">
                ${
                  note.category.charAt(0).toUpperCase() + note.category.slice(1)
                }
              </span>`
            : ""
        }

      </div>

      <p class="note-content">${note.content}</p>

      <div class="note-actions">
        <button
          onclick="openNoteDialog('${note.id}')"
          class="edit-btn"
        >
          <i class="fas fa-edit"></i>
        </button>

        <button
          onclick="deleteNote('${note.id}')"
          class="delete-btn"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

function closeNoteDialog() {
  const dialog = document.getElementById("noteDialog");

  if (dialog) {
    dialog.close();
  }
}

function getWorkspaceUserName() {
  const dialog = document.getElementById("nameDialog");
  const form = document.getElementById("nameDialogForm");
  const input = document.getElementById("workspaceNameInput");
  if (!dialog || !form || !input) return "User";

  return new Promise((resolve) => {
    const finish = (name) => {
      const cleanName = (name || "").trim() || "User";
      localStorage.setItem("workspaceUserName", cleanName);
      if (dialog.open) dialog.close();
      resolve(cleanName);
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!input.value.trim()) { input.focus(); return; }
      finish(input.value);
    }, { once: true });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish("User");
    }, { once: true });
    dialog.showModal();
    requestAnimationFrame(() => input.focus());
  });
}

async function setupWelcomeGreeting() {
  const greetingElement = document.querySelector(".welcome-greeting");
  const nameElement = document.getElementById("welcomeName");
  const messageElement = document.getElementById("welcomeMessage");
  const avatarElement = document.querySelector(".user-avatar");
  const welcomeIcon = document.querySelector(".welcome-icon i");

  if (!greetingElement || !nameElement || !messageElement) return;

  let userName = localStorage.getItem("workspaceUserName");

  // Ask only on first use, using a theme-aware in-app dialog.
  if (!userName) {
    userName = await getWorkspaceUserName();
  }

  const firstLetter = userName.charAt(0).toUpperCase();

  if (avatarElement) {
    avatarElement.textContent = firstLetter;
  }

  const hour = new Date().getHours();

  let greeting;
  let message;
  let icon;

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
    message = "Start your day with focus and make today productive.";
    icon = "fa-sun";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
    message = "Keep the momentum going and get things done.";
    icon = "fa-cloud-sun";
  } else if (hour >= 17 && hour < 21) {
    greeting = "Good evening";
    message = "A great time to wrap up your tasks and plan ahead.";
    icon = "fa-moon";
  } else {
    greeting = "Good night";
    message = "Take a moment to relax and prepare for tomorrow.";
    icon = "fa-moon";
  }

  greetingElement.innerHTML = `${greeting}, <span id="welcomeName">${userName}</span> 👋`;

  messageElement.textContent = message;

  if (welcomeIcon) {
    welcomeIcon.className = `fa-solid ${icon}`;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setupWelcomeGreeting();
});

document.addEventListener("DOMContentLoaded", function () {
  const noteForm = document.getElementById("noteForm");

  if (noteForm) {
    noteForm.addEventListener("submit", saveNote);

    notes = loadNotes();
    renderNotes();

    const noteDialog = document.getElementById("noteDialog");

    if (noteDialog) {
      noteDialog.addEventListener("click", function (event) {
        if (event.target === this) {
          closeNoteDialog();
        }
      });
    }
  }

  const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

  if (sidebarCollapsed) {
    const container = document.querySelector(".container");
    const sidebar = document.querySelector("aside.sidebar");

    if (container && sidebar) {
      container.classList.add("sidebar-collapsed");
      sidebar.classList.add("collapsed");
    }
  }

  const sidebarHeaderIcon = document.querySelector(".sidebar-header i");

  if (sidebarHeaderIcon) {
    sidebarHeaderIcon.addEventListener("click", toggleSidebarCollapse);
  }
});

let lightmode = localStorage.getItem("dark-mode");
const themeSwitch = document.getElementById("theme-switch");
const todoImg = document.getElementById("emptyImg");

const enableLightMode = () => {
  document.body.classList.add("dark-mode");
  localStorage.setItem("dark-mode", "active");

  if (themeSwitch) {
    themeSwitch.innerHTML = `<i class="fa-solid fa-sun"></i>`;
  }
  if (todoImg) {
    todoImg.innerHTML = ` <img class="empty-image" id="emptyImg" src="../../Assets/Todo-Img-Black.jpg" alt="empty" width="600">`;
  }
};

const disableLightMode = () => {
  document.body.classList.remove("dark-mode");
  localStorage.setItem("dark-mode", null);

  if (themeSwitch) {
    themeSwitch.innerHTML = `<i class="fa-solid fa-moon"></i>`;
  }
  if (todoImg) {
    todoImg.innerHTML = ` <img class="empty-image" id="emptyImg" src="../../Assets/Todo-Img-White.jpg" alt="empty" width="600">`;
  }
};

if (themeSwitch) {
  themeSwitch.addEventListener("click", () => {
    lightmode = localStorage.getItem("dark-mode");

    lightmode !== "active" ? enableLightMode() : disableLightMode();
  });
}

if (lightmode === "active") {
  enableLightMode();
}

function toggleMenu() {
  const sidebar = document.querySelector("aside.sidebar");
  const menuIcon = document.querySelector(".menu-btn i");

  if (sidebar) {
    sidebar.classList.toggle("menu-open");

    if (menuIcon) {
      const isOpen = sidebar.classList.contains("menu-open");

      if (isOpen) {
        menuIcon.classList.remove("fa-bars");
        menuIcon.classList.add("fa-xmark");
      } else {
        menuIcon.classList.remove("fa-xmark");
        menuIcon.classList.add("fa-bars");
      }
    }
  }
}

function toggleSidebarCollapse() {
  const container = document.querySelector(".container");
  const sidebar = document.querySelector("aside.sidebar");
  const sidebarIcon = document.querySelector(".sidebar-header i");

  if (container && sidebar) {
    container.classList.toggle("sidebar-collapsed");
    sidebar.classList.toggle("collapsed");

    const isCollapsed = sidebar.classList.contains("collapsed");

    if (sidebarIcon) {
      if (isCollapsed) {
        sidebarIcon.classList.remove("fa-xmark");
        sidebarIcon.classList.add("fa-ellipsis-vertical");
      } else {
        sidebarIcon.classList.remove("fa-ellipsis-vertical");
        sidebarIcon.classList.add("fa-xmark");
      }
    }

    localStorage.setItem(
      "sidebarCollapsed",
      sidebar.classList.contains("collapsed"),
    );
  }
}

const header = document.querySelector("header");

if (header) {
  window.addEventListener("scroll", function () {
    header.classList.toggle("sticky", window.scrollY > 100);
  });
}

// Installable PWA + offline app shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const appScript = document.querySelector('script[src*="app.js"]');
    const scriptUrl = appScript ? appScript.src : window.location.href;
    const workerUrl = new URL("service-worker.js", scriptUrl);
    navigator.serviceWorker.register(workerUrl.href, { scope: new URL("./", workerUrl).pathname })
      .catch((error) => console.warn("Workspaces offline setup failed:", error));
  });
}
