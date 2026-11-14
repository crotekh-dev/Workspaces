

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("workspaceSplash");

  if (!splash) return;

  setTimeout(() => {
    splash.classList.add("hide");

    splash.style.opacity = "0";
    splash.style.visibility = "hidden";
    splash.style.pointerEvents = "none";

    setTimeout(() => {
      splash.remove();
    }, 800);
  }, 2000);
});

let links = [];
let editingLinkId = null;
let currentFilter = "all";
let searchTerm = "";

const linksContainer = document.getElementById("linksContainer");
const linkDialog = document.getElementById("linkDialog");
const linkForm = document.getElementById("linkForm");

const linkName = document.getElementById("linkName");
const linkUrl = document.getElementById("linkUrl");
const linkCategory = document.getElementById("linkCategory");

const dialogTitle = document.getElementById("dialogTitle");

const addLinkBtn = document.getElementById("addLinkBtn");
const closeDialog = document.getElementById("closeDialog");
const cancelDialog = document.getElementById("cancelDialog");

const searchInput = document.getElementById("searchLinks");

const totalLinks = document.getElementById("totalLinks");
const totalCategories = document.getElementById("totalCategories");
const recentLinks = document.getElementById("recentLinks");

const notification = document.getElementById("linkNotification");
const notificationText = document.getElementById("notificationText");

function loadLinks() {
  try {
    const savedLinks = localStorage.getItem("workspaceLinks");

    if (!savedLinks) {
      return [];
    }

    const parsed = JSON.parse(savedLinks);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load links:", error);
    return [];
  }
}

function saveLinks() {
  localStorage.setItem("workspaceLinks", JSON.stringify(links));
}

function generateId() {
  return Date.now().toString();
}

function showLinkNotification(message) {
  if (!notification || !notificationText) {
    return;
  }

  notificationText.textContent = message;

  notification.classList.add("show");

  clearTimeout(showLinkNotification.timer);

  showLinkNotification.timer = setTimeout(() => {
    notification.classList.remove("show");
  }, 2500);
}

function openLinkDialog(linkId = null) {
  if (!linkDialog || !linkForm) {
    return;
  }

  if (linkId) {
    const link = links.find((item) => item.id === linkId);

    if (!link) {
      return;
    }

    editingLinkId = linkId;

    dialogTitle.textContent = "Edit Link";

    linkName.value = link.name || "";
    linkUrl.value = link.url || "";
    linkCategory.value = link.category || "";
  } else {
    editingLinkId = null;

    dialogTitle.textContent = "Add New Link";

    linkForm.reset();
  }

  if (!linkDialog.open) {
    linkDialog.showModal();
  }

  setTimeout(() => {
    linkName?.focus();
  }, 100);
}

function closeLinkDialog() {
  if (!linkDialog) {
    return;
  }

  if (linkDialog.open) {
    linkDialog.close();
  }

  editingLinkId = null;

  linkForm?.reset();
}

function saveLink(event) {
  event.preventDefault();

  const name = linkName.value.trim();
  const url = linkUrl.value.trim();
  const category = linkCategory.value;

  if (!name || !url || !category) {
    return;
  }

  if (editingLinkId) {
    const linkIndex = links.findIndex((link) => link.id === editingLinkId);

    if (linkIndex !== -1) {
      links[linkIndex] = {
        ...links[linkIndex],
        name,
        url,
        category,
      };

      showLinkNotification("Link updated successfully");
    }
  } else {
    links.unshift({
      id: generateId(),
      name,
      url,
      category,
      createdAt: Date.now(),
    });

    showLinkNotification("Link added successfully");
  }

  saveLinks();

  renderLinks();

  closeLinkDialog();
}

function deleteLink(linkId) {
  const link = links.find((item) => item.id === linkId);

  if (!link) {
    return;
  }

  const confirmed = confirm(`Delete "${link.name}"?`);

  if (!confirmed) {
    return;
  }

  links = links.filter((item) => item.id !== linkId);

  saveLinks();

  renderLinks();

  showLinkNotification("Link deleted");
}

function filterLinks(category) {
  currentFilter = category;

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.classList.remove("active");
  });

  const activeButton = document.querySelector(`[data-filter="${category}"]`);

  if (activeButton) {
    activeButton.classList.add("active");
  }

  renderLinks();
}

function searchLinks(value) {
  searchTerm = value.trim().toLowerCase();

  renderLinks();
}

function getFilteredLinks() {
  return links.filter((link) => {
    const matchesCategory =
      currentFilter === "all" || link.category === currentFilter;

    const matchesSearch =
      !searchTerm ||
      link.name.toLowerCase().includes(searchTerm) ||
      link.url.toLowerCase().includes(searchTerm) ||
      link.category.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });
}

