(function () {
  "use strict";

  /* ---------------- State ---------------- */
  var state = {
    user: { name: "Ananya", age: 19, school: "Sasurie College of Arts & Science" },
    firstName: "",
    tasks: [],
    notifs: [
      { id: "n0", icon: "🌷", title: "Welcome", body: "Welcome to Lavender Planner! Tap the + button to add your first activity. 💜", cat: "updates", time: Date.now() }
    ],
    activeTab: "all",
    showAll: false,
    navActive: "home",
    theme: "light",
    notifSettings: { reminders: true, alerts: true, updates: true }
  };

  var STORAGE_KEY = "aqua_planner_v1";

  function loadPersisted() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.user) {
        state.user = { name: "Ananya", age: 19, school: "Sasurie College of Arts & Science", ...saved.user };
      }
      if (saved.theme) state.theme = saved.theme;
      if (saved.notifSettings) state.notifSettings = { reminders: true, alerts: true, updates: true, ...saved.notifSettings };
      if (Array.isArray(saved.tasks)) state.tasks = saved.tasks;
      if (Array.isArray(saved.notifs) && saved.notifs.length) state.notifs = saved.notifs;
    } catch (e) { /* ignore */ }
  }

  function savePersisted() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: state.user,
        theme: state.theme,
        notifSettings: state.notifSettings,
        tasks: state.tasks,
        notifs: state.notifs
      }));
    } catch (e) { /* ignore */ }
  }

  var RING_CIRCUMFERENCE = 2 * Math.PI * 52; // r = 52

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- Helpers ---------------- */

  function fmtTime(t) {
    if (!t) return "";
    var parts = t.split(":");
    var h = parseInt(parts[0], 10);
    var m = parts[1] || "00";
    var ampm = h >= 12 ? "PM" : "AM";
    var hh = h % 12 === 0 ? 12 : h % 12;
    return hh + ":" + m + " " + ampm;
  }

  function fmtDate(d) {
    if (!d) return "";
    var date = new Date(d + "T00:00:00");
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()];
  }

  function emojiFor(name) {
    var n = name.toLowerCase();
    if (n.indexOf("read") !== -1) return "📖";
    if (n.indexOf("math") !== -1) return "📐";
    if (n.indexOf("assign") !== -1 || n.indexOf("homework") !== -1) return "📘";
    if (n.indexOf("exercise") !== -1 || n.indexOf("workout") !== -1 || n.indexOf("yoga") !== -1) return "🏃‍♀️";
    if (n.indexOf("study") !== -1 || n.indexOf("revis") !== -1 || n.indexOf("notes") !== -1) return "📚";
    if (n.indexOf("meet") !== -1 || n.indexOf("call") !== -1) return "📞";
    if (n.indexOf("water") !== -1) return "💧";
    if (n.indexOf("sleep") !== -1) return "😴";
    return "📝";
  }

  function counts() {
    var c = { completed: 0, pending: 0, missed: 0 };
    state.tasks.forEach(function (t) { c[t.status]++; });
    return c;
  }

  function todayPercent() {
    var c = counts();
    var base = c.completed + c.pending;
    return base === 0 ? 0 : Math.round((c.completed / base) * 100);
  }

  function setRing(el, percent) {
    var offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * percent) / 100;
    el.style.strokeDasharray = RING_CIRCUMFERENCE;
    el.style.strokeDashoffset = offset;
  }

  /* ---------------- Navigation ---------------- */

  var SCREENS_WITH_NAV = ["screen-home", "screen-create", "screen-progress", "screen-profile"];

  function goTo(id) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
    });
    $(id).classList.add("active");
    var app = document.querySelector(".app");
    app.scrollTop = 0;
    toggleNav(SCREENS_WITH_NAV.indexOf(id) !== -1);
  }

  function toggleNav(show) {
    $("bottom-nav").classList.toggle("hidden", !show);
  }

  function setNavActive(key) {
    state.navActive = key;
    document.querySelectorAll(".nav-item").forEach(function (b) {
      if (b.dataset.nav === "create") return;
      b.classList.toggle("active", b.dataset.nav === key);
    });
  }

  /* ---------------- Render ---------------- */

  function renderHomeList() {
    var list = $("home-activity-list");
    list.innerHTML = "";
    var items = state.tasks.filter(function (t) {
      if (state.showAll) return true;
      return t.status !== "completed";
    });
    if (items.length === 0) {
      list.innerHTML = '<div class="motivator-card"><span class="motivator-emoji">🌷</span><p>No activities yet! Tap the + button to plan your day.</p></div>';
      return;
    }
    items.forEach(function (t) {
      var card = document.createElement("div");
      card.className = "activity-card glass act-card" + (t.status === "completed" ? " completed" : "");
      card.innerHTML =
        '<div class="act-top">' +
          '<span class="act-emoji">' + emojiFor(t.name) + '</span>' +
          '<div class="act-info">' +
            '<h4>' + t.name + '</h4>' +
            '<p>' + fmtTime(t.start) + (t.status === "missed" ? " · Missed" : "") + '</p>' +
          '</div>' +
          '<span class="priority-badge ' + t.priority.toLowerCase() + '">' + t.priority + '</span>' +
        '</div>' +
        (t.desc ? '<p class="act-desc">' + t.desc + '</p>' : "") +
        '<div class="act-actions">' +
          '<button class="act-check' + (t.status === "completed" ? " done" : "") + '" data-id="' + t.id + '" aria-label="Toggle complete">✓</button>' +
          '<span style="font-size:12.5px;font-weight:800;color:var(--text-2)">' + (t.status === "completed" ? "Completed" : t.status === "missed" ? "Missed" : "Pending") + '</span>' +
        '</div>';
      list.appendChild(card);
    });
  }

  function renderStats() {
    var c = counts();
    var pct = todayPercent();
    $("stat-completed").textContent = c.completed;
    $("stat-pending").textContent = c.pending;
    $("stat-missed").textContent = c.missed;
    $("ring-value").textContent = pct + "%";
    setRing($("ring-fill"), pct);

    var total = c.completed + c.pending + c.missed;
    $("stat-total").textContent = total;
    $("stat-total-completed").textContent = c.completed;
    $("stat-total-pending").textContent = c.pending;
    $("stat-total-missed").textContent = c.missed;

    $("profile-total").textContent = total;
    $("profile-completed").textContent = c.completed;
    $("profile-pending").textContent = c.pending;
    $("profile-missed").textContent = c.missed;

    $("ring-fill-2").style.strokeDasharray = RING_CIRCUMFERENCE;
    $("ring-fill-2").style.strokeDashoffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * pct) / 100;
    $("ring-value-2").textContent = pct + "%";
    renderWeeklyChart();
  }

  function renderWeeklyChart() {
    var chart = document.querySelector(".chart");
    if (!chart) return;
    var cols = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    var counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    state.tasks.forEach(function (t) {
      if (t.status === "completed" && t.date) {
        var d = new Date(t.date + "T00:00:00");
        if (isNaN(d.getTime())) return;
        var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
        if (counts.hasOwnProperty(day)) counts[day]++;
      }
    });
    var max = 1;
    cols.forEach(function (c) { if (counts[c] > max) max = counts[c]; });
    var todayIdx = new Date().getDay(); // 0=Sun
    var todayKey = cols[(todayIdx + 6) % 7];
    chart.innerHTML = "";
    cols.forEach(function (c) {
      var pct = Math.round((counts[c] / max) * 100);
      var col = document.createElement("div");
      col.className = "bar-col" + (c === todayKey ? " today" : "");
      col.innerHTML =
        '<span class="bar-val">' + counts[c] + '</span>' +
        '<div class="bar"><span class="bar-fill" style="height:' + pct + '%"></span></div>' +
        '<span class="bar-day">' + c + '</span>';
      chart.appendChild(col);
    });
  }

  function applyUser() {
    var name = state.user.name;
    $("home-name").textContent = name;
    $("celeb-name").textContent = name;
    $("progress-name").textContent = name;
    $("profile-name").textContent = name;
    $("profile-age").textContent = state.user.age;
    $("profile-school").textContent = state.user.school;
    document.querySelectorAll(".notif-name").forEach(function (el) {
      el.textContent = name;
    });
  }

  /* ---------------- Confetti ---------------- */

  var CONFETTI_COLORS = ["#A78BFA", "#C4B5FD", "#F9A8D4", "#FBCFE8", "#FFFFFF", "#86D9A3", "#FFE8A3"];

  function confetti(layerId, count) {
    var layer = $(layerId);
    if (!layer) return;
    layer.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "confetti";
      p.style.left = Math.random() * 100 + "%";
      p.style.width = 6 + Math.random() * 7 + "px";
      p.style.height = 9 + Math.random() * 9 + "px";
      p.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      p.style.animationDuration = 2.4 + Math.random() * 2.6 + "s";
      p.style.animationDelay = Math.random() * 0.8 + "s";
      p.style.borderRadius = Math.random() > 0.5 ? "50%" : "3px";
      layer.appendChild(p);
    }
  }

  /* ---------------- Create preview ---------------- */

  function updatePreview() {
    var name = $("inp-task-name").value.trim() || "Complete Assignment";
    var date = $("inp-task-date").value;
    var start = $("inp-task-time").value;
    var end = $("inp-task-end").value;
    var desc = $("inp-task-desc").value.trim();
    var prio = getSelectedPriority();

    $("preview-name").textContent = name;
    $("preview-emoji").textContent = emojiFor(name);
    var meta = "";
    if (date) meta += fmtDate(date);
    if (start) meta += (meta ? " · " : "") + fmtTime(start);
    if (end) meta += " – " + fmtTime(end);
    $("preview-meta").textContent = meta || "Pick a date and time";
    var badge = $("preview-priority");
    badge.textContent = prio;
    badge.className = "priority-badge " + prio.toLowerCase();
    $("preview-desc").textContent = desc || "Add a short description for your activity.";
  }

  function getSelectedPriority() {
    var active = document.querySelector("#priority-pills .pill.active");
    return active ? active.dataset.priority : "Medium";
  }

  function fillCreateForm(task) {
    $("inp-task-name").value = task.name;
    $("inp-task-date").value = task.date || "";
    $("inp-task-time").value = task.start || "";
    $("inp-task-end").value = task.end || "";
    $("inp-task-desc").value = task.desc || "";
    document.querySelectorAll("#priority-pills .pill").forEach(function (p) {
      p.classList.toggle("active", p.dataset.priority === task.priority);
    });
    updatePreview();
  }

  /* ---------------- Toast ---------------- */

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .3s"; t.style.opacity = "0"; }, 2200);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------------- Notifications ---------------- */

  function addNotif(icon, title, body, cat) {
    if (cat === "reminders" && !state.notifSettings.reminders) return;
    if (cat === "updates" && !state.notifSettings.updates) return;
    state.notifs.unshift({ id: "n" + Date.now(), icon: icon, title: title, body: body, cat: cat, time: Date.now() });
    if (state.notifs.length > 20) state.notifs.length = 20;
    savePersisted();
    renderNotifs();
  }

  function renderNotifs() {
    var list = $("notif-list");
    if (!list) return;
    var key = state.activeTab;
    var items = state.notifs.filter(function (n) {
      return key === "all" || n.cat === key;
    });
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<div class="motivator-card"><span class="motivator-emoji">🔕</span><p>No notifications here yet. Add or complete activities to see updates!</p></div>';
      return;
    }
    items.forEach(function (n) {
      var card = document.createElement("div");
      card.className = "notif-card " + n.cat + " glass";
      card.innerHTML =
        '<div class="notif-icon">' + n.icon + '</div>' +
        '<div class="notif-body">' +
          '<h4>' + n.title + '</h4>' +
          '<p>' + n.body + '</p>' +
        '</div>';
      list.appendChild(card);
    });
  }

  /* ---------------- Theme ---------------- */

  function applyTheme(theme, persist) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    if (persist) {
      savePersisted();
      toast(state.theme === "dark" ? "Dark theme enabled 🌙" : "Light theme enabled ☀️");
    }
    document.querySelectorAll(".theme-opt").forEach(function (opt) {
      opt.classList.toggle("active", opt.dataset.themeChoice === state.theme);
    });
  }

  /* ---------------- Modals ---------------- */

  function openModal(id) {
    var backdrop = $("modal-backdrop");
    document.querySelectorAll(".modal").forEach(function (m) { m.classList.remove("open"); });
    $(id).classList.add("open");
    backdrop.classList.add("open");
  }

  function closeModal() {
    $("modal-backdrop").classList.remove("open");
    document.querySelectorAll(".modal").forEach(function (m) { m.classList.remove("open"); });
  }

  /* ---------------- Events ---------------- */

  function bind() {
    /* Welcome -> Home */
    $("btn-start").addEventListener("click", function () {
      var first = $("inp-firstname").value.trim();
      var age = parseInt($("inp-age").value, 10);
      var school = $("inp-school").value.trim();
      state.user.name = first || state.user.name;
      state.user.age = isNaN(age) ? state.user.age : age;
      state.user.school = school || state.user.school;
      applyUser();
      setNavActive("home");
      renderStats();
      goTo("screen-home");
    });

    /* Bell -> Notifications */
    $("btn-bell").addEventListener("click", function () { renderNotifs(); goTo("screen-notif"); });
    $("btn-notif-back").addEventListener("click", function () { goTo("screen-home"); });

    /* Create */
    $("btn-create-back").addEventListener("click", function () { goTo("screen-home"); });
    $("btn-see-all").addEventListener("click", function () {
      state.showAll = !state.showAll;
      this.textContent = state.showAll ? "Show less" : "See all";
      renderHomeList();
    });

    ["inp-task-name", "inp-task-date", "inp-task-time", "inp-task-end", "inp-task-desc"].forEach(function (id) {
      $(id).addEventListener("input", updatePreview);
    });

    document.querySelectorAll("#priority-pills .pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        document.querySelectorAll("#priority-pills .pill").forEach(function (p) { p.classList.remove("active"); });
        pill.classList.add("active");
        updatePreview();
      });
    });

    $("btn-add-activity").addEventListener("click", function () {
      var name = $("inp-task-name").value.trim();
      if (!name) {
        toast("Give your activity a name first ✨");
        return;
      }
      var task = {
        id: "t" + Date.now(),
        name: name,
        date: $("inp-task-date").value,
        start: $("inp-task-time").value,
        end: $("inp-task-end").value,
        priority: getSelectedPriority(),
        desc: $("inp-task-desc").value.trim(),
        status: "pending"
      };
      state.tasks.unshift(task);

      $("added-name").textContent = task.name;
      $("added-emoji").textContent = emojiFor(task.name);
      var meta = "";
      if (task.date) meta += fmtDate(task.date);
      if (task.start) meta += (meta ? " · " : "") + fmtTime(task.start);
      $("added-meta").textContent = meta || "Today";
      var ab = $("added-priority");
      ab.textContent = task.priority;
      ab.className = "priority-badge " + task.priority.toLowerCase();

      fillCreateForm({ name: "", date: "", start: "", end: "", desc: "", priority: "Medium" });
      goTo("screen-added");
      confetti("confetti-layer", 60);
      addNotif("📝", "Activity Added", "\"" + task.name + "\" was added to your schedule. 💜", "reminders");
      renderStats();
    });

    $("btn-back-home").addEventListener("click", function () {
      setNavActive("home");
      renderHomeList();
      renderStats();
      goTo("screen-home");
    });

    /* Complete task -> celebration */
    document.addEventListener("click", function (e) {
      var check = e.target.closest(".act-check");
      if (!check) return;
      var task = state.tasks.find(function (t) { return t.id === check.dataset.id; });
      if (!task) return;
      if (task.status === "completed") { toast("Already completed! 🎉"); return; }
      task.status = "completed";
      savePersisted();
      renderStats();
      addNotif("✅", "Task Completed", "Great job completing \"" + task.name + "\"! 🎉", "updates");
      $("completed-task-name").textContent = task.name;
      goTo("screen-completed");
      confetti("confetti-layer-2", 80);
    });

    $("btn-awesome").addEventListener("click", function () {
      setNavActive("home");
      renderHomeList();
      renderStats();
      goTo("screen-home");
    });

    /* Notifications tabs */
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        state.activeTab = tab.dataset.tab;
        renderNotifs();
      });
    });

    /* Progress back */
    $("btn-progress-back").addEventListener("click", function () { goTo("screen-home"); });

    /* Bottom nav */
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var nav = btn.dataset.nav;
        if (nav === "create") {
          goTo("screen-create");
          updatePreview();
          return;
        }
        if (nav === "home" || nav === "activities") {
          renderHomeList();
          renderStats();
          goTo("screen-home");
          setNavActive(nav);
          return;
        }
        if (nav === "progress") {
          renderStats();
          goTo("screen-progress");
          setNavActive(nav);
          return;
        }
        if (nav === "profile") {
          renderStats();
          goTo("screen-profile");
          setNavActive(nav);
        }
      });
    });

    /* Logout */
    $("btn-logout").addEventListener("click", function () {
      goTo("screen-welcome");
      toast("Logged out. See you soon! 👋");
    });

    /* ---- Settings: Edit Profile ---- */
    $("btn-edit-profile").addEventListener("click", function () {
      $("edit-name").value = state.user.name;
      $("edit-age").value = state.user.age;
      $("edit-school").value = state.user.school;
      openModal("modal-edit");
    });
    $("btn-edit-cancel").addEventListener("click", closeModal);
    $("btn-edit-save").addEventListener("click", function () {
      var name = $("edit-name").value.trim();
      var age = parseInt($("edit-age").value, 10);
      var school = $("edit-school").value.trim();
      if (!name) { toast("Name can't be empty ✨"); return; }
      state.user.name = name;
      state.user.age = isNaN(age) ? state.user.age : age;
      state.user.school = school || state.user.school;
      savePersisted();
      applyUser();
      closeModal();
      toast("Profile updated 💜");
    });

    /* ---- Settings: Notification toggles ---- */
    $("btn-notif-settings").addEventListener("click", function () {
      $("sw-reminders").checked = state.notifSettings.reminders;
      $("sw-alerts").checked = state.notifSettings.alerts;
      $("sw-updates").checked = state.notifSettings.updates;
      openModal("modal-notif");
    });
    $("btn-notif-close").addEventListener("click", closeModal);
    document.querySelectorAll(".switch input").forEach(function (sw) {
      sw.addEventListener("change", function () {
        var key = sw.id === "sw-reminders" ? "reminders" : sw.id === "sw-alerts" ? "alerts" : "updates";
        state.notifSettings[key] = sw.checked;
        savePersisted();
      });
    });

    /* ---- Settings: Theme picker ---- */
    $("btn-theme-picker").addEventListener("click", function () {
      document.querySelectorAll(".theme-opt").forEach(function (opt) {
        opt.classList.toggle("active", opt.dataset.themeChoice === state.theme);
      });
      openModal("modal-theme");
    });
    $("btn-theme-close").addEventListener("click", closeModal);
    document.querySelectorAll(".theme-opt").forEach(function (opt) {
      opt.addEventListener("click", function () {
        document.querySelectorAll(".theme-opt").forEach(function (o) { o.classList.remove("active"); });
        opt.classList.add("active");
      });
    });
    $("btn-theme-apply").addEventListener("click", function () {
      var choice = document.querySelector(".theme-opt.active");
      if (choice) applyTheme(choice.dataset.themeChoice, true);
      closeModal();
    });

    /* Quick theme toggle (profile header) */
    $("btn-theme-quick").addEventListener("click", function () {
      applyTheme(state.theme === "dark" ? "light" : "dark", true);
    });

    /* Close modal on backdrop click */
    $("modal-backdrop").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
  }

  /* ---------------- Init ---------------- */

  function init() {
    loadPersisted();
    var today = new Date();
    var iso = today.toISOString().split("T")[0];
    state.tasks.forEach(function (t) { if (!t.date) t.date = iso; });
    $("inp-task-date").value = iso;
    $("inp-task-time").value = "18:00";
    $("inp-task-end").value = "19:00";
    applyTheme(state.theme, false);
    applyUser();
    renderStats();
    renderHomeList();
    renderNotifs();
    updatePreview();
    setNavActive("home");
    bind();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
