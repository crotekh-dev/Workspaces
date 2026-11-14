(function () {
  const ALARM_KEY = "workspaces.alarms.v1";

  const timer = {
    total: 300,
    left: 300,
    ticking: false,
    id: null,
  };

  let alarms = [];

  document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("time-tools-page");
    bindTabs();
    bindTimer();
    bindAlarms();
    loadAlarms();
    renderAlarms();
    setInterval(checkAlarms, 1000);
  });

  function bindTabs() {
    document.querySelectorAll(".time-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        const name = tab.getAttribute("data-view");
        document.querySelectorAll(".time-tab").forEach(function (btn) {
          btn.classList.toggle("active", btn === tab);
        });
        document.querySelectorAll(".time-panel").forEach(function (panel) {
          panel.classList.toggle("hidden", panel.id !== "panel-" + name);
        });
      });
    });
  }

  function bindTimer() {
    const hours = document.getElementById("timerHours");
    const minutes = document.getElementById("timerMinutes");
    const seconds = document.getElementById("timerSeconds");
    const start = document.getElementById("timerStart");
    const pause = document.getElementById("timerPause");
    const reset = document.getElementById("timerReset");

    function readInputs() {
      const h = Math.max(0, Number(hours.value) || 0);
      const m = Math.max(0, Number(minutes.value) || 0);
      const s = Math.max(0, Number(seconds.value) || 0);
      return h * 3600 + m * 60 + s;
    }

    function applyTime(total) {
      timer.total = Math.max(1, total);
      timer.left = timer.total;
      paintTimer();
    }

    hours.addEventListener("change", function () {
      if (!timer.ticking) applyTime(readInputs());
    });
    minutes.addEventListener("change", function () {
      if (!timer.ticking) applyTime(readInputs());
    });
    seconds.addEventListener("change", function () {
      if (!timer.ticking) applyTime(readInputs());
    });

    document.querySelectorAll("[data-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (timer.ticking) return;
        applyTime(Number(btn.getAttribute("data-preset")));
        const parts = splitTime(timer.total);
        hours.value = parts.h;
        minutes.value = parts.m;
        seconds.value = parts.s;
      });
    });

    start.addEventListener("click", function () {
      if (timer.ticking) return;
      if (!timer.left) applyTime(readInputs());
      timer.ticking = true;
      setTimerStatus("Running");
      timer.id = setInterval(function () {
        timer.left -= 1;
        paintTimer();
        if (timer.left <= 0) {
          clearInterval(timer.id);
          timer.ticking = false;
          timer.left = 0;
          paintTimer();
          setTimerStatus("Time is up");
          beep();
          toast("Timer finished");
        }
      }, 1000);
    });

    pause.addEventListener("click", function () {
      if (!timer.ticking) return;
      timer.ticking = false;
      clearInterval(timer.id);
      setTimerStatus("Paused");
    });

    reset.addEventListener("click", function () {
      timer.ticking = false;
      clearInterval(timer.id);
      applyTime(readInputs());
      setTimerStatus("Set a time and press start");
    });

    paintTimer();
  }

  function paintTimer() {
    const display = document.getElementById("timerDisplay");
    const fill = document.getElementById("timerFill");
    display.textContent = formatTime(timer.left);
    const used = timer.total
      ? ((timer.total - timer.left) / timer.total) * 100
      : 0;
    fill.style.width = used + "%";
  }

  function setTimerStatus(text) {
    document.getElementById("timerStatus").textContent = text;
  }

  function bindAlarms() {
    document
      .getElementById("alarmForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        const time = document.getElementById("alarmTime").value;
        const label =
          document.getElementById("alarmLabel").value.trim() || "Alarm";
        if (!time) return;
        alarms.push({
          id: Date.now(),
          time: time,
          label: label,
          on: true,
          lastRing: "",
          daily: document.getElementById("alarmDaily").checked,
        });
        document.getElementById("alarmLabel").value = "";
        saveAlarms();
        renderAlarms();
        toast("Alarm added");
      });
  }

  function loadAlarms() {
    try {
      alarms = JSON.parse(localStorage.getItem(ALARM_KEY)) || [];
    } catch (err) {
      alarms = [];
    }
  }

  function saveAlarms() {
    localStorage.setItem(ALARM_KEY, JSON.stringify(alarms));
  }

  function renderAlarms() {
    const list = document.getElementById("alarmList");
    list.innerHTML = "";
    const empty = document.getElementById("alarmEmpty");
    if (empty) empty.style.display = alarms.length ? "none" : "block";
    if (!alarms.length) return;
    alarms.forEach(function (alarm) {
      const li = document.createElement("li");
      li.className = "alarm-card" + (alarm.on ? "" : " off");
      li.innerHTML =
        "<div><h4></h4><p></p></div>" +
        '<button class="icon-btn" type="button" data-act="toggle" aria-label="Toggle"></button>' +
        '<button class="icon-btn" type="button" data-act="delete" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>';
      li.querySelector("h4").textContent = alarm.time;
      li.querySelector("p").textContent =
        alarm.label + (alarm.daily ? " · Daily" : "");
      li.querySelector('[data-act="toggle"]').innerHTML = alarm.on
        ? '<i class="fa-solid fa-bell"></i>'
        : '<i class="fa-solid fa-bell-slash"></i>';
      li.querySelector('[data-act="toggle"]').addEventListener(
        "click",
        function () {
          alarm.on = !alarm.on;
          saveAlarms();
          renderAlarms();
        },
      );
      li.querySelector('[data-act="delete"]').addEventListener(
        "click",
        function () {
          alarms = alarms.filter(function (item) {
            return item.id !== alarm.id;
          });
          saveAlarms();
          renderAlarms();
        },
      );
      list.appendChild(li);
    });
  }

  function checkAlarms() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const stamp = hh + ":" + mm;
    const day = now.toDateString();
    alarms.forEach(function (alarm) {
      if (alarm.on && alarm.time === stamp && alarm.lastRing !== day + stamp) {
        alarm.lastRing = day + stamp;
        saveAlarms();
        beep();
        toast(alarm.label + " • " + alarm.time);
      }
    });
  }

  function splitTime(total) {
    return {
      h: Math.floor(total / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60,
    };
  }

  function formatTime(total) {
    const parts = splitTime(Math.max(0, total));
    return [parts.h, parts.m, parts.s]
      .map(function (n) {
        return String(n).padStart(2, "0");
      })
      .join(":");
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(function () {
        osc.stop();
        ctx.close();
      }, 700);
    } catch (err) {}
  }

  function toast(message) {
    let el = document.querySelector(".sw-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "sw-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      el.classList.remove("show");
    }, 2200);
  }
})();

let [seconds, minutes, hours] = [0, 0, 0];
let displayTime = document.getElementById("displayTime");
let timer = null;
function stopwatch() {
  seconds++;
  if (seconds == 60) {
    seconds = 0;
    minutes++;
    if (minutes == 60) {
      minutes = 0;
      hours++;
    }
  }
  let h = hours < 10 ? "0" + hours : hours;
  let m = minutes < 10 ? "0" + minutes : minutes;
  let s = seconds < 10 ? "0" + seconds : seconds;
  displayTime.innerHTML = h + ":" + m + ":" + s;
}
function watchStart() {
  if (timer !== null) {
    clearInterval(timer);
  }
  timer = setInterval(stopwatch, 1000);
}
function watchStop() {
  clearInterval(timer);
}
function watchReset() {
  clearInterval(timer);
  [seconds, minutes, hours] = [0, 0, 0];
  displayTime.innerHTML = "00:00:00";
}
