const state = {
  categories: [],
  items: [],
  category: "all",
  view: "all",
  layout: localStorage.getItem("toolbox-layout") || "card",
  query: "",
  page: 1,
  pageSize: Number(localStorage.getItem("toolbox-page-size")) || 12
};

const $ = (id) => document.getElementById(id);

const ICON_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.7.9-4.8 4.6 1.2 6.6L12 17.8 6 20.7l1.2-6.6L2.4 9.5l6.7-.9L12 2.5z"/></svg>`;
const ICON_EYE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-5.2 0-9.3 3.4-10.7 8 1.4 4.6 5.5 8 10.7 8s9.3-3.4 10.7-8C21.3 8.4 17.2 5 12 5zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z"/></svg>`;

function withinDays(dateStr, days) {
  const t = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(t.getTime())) return false;
  return Date.now() - t.getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatCount(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  if (num >= 10000) {
    const wan = num / 10000;
    const text = wan >= 100 ? wan.toFixed(0) : wan.toFixed(1);
    return text.replace(/\.0$/, "") + "万";
  }
  return num.toLocaleString("en-US");
}

function parseRepo(githubUrl) {
  if (!githubUrl) return null;
  const match = String(githubUrl).match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
}

function viewCount(item) {
  const n = Number(item.tweetViews);
  return Number.isFinite(n) ? n : -1;
}

function applyTheme(theme) {
  const next = theme || localStorage.getItem("toolbox-theme") || "auto";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("toolbox-theme", next);
  document.querySelectorAll("[data-theme-set]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-theme-set") === next);
  });
}

function matches(item) {
  if (state.view === "featured" && !item.featured) return false;
  if (state.view === "week" && !withinDays(item.added, 7)) return false;
  if (state.category !== "all" && item.category !== state.category) return false;
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  const blob = [
    item.name,
    item.summary,
    item.usage,
    item.suitable,
    item.notSuitable,
    (item.tags || []).join(" ")
  ].join(" ").toLowerCase();
  return blob.includes(q);
}

function visibleItems() {
  const list = state.items.filter(matches);
  if (state.view === "heat") {
    return list.slice().sort((a, b) => viewCount(b) - viewCount(a));
  }
  return list;
}

function changeView(next) {
  state.view = state.view === next ? "all" : next;
  state.page = 1;
  render();
}

function rankLabel(rank) {
  if (state.view !== "heat") return "";
  if (rank === 1) return `<span class="rank-inline top1">Top1</span>`;
  if (rank === 2) return `<span class="rank-inline top2">Top2</span>`;
  if (rank === 3) return `<span class="rank-inline top3">Top3</span>`;
  return `<span class="rank-inline">#${rank}</span>`;
}

function statsHtml(item) {
  const parts = [];
  if (item.stars !== null && item.stars !== undefined && item.stars !== "") {
    parts.push(`<span class="stat" title="GitHub Stars">${ICON_STAR}${formatCount(item.stars)}</span>`);
  }
  if (item.tweetViews !== null && item.tweetViews !== undefined && item.tweetViews !== "") {
    parts.push(`<span class="stat" title="原推浏览">${ICON_EYE}${formatCount(item.tweetViews)}</span>`);
  }
  return parts.length ? `<div class="stats">${parts.join("")}</div>` : `<div class="stats"></div>`;
}

function tagsHtml(item) {
  return `<div class="tags">${(item.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>`;
}

function hideOverflowTags() {
  if (state.layout !== "card") return;
  document.querySelectorAll(".grid:not(.list) .card-bottom .tags").forEach((el) => {
    el.style.display = "flex";
    if (el.scrollWidth > el.clientWidth + 1) el.style.display = "none";
  });
}

function renderFilters() {
  const box = $("filters");
  box.innerHTML = "";
  [{ id: "all", name: "全部" }, ...state.categories].forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat.name;
    if (state.category === cat.id) btn.className = "active";
    btn.onclick = () => {
      state.category = cat.id;
      state.page = 1;
      render();
    };
    box.appendChild(btn);
  });
  $("featuredBtn").className = state.view === "featured" ? "active" : "";
  $("weekBtn").className = state.view === "week" ? "active" : "";
  $("heatBtn").className = state.view === "heat" ? "active" : "";
  $("cardBtn").className = state.layout === "card" ? "active" : "";
  $("listBtn").className = state.layout === "list" ? "active" : "";
  document.querySelectorAll(".page-size [data-size]").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.size) === state.pageSize);
  });
}