function renderLinks() {
  if (!linksContainer) {
    return;
  }

  const filteredLinks = getFilteredLinks();

  if (filteredLinks.length === 0) {
    linksContainer.innerHTML = `
      <div class="empty-links">
        <i class="fa-solid fa-link"></i>

        <h3>
          ${
            searchTerm
              ? "No links found"
              : currentFilter === "all"
                ? "No links yet"
                : `No ${capitalize(currentFilter)} links`
          }
        </h3>

        <p>
          ${
            searchTerm
              ? "Try a different search."
              : "Add your first link to get started."
          }
        </p>
      </div>
    `;

    updateStats();

    return;
  }

  linksContainer.innerHTML = filteredLinks
    .map((link) => {
      const safeId = escapeHTML(String(link.id));

      const safeName = escapeHTML(link.name);

      const safeUrl = escapeHTML(link.url);

      const safeCategory = escapeHTML(link.category);

      return `
          <article
            class="link-card"
            data-link-id="${safeId}"
          >

            <div class="link-card-icon">
              <i class="fa-solid fa-link"></i>
            </div>

            <div class="link-info">

              <a
                class="link-name"
                href="${safeUrl}"
                target="_blank"
                rel="noopener noreferrer"
                title="Open ${safeName}"
              >
                ${safeName}
              </a>

              <p class="link-url">
                ${escapeHTML(getDomain(link.url))}
              </p>

              <div
                class="link-url-row"
                id="url-${safeId}"
              >
                <a
                  href="${safeUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${safeUrl}
                </a>
              </div>

            </div>

            <span class="link-category">
              ${capitalize(safeCategory)}
            </span>

            <button
              class="link-expand"
              type="button"
              onclick="toggleLinkUrl('${safeId}', this)"
              title="Show link"
              aria-label="Show link URL"
            >
              <i class="fa-solid fa-chevron-down"></i>
            </button>

            <div class="link-actions">

              <button
                class="link-action"
                type="button"
                onclick="openLinkDialog('${safeId}')"
                title="Edit link"
                aria-label="Edit link"
              >
                <i class="fa-solid fa-pen"></i>
              </button>

              <button
                class="link-action delete"
                type="button"
                onclick="deleteLink('${safeId}')"
                title="Delete link"
                aria-label="Delete link"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>

          </article>
        `;
    })
    .join("");

  updateStats();
}

function toggleLinkUrl(linkId, button) {
  const urlRow = document.getElementById(`url-${linkId}`);

  if (!urlRow) {
    return;
  }

  const isOpen = urlRow.classList.toggle("show");

  button.classList.toggle("open", isOpen);
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function capitalize(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function updateStats() {
  if (totalLinks) {
    totalLinks.textContent = links.length;
  }

  if (totalCategories) {
    totalCategories.textContent = new Set(
      links.map((link) => link.category),
    ).size;
  }

  if (recentLinks) {
    const day = 24 * 60 * 60 * 1000;

    recentLinks.textContent = links.filter(
      (link) => link.createdAt && Date.now() - Number(link.createdAt) < day,
    ).length;
  }
}

function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = String(value ?? "");

  return div.innerHTML;
}

function setupLinksGreeting() {
  const greetingElement = document.querySelector(".welcome-greeting");

  const nameElement = document.getElementById("welcomeName");

  const messageElement = document.getElementById("welcomeMessage");

  const avatarElement = document.querySelector(".user-avatar");

  const welcomeIcon = document.querySelector(".welcome-icon i");

  if (!greetingElement || !nameElement || !messageElement) {
    return;
  }

  let userName = localStorage.getItem("workspaceUserName");

  if (!userName || !userName.trim()) {
    userName = "User";
  }

  userName = userName.trim();

  localStorage.setItem("workspaceUserName", userName);

  if (avatarElement) {
    avatarElement.textContent = userName.charAt(0).toUpperCase();
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

  greetingElement.innerHTML = `
    ${greeting},
    <span id="welcomeName">
      ${escapeHTML(userName)}
    </span>
    👋
  `;

  messageElement.textContent = message;

  if (welcomeIcon) {
    welcomeIcon.className = `fa-solid ${icon}`;
  }
}

function setupLinksTheme() {
  const themeSwitch = document.getElementById("theme-switch");

  if (!themeSwitch) {
    return;
  }

  let darkMode = localStorage.getItem("dark-mode") === "active";

  function applyTheme() {
    document.body.classList.toggle("dark-mode", darkMode);

    themeSwitch.innerHTML = darkMode
      ? `<i class="fa-solid fa-sun"></i>`
      : `<i class="fa-solid fa-moon"></i>`;
  }

  applyTheme();

  /*
    Capture the click here so this page always
    gets the correct theme without changing app.js.
  */

  themeSwitch.addEventListener(
    "click",
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      darkMode = !document.body.classList.contains("dark-mode");

      localStorage.setItem("dark-mode", darkMode ? "active" : "null");

      applyTheme();
    },
    true,
  );
}

document.addEventListener("DOMContentLoaded", () => {
  links = loadLinks();

  renderLinks();

  setupLinksGreeting();

  setupLinksTheme();

  if (linkForm) {
    linkForm.addEventListener("submit", saveLink);
  }

  if (addLinkBtn) {
    addLinkBtn.addEventListener("click", () => openLinkDialog());
  }

  if (closeDialog) {
    closeDialog.addEventListener("click", closeLinkDialog);
  }

  if (cancelDialog) {
    cancelDialog.addEventListener("click", closeLinkDialog);
  }

  if (linkDialog) {
    linkDialog.addEventListener("click", (event) => {
      if (event.target === linkDialog) {
        closeLinkDialog();
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchLinks(event.target.value);
    });
  }

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      filterLinks(button.dataset.filter);
    });
  });

  /* -------------------------------------------------------
     MOBILE SIDEBAR / HAMBURGER
     Keep this handler here so Links has one reliable menu
     controller. stopImmediatePropagation prevents a shared
     app.js handler from toggling the menu a second time.
     ------------------------------------------------------- */
  const menuBtn = document.getElementById("menu-btn");
  const sidebar = document.querySelector(".sidebar");
  const container = document.querySelector(".container");

  if (menuBtn && sidebar && container) {
    menuBtn.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        container.classList.toggle("sidebar-open");
        menuBtn.setAttribute(
          "aria-expanded",
          container.classList.contains("sidebar-open") ? "true" : "false",
        );
      },
      true,
    );

    document.addEventListener("click", (event) => {
      if (
        container.classList.contains("sidebar-open") &&
        !sidebar.contains(event.target) &&
        !menuBtn.contains(event.target)
      ) {
        container.classList.remove("sidebar-open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    sidebar.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        container.classList.remove("sidebar-open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }
});
