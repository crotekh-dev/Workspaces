const CACHE_NAME = "workspaces-shell-v1";
const APP_SHELL = ["./ffbd6ceb-8fc8-448e-b02a-a707ad0fbd3d.png", "./index.html", "./app.js", "./manifest.webmanifest", "./style.css", "./Assets/Todo-Img-Black.jpg", "./Assets/Todo-Img-Completed-White.jpg", "./Assets/icon-192.png", "./Assets/Todo-Img-White.jpg", "./Assets/icon-512.png", "./Assets/big-img.png", "./Assets/icon.png", "./Assets/Todo-Img-Completed-Black.jpg", "./Assets/About/shot-todo-dark.png", "./Assets/About/shot-links-dark.png", "./Assets/About/shot-notes-dark.png", "./Assets/About/shot-links-light.png", "./Assets/About/shot-notes-light.png", "./Assets/About/shot-calendar-light.png", "./Assets/About/shot-calculator-dark.png", "./Assets/About/shot-calculator-light.png", "./Assets/About/raymond.jpg", "./Assets/About/shot-stopwatch-light.png", "./Assets/About/shot-calendar-dark.png", "./Assets/About/shot-stopwatch-dark.png", "./Assets/About/shot-todo-light.png", "./Components/Links/links.js", "./Components/Links/links.css", "./Components/Links/links.html", "./Components/About/about.css", "./Components/About/about.html", "./Components/About/about.js", "./Components/Calendar/calendar.js", "./Components/Calendar/calendar.html", "./Components/Calendar/calendar.css", "./Components/Stopwatch/stopwatch.js", "./Components/Stopwatch/stopwatch.css", "./Components/Stopwatch/stopwatch.html", "./Components/Forms/form.css", "./Components/Forms/bug-report.html", "./Components/Forms/form.js", "./Components/Forms/contact.html", "./Components/Forms/feature-suggest.html", "./Components/Calculator/calculator.html", "./Components/Calculator/calculator.js", "./Components/Calculator/calculator.css", "./Components/Todo/todo.html", "./Components/Todo/todo.css", "./Components/Todo/todo.js", "./Components/Clock/clock.css", "./Components/Clock/clock.js", "./fontawesome-free-7.2.0-web/fontawesome-free-7.2.0-web/webfonts/fa-regular-400.woff2", "./fontawesome-free-7.2.0-web/fontawesome-free-7.2.0-web/webfonts/fa-v4compatibility.woff2", "./fontawesome-free-7.2.0-web/fontawesome-free-7.2.0-web/webfonts/fa-solid-900.woff2", "./fontawesome-free-7.2.0-web/fontawesome-free-7.2.0-web/webfonts/fa-brands-400.woff2", "./fontawesome-free-7.2.0-web/fontawesome-free-7.2.0-web/css/all.min.css"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const path = new URL(request.url).pathname;
        const knownPage = APP_SHELL.find((item) => new URL(item, self.registration.scope).pathname === path);
        return knownPage ? caches.match(knownPage) : caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