function renderPager(total) {
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.page > pages) state.page = pages;
  const box = $("pager");
  box.innerHTML = "";

  const addBtn = (label, page, disabled, active) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (active) btn.className = "active";
    btn.disabled = disabled;
    btn.onclick = () => {
      if (disabled) return;
      state.page = page;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    box.appendChild(btn);
  };

  addBtn("上一页", state.page - 1, state.page <= 1, false);

  const windowSize = 5;
  let start = Math.max(1, state.page - 2);
  let end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  if (start > 1) addBtn("1", 1, false, state.page === 1);
  if (start > 2) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    box.appendChild(dots);
  }
  for (let i = start; i <= end; i += 1) addBtn(String(i), i, false, i === state.page);
  if (end < pages - 1) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    box.appendChild(dots);
  }
  if (end < pages) addBtn(String(pages), pages, false, state.page === pages);

  addBtn("下一页", state.page + 1, state.page >= pages, false);
}

function render() {
  renderFilters();
  const list = visibleItems();
  const pages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.page > pages) state.page = pages;
  const start = (state.page - 1) * state.pageSize;
  const pageItems = list.slice(start, start + state.pageSize);
  const label = state.view === "heat" ? "按浏览量" : "共";

  $("count").textContent = `${label} ${list.length} 条 · 第 ${state.page}/${pages} 页`;
  renderPager(list.length);

  const grid = $("grid");
  grid.className = state.layout === "list" ? "grid list" : "grid";
  grid.innerHTML = "";

  if (!pageItems.length) {
    grid.innerHTML = "<p class='count'>没有匹配结果。换个词，或点「全部」。</p>";
    return;
  }

  pageItems.forEach((item, index) => {
    const rank = start + index + 1;
    const card = document.createElement("article");
    card.className = "card";
    const topTags = state.layout === "list" ? tagsHtml(item) : "";
    const bottomTags = state.layout === "card" ? tagsHtml(item) : "";
    card.innerHTML = `
      <div class="card-top">
        ${topTags}
        ${statsHtml(item)}
      </div>
      <h3 title="${item.name}">${rankLabel(rank)}<span class="name">${item.name}</span></h3>
      <div class="list-body">
        <p class="summary" title="${item.summary}">${item.summary}</p>
        <p class="fit" title="${item.suitable || ""}">适合：${item.suitable || "—"}</p>
      </div>
      <p class="usage">我的用法：${item.usage || "—"}</p>
      <div class="card-bottom">
        ${bottomTags}
        <div class="actions">
          <a class="primary" href="${item.url}" target="_blank" rel="noopener">打开</a>
          ${item.tweet ? `<a href="${item.tweet}" target="_blank" rel="noopener">原推</a>` : ""}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  requestAnimationFrame(hideOverflowTags);
}

async function refreshStars() {
  const repos = [...new Set(state.items.map((item) => parseRepo(item.github)).filter(Boolean))];
  for (const repo of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (typeof data.stargazers_count !== "number") continue;
      state.items.forEach((item) => {
        if (parseRepo(item.github) === repo) item.stars = data.stargazers_count;
      });
      render();
    } catch (err) {}
  }
}

async function boot() {
  applyTheme();
  if (![12, 50, 100].includes(state.pageSize)) state.pageSize = 12;
  try {
    const [catsRes, itemsRes] = await Promise.all([
      fetch("./data/categories.json"),
      fetch("./data/resources.json")
    ]);
    if (!catsRes.ok || !itemsRes.ok) throw new Error("数据文件读取失败");
    state.categories = await catsRes.json();
    state.items = await itemsRes.json();
    render();
    refreshStars();
  } catch (err) {
    $("grid").innerHTML = `<p class="error">页面没读到数据。请确认两个 JSON 已提交，且格式正确。<br>${err.message}</p>`;
  }
}

document.querySelectorAll("[data-theme-set]").forEach((btn) => {
  btn.addEventListener("click", () => applyTheme(btn.getAttribute("data-theme-set")));
});

$("q").addEventListener("input", (e) => {
  state.query = e.target.value;
  state.page = 1;
  render();
});

$("featuredBtn").addEventListener("click", () => changeView("featured"));
$("weekBtn").addEventListener("click", () => changeView("week"));
$("heatBtn").addEventListener("click", () => changeView("heat"));

$("cardBtn").addEventListener("click", () => {
  state.layout = "card";
  localStorage.setItem("toolbox-layout", "card");
  render();
});

$("listBtn").addEventListener("click", () => {
  state.layout = "list";
  localStorage.setItem("toolbox-layout", "list");
  render();
});

document.querySelectorAll(".page-size [data-size]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.pageSize = Number(btn.dataset.size);
    state.page = 1;
    localStorage.setItem("toolbox-page-size", String(state.pageSize));
    render();
  });
});

window.addEventListener("resize", hideOverflowTags);

boot();
