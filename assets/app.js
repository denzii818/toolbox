const state = {
  categories: [],
  items: [],
  category: "all",
  view: "all",
  query: ""
};

const $ = (id) => document.getElementById(id);

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
  return num.toLocaleString("zh-CN");
}

function parseRepo(githubUrl) {
  if (!githubUrl) return null;
  const match = String(githubUrl).match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return `${match[1]}/${match[2].replace(/\.git$/, "")}`;
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

function renderFilters() {
  const box = $("filters");
  box.innerHTML = "";
  [{ id: "all", name: "全部" }, ...state.categories].forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat.name;
    if (state.category === cat.id) btn.className = "active";
    btn.onclick = () => {
      state.category = cat.id;
      render();
    };
    box.appendChild(btn);
  });
  $("featuredBtn").className = state.view === "featured" ? "active" : "";
  $("weekBtn").className = state.view === "week" ? "active" : "";
}

function statsHtml(item) {
  const parts = [];
  if (item.stars !== null && item.stars !== undefined && item.stars !== "") {
    parts.push(`<span class="stat">GitHub ${formatCount(item.stars)} Star</span>`);
  }
  if (item.tweetViews !== null && item.tweetViews !== undefined && item.tweetViews !== "") {
    parts.push(`<span class="stat">原推浏览 ${formatCount(item.tweetViews)}</span>`);
  }
  return parts.length ? `<div class="stats">${parts.join("")}</div>` : "";
}

function render() {
  renderFilters();
  const list = state.items.filter(matches);
  $("count").textContent = `共 ${list.length} 条`;
  const grid = $("grid");
  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = "<p class='meta'>没有匹配结果。换个词，或点「全部」。</p>";
    return;
  }

  const catName = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
  list.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    const newBadge = withinDays(item.added, 7) ? `<span class="badge">本周新</span>` : "";
    const featuredBadge = item.featured ? `<span class="badge">精选</span>` : "";
    card.innerHTML = `
      <div>${featuredBadge}${newBadge}<span class="badge">${catName[item.category] || item.category}</span></div>
      <h3>${item.name}</h3>
      ${statsHtml(item)}
      <p class="summary">${item.summary}</p>
      <p class="fit">适合：${item.suitable || "—"}</p>
      <p class="usage">我的用法：${item.usage || "—"}</p>
      <div class="tags">${(item.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="actions">
        <a class="primary" href="${item.url}" target="_blank" rel="noopener">打开</a>
        ${item.tweet ? `<a href="${item.tweet}" target="_blank" rel="noopener">原推</a>` : ""}
      </div>
    `;
    grid.appendChild(card);
  });
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
    } catch (err) {
      // 没有 GitHub 或接口限流时，继续用 JSON 里的快照
    }
  }
}

async function boot() {
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

$("q").addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

$("featuredBtn").addEventListener("click", () => {
  state.view = state.view === "featured" ? "all" : "featured";
  render();
});

$("weekBtn").addEventListener("click", () => {
  state.view = state.view === "week" ? "all" : "week";
  render();
});

boot();
