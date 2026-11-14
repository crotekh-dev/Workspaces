(() => {
  "use strict";

  const page = document.querySelector(".about-page");
  if (!page) return;

  page.classList.add("ab-js");

  const scroller = page.closest("main");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const toTop = () => {
    if (scroller) scroller.scrollTop = 0;
  };

  toTop();
  window.addEventListener("load", toTop);
  window.addEventListener("pageshow", toTop);

  const SHOT_PATH = "../../Assets/About/";
  const currentMode = () =>
    document.body.classList.contains("dark-mode") ? "dark" : "light";

  const shots = Array.from(page.querySelectorAll("img[data-shot]"));

  const resolveShot = (img) => {
    const mode = currentMode();
    if (img.dataset.mode === mode) return;

    img.dataset.mode = mode;
    const name = img.dataset.shot;
    const candidates = [
      `${SHOT_PATH}shot-${name}-${mode}.png`,
      `${SHOT_PATH}shot-${name}.png`,
    ];

    const tryNext = (index) => {
      if (img.dataset.mode !== mode) return; // theme changed meanwhile
      if (index >= candidates.length) {
        img.hidden = true;
        img.removeAttribute("src");
        return;
      }

      const probe = new Image();
      probe.onload = () => {
        if (img.dataset.mode !== mode) return;
        img.src = candidates[index];
        img.hidden = false;
      };
      probe.onerror = () => tryNext(index + 1);
      probe.src = candidates[index];
    };

    tryNext(0);
  };

  // Only resolve what is on screen; the rest resolve when their tab opens.
  const refreshVisibleShots = () => {
    shots.forEach((img) => {
      const panel = img.closest(".ab-panel");
      if (!panel || !panel.hidden) resolveShot(img);
    });
  };

  new MutationObserver(refreshVisibleShots).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const revealItems = Array.from(page.querySelectorAll(".ab-reveal"));

  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const tools = page.querySelector(".ab-tools");

  if (tools) {
    const tabList = tools.querySelector(".ab-tabs");
    const tabs = Array.from(tools.querySelectorAll(".ab-tab"));
    const panels = Array.from(tools.querySelectorAll(".ab-panel"));

    // Scrolls only the tab strip sideways; never moves the page itself.
    const centerTab = (tab) => {
      if (!tabList) return;
      const left =
        tab.offsetLeft - (tabList.clientWidth - tab.offsetWidth) / 2;
      tabList.scrollTo({
        left: Math.max(0, left),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    const selectTab = (index, { focus = false, center = false } = {}) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        if (panels[i]) panels[i].hidden = !active;
      });

      const current = tabs[index];
      if (!current) return;
      if (focus) current.focus({ preventScroll: true });
      if (center) centerTab(current);

      const shot = panels[index] && panels[index].querySelector("img[data-shot]");
      if (shot) resolveShot(shot);
    };

    if (tabs.length && tabs.length === panels.length) {
      tools.classList.add("is-tabbed");

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () =>
          selectTab(index, { center: true }),
        );

        tab.addEventListener("keydown", (event) => {
          const last = tabs.length - 1;
          let next = null;

          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            next = index === last ? 0 : index + 1;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            next = index === 0 ? last : index - 1;
          } else if (event.key === "Home") {
            next = 0;
          } else if (event.key === "End") {
            next = last;
          }

          if (next === null) return;
          event.preventDefault();
          selectTab(next, { focus: true, center: true });
        });
      });

      selectTab(0);
    } else {
      refreshVisibleShots();
    }
  } else {
    refreshVisibleShots();
  }

  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  };

  const stats = {
    notes: readList("quickNotes").length,
    tasks: readList("workspaces.todo.tasks.v1").filter(
      (task) => task && task.completed === true,
    ).length,
    events: readList("workspaces-calendar-events-v1").length,
    links: readList("workspaceLinks").length,
  };

  const statNodes = Array.from(page.querySelectorAll("[data-stat]"));

  const formatNumber = (value) => value.toLocaleString();

  const animateCount = (node, target) => {
    if (reduceMotion || target === 0) {
      node.textContent = formatNumber(target);
      return;
    }

    const duration = 1000;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatNumber(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  statNodes.forEach((node) => {
    node.textContent = "0";
  });

  const statsBox = page.querySelector(".ab-stats");

  const runStats = () => {
    statNodes.forEach((node) => {
      animateCount(node, stats[node.dataset.stat] || 0);
    });
  };

  if (statsBox && "IntersectionObserver" in window) {
    const statsObserver = new IntersectionObserver(
      (entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        runStats();
      },
      { threshold: 0.35 },
    );
    statsObserver.observe(statsBox);
  } else {
    runStats();
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    page.querySelectorAll(".ab-spot").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
  }
})();

(() => {
  const button = document.getElementById("installAppButton");
  const hint = document.getElementById("installAppHint");
  if (!button) return;
  let installPrompt = null;

  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) {
    button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> App installed';
    button.disabled = true;
    if (hint) hint.textContent = "Workspaces is already installed on this device.";
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
    if (hint) hint.textContent = "Install Workspaces directly from your browser.";
  });

  button.addEventListener("click", async () => {
    if (!installPrompt) {
      if (hint) hint.textContent = "If the install prompt is unavailable, open your browser menu and choose “Install app” or “Add to Home screen”.";
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (hint) hint.textContent = choice.outcome === "accepted" ? "Workspaces is being added to your device." : "You can install Workspaces whenever you are ready.";
    installPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> App installed';
    button.disabled = true;
    if (hint) hint.textContent = "Workspaces has been installed successfully.";
  });
})();
