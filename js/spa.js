function loadTableStates() {
  try {
    return JSON.parse(localStorage.getItem("yasou_spa_table_states") || "{}");
  } catch (err) {
    localStorage.removeItem("yasou_spa_table_states");
    return {};
  }
}

function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

const MENU_STORAGE_KEY = "yasou_spa_menu_data";
const ORIGINAL_MENU_DATA = cloneValue(MENU_DATA);

function loadSavedMenuData() {
  try {
    const saved = JSON.parse(localStorage.getItem(MENU_STORAGE_KEY) || "null");
    if (!saved || !Array.isArray(saved.categories) || !Array.isArray(saved.items)) return;
    MENU_DATA.categories = saved.categories;
    MENU_DATA.items = saved.items;
  } catch (err) {
    localStorage.removeItem(MENU_STORAGE_KEY);
  }
}

loadSavedMenuData();

const appState = {
  view: "tables",
  lang: "he",
  publicCategory: "all",
  orderCategory: MENU_DATA.categories[0].id,
  menuEditorCategory: "all",
  menuEditorSearch: "",
  menuEditorItemId: MENU_DATA.items[0]?.id || null,
  station: "all",
  activeTable: null,
  cart: [],
  orders: [],
  tableStates: loadTableStates()
};

const zoneMeta = {
  outside: { title: "מתחם חיצוני", sub: "25-34", className: "outside" },
  covered: { title: "מתחם מקורה", sub: "18-24", className: "covered" },
  inside: { title: "מתחם פנימי", sub: "1-17", className: "inside" }
};

const stationLabels = {
  hot: "מטבח חם",
  cold: "מטבח קר",
  bar: "בר"
};

const BAR_CATEGORY_IDS = ["beer", "cocktails", "ouzo", "whiskey", "vodka"];
const PUBLIC_CATEGORY_GROUPS = [
  { id: "bar_drinks", categoryIds: BAR_CATEGORY_IDS, name: { he: "משקאות חריפים", en: "Alcoholic Drinks", gr: "Αλκοολούχα ποτά" } }
];
const BAR_SECTION_LABELS = {
  beer: { he: "בירות", en: "Beers", gr: "Μπύρες" },
  cocktails: { he: "קוקטיילים", en: "Cocktails", gr: "Κοκτέιλ" },
  ouzo: { he: "אוזו", en: "Ouzo", gr: "Ούζο" },
  whiskey: { he: "וויסקי", en: "Whiskey", gr: "Ουίσκι" },
  vodka: { he: "וודקה", en: "Vodka", gr: "Βότκα" }
};

let toastTimer;

function saveTableStates() {
  localStorage.setItem("yasou_spa_table_states", JSON.stringify(appState.tableStates));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function setView(view) {
  appState.view = view;
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  document.querySelectorAll("[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  document.getElementById("side").classList.remove("open");
  document.getElementById("screenShade").classList.remove("open");

  if (view === "pos") renderCashier();
  if (view === "kitchen") loadKitchenOrders();
  if (view === "active") renderActiveOrders();
  if (view === "menu-editor") renderMenuEditor();
  updateNotice();
}

function updateNotice() {
  document.body.dataset.view = appState.view;
  const title = document.getElementById("noticeTitle");
  const text = document.getElementById("noticeText");
  if (appState.view === "tables") {
    title.textContent = "ניהול שולחנות";
    text.textContent = "בחר שולחן כדי לפתוח הזמנה חדשה.";
  } else if (appState.view === "menu") {
    title.textContent = "תפריט לקוחות";
    text.textContent = "תצוגה ציבורית בשלוש שפות.";
  } else if (appState.view === "menu-editor") {
    title.textContent = "עריכת תפריט";
    text.textContent = "עדכון מנות, מחירים, קטגוריות ועמדות הכנה.";
  } else if (appState.view === "active") {
    title.textContent = "הזמנות פעילות";
    text.textContent = "כאן המלצר חוזר לשולחנות שכבר פתוחים.";
  } else if (appState.view === "pos") {
    title.textContent = "קופה";
    text.textContent = "סיכום תשלומים וסגירת שולחנות.";
  } else if (appState.view === "kitchen") {
    title.textContent = "מטבח";
    text.textContent = "הזמנות פתוחות לפי עמדות הכנה.";
  } else if (appState.view === "settings") {
    title.textContent = "הגדרות";
    text.textContent = "העדפות מערכת ופרטי מסעדה.";
  } else {
    title.textContent = "מערכת הזמנות";
    text.textContent = "בחר פעולה מהתפריט.";
  }
}

function getTableStatus(tableId) {
  return appState.tableStates[tableId]?.status || "free";
}

function getTableTotal(tableId) {
  return appState.tableStates[tableId]?.total || 0;
}

function activeTableEntries() {
  return Object.entries(appState.tableStates)
    .map(([tableId, data]) => ({ tableId: Number(tableId), ...data }))
    .filter(entry => entry.status === "reserved" || entry.status === "occupied")
    .sort((a, b) => a.tableId - b.tableId);
}

function renderTables() {
  const board = document.getElementById("tableZones");
  board.innerHTML = "";

  ["outside", "covered", "inside"].forEach(zone => renderZoneMap(board, zone));
}

function makeZone(zone, content) {
  const meta = zoneMeta[zone];
  const section = document.createElement("section");
  section.className = `zone-card ${meta.className}`;
  section.innerHTML = `
    <div class="zone-head">
      <h2>${meta.title}</h2>
      <span>${meta.sub}</span>
    </div>
  `;
  section.appendChild(content);
  return section;
}

function renderZoneMap(board, zone) {
  const canvas = document.createElement("div");
  canvas.className = `table-map ${zone}`;
  TABLE_BLUEPRINT
    .filter(table => table.zone === zone)
    .forEach(table => canvas.appendChild(tableButton(table.id)));
  board.appendChild(makeZone(zone, canvas));
}

function tableButton(id) {
  const def = TABLE_BLUEPRINT.find(table => table.id === id);
  const status = getTableStatus(id);
  const tableState = appState.tableStates[id] || {};
  const customerName = (tableState.customerName || "").trim();
  const guestCount = (tableState.guestCount || "").toString().trim();
  const btn = document.createElement("button");
  btn.className = `table-tile ${status} ${def.round ? "circle" : ""}`;
  btn.type = "button";
  btn.style.left = def.x + "%";
  btn.style.top = def.y + "%";
  btn.style.width = `clamp(${Math.round(def.w * 0.74)}px, ${def.w / 9}vw, ${def.w}px)`;
  btn.style.height = `clamp(${Math.round(def.h * 0.74)}px, ${def.h / 9}vw, ${def.h}px)`;
  btn.innerHTML = `
    <span class="table-id">${id}</span>
    ${(customerName || guestCount) ? `<span class="customer-label">${escapeHtml(customerName || "ללא שם")}${guestCount ? ` · ${escapeHtml(guestCount)} סועדים` : ""}</span>` : ""}
    <span class="table-seats">${def?.seats || ""}</span>
    ${status !== "free" ? `<span class="table-state">${status === "reserved" ? "שמור" : getTableTotal(id) + "€"}</span>` : ""}
  `;
  btn.onclick = () => openOrder(id);
  return btn;
}

function openOrder(tableId) {
  appState.activeTable = tableId;
  appState.cart = cloneValue(appState.tableStates[tableId]?.items || []);
  document.getElementById("customerNameInput").value = appState.tableStates[tableId]?.customerName || "";
  document.getElementById("guestCountInput").value = appState.tableStates[tableId]?.guestCount || "";
  appState.orderCategory = MENU_DATA.categories[0].id;
  document.getElementById("orderTableNumber").textContent = "#" + tableId;
  document.getElementById("orderTitle").textContent = `שולחן ${tableId}`;
  document.getElementById("orderSubtitle").textContent = `${TABLE_BLUEPRINT.find(t => t.id === tableId)?.seats || ""} מקומות`;
  document.getElementById("searchInput").value = "";
  document.getElementById("orderModal").classList.add("open");
  renderOrderCategories();
  renderOrderItems();
  renderCart();
}

function syncActiveCustomerName() {
  if (!appState.activeTable) return;
  const customerName = document.getElementById("customerNameInput").value.trim();
  const guestCount = document.getElementById("guestCountInput").value.trim();
  const previous = appState.tableStates[appState.activeTable] || {};

  if (!customerName && !guestCount && !previous.status && !(previous.items || []).length) {
    delete appState.tableStates[appState.activeTable];
  } else {
    appState.tableStates[appState.activeTable] = {
      ...previous,
      status: previous.status || "free",
      customerName,
      guestCount,
      items: appState.cart,
      total: cartTotal(),
      updatedAt: new Date().toISOString()
    };
  }

  saveTableStates();
  renderTables();
  renderActiveOrders();
}

function closeOrder() {
  document.getElementById("orderModal").classList.remove("open");
}

function renderOrderCategories() {
  const el = document.getElementById("orderCategories");
  el.innerHTML = "";
  MENU_DATA.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cat.id === appState.orderCategory ? "active" : "";
    btn.textContent = cat.name.he;
    btn.onclick = () => {
      appState.orderCategory = cat.id;
      renderOrderCategories();
      renderOrderItems();
    };
    el.appendChild(btn);
  });
}

function renderOrderItems() {
  const grid = document.getElementById("orderItems");
  const search = document.getElementById("searchInput").value.trim();
  grid.innerHTML = "";

  MENU_DATA.items
    .filter(item => item.category === appState.orderCategory)
    .filter(item => !search || item.name.he.includes(search) || item.name.en.toLowerCase().includes(search.toLowerCase()))
    .forEach(item => {
      const card = document.createElement("div");
      card.className = "order-item";
      card.innerHTML = `
        <div>
          <strong>${item.name.he}</strong>
          <span>${priceLabel(item)}</span>
        </div>
        <button class="add-btn" type="button" aria-label="הוסף מנה">+</button>
      `;
      card.querySelector("button").onclick = () => addItem(item);
      grid.appendChild(card);
    });
}

function priceLabel(item) {
  if (item.price !== null) return item.price + "€";
  return item.variants.map(v => `${v.label.he} ${v.price}€`).join(" / ");
}

function addItem(item) {
  const variant = item.variants ? item.variants[0] : null;
  const unitPrice = variant ? variant.price : item.price;
  const variantLabel = variant ? variant.label.he : null;
  const lineKey = item.id + "::" + (variantLabel || "");
  const existing = appState.cart.find(line => line.lineKey === lineKey);

  if (existing) {
    existing.qty += 1;
  } else {
    appState.cart.push({
      lineId: Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      lineKey,
      itemId: item.id,
      station: item.station,
      name: item.name.he,
      unitPrice,
      qty: 1,
      note: "",
      variantLabel
    });
  }

  renderCart();
}

function cartTotal() {
  return appState.cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

function cartCount() {
  return appState.cart.reduce((sum, line) => sum + line.qty, 0);
}

function renderCart() {
  const lines = document.getElementById("cartLines");
  lines.innerHTML = "";
  document.getElementById("cartCount").textContent = cartCount() + " פריטים";
  document.getElementById("cartTotal").textContent = cartTotal() + "€";
  document.getElementById("sendButton").disabled = appState.cart.length === 0;

  if (appState.cart.length === 0) {
    lines.innerHTML = `<div class="empty">עדיין אין מנות בהזמנה</div>`;
    return;
  }

  appState.cart.forEach(line => {
    const row = document.createElement("div");
    row.className = "cart-line";
    const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
    row.innerHTML = `
      <div class="cart-line-top">
        <span>${line.qty}x ${line.name}${variant}</span>
        <span>${line.qty * line.unitPrice}€</span>
      </div>
      <div class="qty-row">
        <button type="button" data-delta="-1">−</button>
        <button type="button" data-delta="1">+</button>
        <input type="text" value="${line.note || ""}" placeholder="הערה">
      </div>
    `;
    row.querySelector('[data-delta="-1"]').onclick = () => changeLineQty(line.lineId, -1);
    row.querySelector('[data-delta="1"]').onclick = () => changeLineQty(line.lineId, 1);
    row.querySelector("input").oninput = event => {
      line.note = event.target.value;
    };
    lines.appendChild(row);
  });
}

function changeLineQty(lineId, delta) {
  const line = appState.cart.find(item => item.lineId === lineId);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) {
    appState.cart = appState.cart.filter(item => item.lineId !== lineId);
  }
  renderCart();
}

function reserveTable() {
  if (!appState.activeTable) return;
  const customerName = document.getElementById("customerNameInput").value.trim();
  const guestCount = document.getElementById("guestCountInput").value.trim();
  appState.tableStates[appState.activeTable] = {
    status: "reserved",
    customerName,
    guestCount,
    items: appState.cart,
    total: cartTotal(),
    updatedAt: new Date().toISOString()
  };
  saveTableStates();
  renderTables();
  renderActiveOrders();
  closeOrder();
  showToast("השולחן סומן כשמור");
}

async function sendOrder() {
  if (!appState.activeTable || appState.cart.length === 0) return;
  const table = appState.activeTable;
  const customerName = document.getElementById("customerNameInput").value.trim();
  const guestCount = document.getElementById("guestCountInput").value.trim();
  const order = {
    orderId: "ord_" + table + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    table,
    customerName,
    guestCount,
    items: appState.cart,
    total: cartTotal(),
    timestamp: new Date().toISOString(),
    status: "חדש"
  };

  OrderQueue.add(order);
  appState.tableStates[table] = {
    status: "occupied",
    customerName,
    guestCount,
    items: appState.cart,
    total: cartTotal(),
    updatedAt: new Date().toISOString()
  };
  saveTableStates();
  renderTables();
  renderActiveOrders();
  closeOrder();
  showToast("ההזמנה נשמרה ונשלחת למטבח");
  await OrderQueue.flush(YASOU_API.submitOrder);
}

function closeTable(tableId) {
  delete appState.tableStates[tableId];
  saveTableStates();
  renderTables();
  renderActiveOrders();
  renderCashier();
  showToast(`שולחן ${tableId} נסגר`);
}

function renderCashier() {
  const grid = document.getElementById("cashierGrid");
  if (!grid) return;
  const entries = activeTableEntries().filter(entry => entry.status === "occupied");
  grid.innerHTML = "";

  if (entries.length === 0) {
    grid.innerHTML = `<div class="empty">אין שולחנות פתוחים לתשלום</div>`;
    return;
  }

  entries.forEach(entry => {
    const items = entry.items || [];
    const card = document.createElement("article");
    card.className = "cashier-card";
    const visibleItems = items.slice(0, 5);
    const hiddenCount = Math.max(items.length - visibleItems.length, 0);
    card.innerHTML = `
      <div class="cashier-card-top">
        <div>
          <h3>שולחן ${entry.tableId}</h3>
          <p>${entry.customerName ? escapeHtml(entry.customerName) + " · " : ""}${entry.guestCount ? escapeHtml(entry.guestCount) + " סועדים" : "הזמנה פתוחה"}</p>
        </div>
        <strong>${entry.total || 0}€</strong>
      </div>
      <ul class="cashier-lines">
        ${visibleItems.map(item => `<li><span>${item.qty}x ${item.name}${item.variantLabel ? " (" + item.variantLabel + ")" : ""}</span><strong>${item.qty * item.unitPrice}€</strong></li>`).join("")}
        ${hiddenCount ? `<li class="cashier-more-lines"><span>ועוד ${hiddenCount} שורות...</span><strong></strong></li>` : ""}
      </ul>
      ${hiddenCount ? `<button class="card-scroll-top" type="button" aria-label="חזרה לראש הכרטיס" title="חזרה לראש הכרטיס">↑</button>` : ""}
      <div class="cashier-actions">
        <button class="dark-action" type="button" data-open="${entry.tableId}">פתח הזמנה</button>
        <button class="danger-action" type="button" data-close="${entry.tableId}">סגור תשלום</button>
      </div>
    `;
    card.querySelector("[data-open]").onclick = () => openOrder(entry.tableId);
    card.querySelector("[data-close]").onclick = () => closeTable(entry.tableId);
    card.querySelector(".card-scroll-top")?.addEventListener("click", () => card.scrollIntoView({ block: "start", behavior: "smooth" }));
    grid.appendChild(card);
  });
}

function renderActiveOrders() {
  const grid = document.getElementById("activeOrdersGrid");
  if (!grid) return;
  const entries = activeTableEntries();
  grid.innerHTML = "";

  if (entries.length === 0) {
    grid.innerHTML = `<div class="empty">אין כרגע הזמנות פעילות</div>`;
    return;
  }

  entries.forEach(entry => {
    const items = entry.items || [];
    const card = document.createElement("article");
    card.className = `active-order-card ${entry.status}`;
    card.innerHTML = `
      <div class="active-order-top">
        <div>
          <h3>שולחן ${entry.tableId}</h3>
          <p>${entry.customerName ? escapeHtml(entry.customerName) + " · " : ""}${entry.guestCount ? escapeHtml(entry.guestCount) + " סועדים · " : ""}${items.length} שורות · ${entry.total || 0}€ · ${formatTime(entry.updatedAt)}</p>
        </div>
        <span class="active-status ${entry.status}">${entry.status === "reserved" ? "שמור" : "תפוס"}</span>
      </div>
      <ul class="active-order-lines">
        ${items.slice(0, 5).map(item => `<li><span>${item.qty}x ${item.name}${item.variantLabel ? " (" + item.variantLabel + ")" : ""}</span><strong>${item.qty * item.unitPrice}€</strong></li>`).join("")}
        ${items.length > 5 ? `<li><span>ועוד ${items.length - 5} שורות...</span><strong></strong></li>` : ""}
      </ul>
      <div class="active-order-actions">
        <button class="dark-action" type="button" data-open="${entry.tableId}">פתח הזמנה</button>
        <button class="danger-action" type="button" data-close="${entry.tableId}">סגור שולחן</button>
      </div>
    `;
    card.querySelector("[data-open]").onclick = () => openOrder(entry.tableId);
    card.querySelector("[data-close]").onclick = () => closeTable(entry.tableId);
    grid.appendChild(card);
  });
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function renderPublicMenu() {
  renderPublicCategories();
  const grid = document.getElementById("menuCards");
  const menuView = document.getElementById("view-menu");
  grid.innerHTML = "";
  menuView.dir = appState.lang === "he" ? "rtl" : "ltr";
  menuView.lang = appState.lang === "gr" ? "el" : appState.lang;

  if (appState.publicCategory === "bar_drinks") {
    BAR_CATEGORY_IDS.forEach(categoryId => {
      const sectionItems = MENU_DATA.items.filter(item => item.category === categoryId);
      if (sectionItems.length === 0) return;
      grid.appendChild(publicMenuSectionTitle(categoryId));
      sectionItems.forEach(item => {
        const card = publicDishCard(item);
        card.classList.add("sectioned-dish-card");
        grid.appendChild(card);
      });
    });
    return;
  }

  MENU_DATA.items
    .filter(item => appState.publicCategory === "all" || item.category === appState.publicCategory)
    .forEach(item => grid.appendChild(publicDishCard(item)));
}

function publicDishCard(item) {
  const card = document.createElement("article");
  card.className = "dish-card";
  const category = MENU_DATA.categories.find(cat => cat.id === item.category);
  const name = item.name[appState.lang] || item.name.he;
  const secondary = appState.lang === "he" ? item.name.en : item.name.he;
  card.innerHTML = `
    <div class="dish-meta">
      <span>${category?.name[appState.lang] || category?.name.he || ""}</span>
      <span>${stationLabels[item.station] || item.station}</span>
    </div>
    <div class="dish-main">
      <div>
        <h3>${name}</h3>
        <p>${secondary || ""}</p>
      </div>
      <strong class="price">${priceLabel(item)}</strong>
    </div>
  `;
  return card;
}

function publicMenuSectionTitle(categoryId) {
  const title = document.createElement("h2");
  title.className = "public-menu-section-title";
  const label = BAR_SECTION_LABELS[categoryId];
  title.textContent = label?.[appState.lang] || label?.he || "";
  return title;
}

function renderPublicCategories() {
  const list = document.getElementById("categoryList");
  list.innerHTML = "";
  const all = document.createElement("button");
  all.className = appState.publicCategory === "all" ? "active" : "";
  all.textContent = appState.lang === "he" ? "הכול" : appState.lang === "gr" ? "Όλα" : "All";
  all.onclick = () => {
    appState.publicCategory = "all";
    renderPublicMenu();
  };
  list.appendChild(all);

  MENU_DATA.categories.forEach(cat => {
    if (BAR_CATEGORY_IDS.includes(cat.id)) {
      if (cat.id !== BAR_CATEGORY_IDS[0]) return;
      const group = PUBLIC_CATEGORY_GROUPS[0];
      const groupButton = document.createElement("button");
      groupButton.className = appState.publicCategory === group.id ? "active" : "";
      groupButton.textContent = group.name[appState.lang] || group.name.he;
      groupButton.onclick = () => {
        appState.publicCategory = group.id;
        renderPublicMenu();
      };
      list.appendChild(groupButton);
      return;
    }

    const btn = document.createElement("button");
    btn.className = appState.publicCategory === cat.id ? "active" : "";
    btn.textContent = cat.name[appState.lang] || cat.name.he;
    btn.onclick = () => {
      appState.publicCategory = cat.id;
      renderPublicMenu();
    };
    list.appendChild(btn);
  });
}

function saveMenuData() {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(MENU_DATA));
}

function categoryLabel(categoryId) {
  const category = MENU_DATA.categories.find(cat => cat.id === categoryId);
  return category?.name?.he || categoryId;
}

function stationLabel(station) {
  return stationLabels[station] || station;
}

function editorVisibleItems() {
  const search = appState.menuEditorSearch.trim().toLowerCase();
  return MENU_DATA.items
    .filter(item => appState.menuEditorCategory === "all" || item.category === appState.menuEditorCategory)
    .filter(item => {
      if (!search) return true;
      return ["he", "en", "gr"].some(lang => (item.name?.[lang] || "").toLowerCase().includes(search));
    });
}

function renderMenuEditor() {
  renderMenuEditorOptions();
  renderMenuEditorList();
  fillMenuEditorForm();
}

function renderMenuEditorOptions() {
  const filter = document.getElementById("menuEditorCategory");
  const editCategory = document.getElementById("editCategory");
  if (!filter || !editCategory) return;

  filter.innerHTML = `<option value="all">כל הקטגוריות</option>` + MENU_DATA.categories
    .map(cat => `<option value="${cat.id}">${escapeHtml(cat.name.he)}</option>`)
    .join("");
  filter.value = appState.menuEditorCategory;

  editCategory.innerHTML = MENU_DATA.categories
    .map(cat => `<option value="${cat.id}">${escapeHtml(cat.name.he)}</option>`)
    .join("");
}

function renderMenuEditorList() {
  const list = document.getElementById("menuEditorList");
  if (!list) return;
  const items = editorVisibleItems();
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<div class="empty">לא נמצאו מנות</div>`;
    appState.menuEditorItemId = null;
    return;
  }

  if (!items.some(item => item.id === appState.menuEditorItemId)) {
    appState.menuEditorItemId = items[0].id;
  }

  items.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `editor-item-btn ${item.id === appState.menuEditorItemId ? "active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(item.name.he)}</strong>
      <span>${escapeHtml(categoryLabel(item.category))} · ${escapeHtml(stationLabel(item.station))} · ${escapeHtml(priceLabel(item))}</span>
    `;
    button.onclick = () => {
      appState.menuEditorItemId = item.id;
      renderMenuEditorList();
      fillMenuEditorForm();
    };
    list.appendChild(button);
  });
}

function fillMenuEditorForm() {
  const item = MENU_DATA.items.find(menuItem => menuItem.id === appState.menuEditorItemId);
  const form = document.getElementById("menuEditorForm");
  if (!form) return;

  form.dataset.itemId = item?.id || "";
  document.getElementById("menuEditorTitle").textContent = item ? item.name.he : "בחר מנה לעריכה";
  document.getElementById("menuEditorStatus").textContent = item ? "מוכן לעריכה" : "אין מנה";
  document.getElementById("menuEditorStatus").classList.remove("saved");
  document.getElementById("deleteMenuItemButton").disabled = !item;

  document.getElementById("editNameHe").value = item?.name?.he || "";
  document.getElementById("editNameEn").value = item?.name?.en || "";
  document.getElementById("editNameGr").value = item?.name?.gr || "";
  document.getElementById("editPrice").value = item?.price ?? "";
  document.getElementById("editCategory").value = item?.category || MENU_DATA.categories[0].id;
  document.getElementById("editStation").value = item?.station || "cold";
  document.getElementById("editVariants").value = formatVariantsForEditor(item);
}

function formatVariantsForEditor(item) {
  if (!item?.variants?.length) return "";
  return item.variants.map(variant => `${variant.label?.he || ""}: ${variant.price}`).join("\n");
}

function parseVariantsFromEditor(value) {
  return value
    .split(/\r?\n|,/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separator = line.includes(":") ? ":" : "-";
      const parts = line.split(separator);
      const label = (parts[0] || "").trim();
      const price = Number((parts.slice(1).join(separator) || "").replace(/[^\d.]/g, ""));
      if (!label || !Number.isFinite(price)) return null;
      return {
        price,
        label: { he: label, en: label, gr: label }
      };
    })
    .filter(Boolean);
}

function refreshMenuSurfaces() {
  renderPublicMenu();
  renderOrderCategories();
  renderOrderItems();
}

function createNewMenuItem() {
  const newItem = {
    id: "custom_" + Date.now(),
    category: appState.menuEditorCategory === "all" ? MENU_DATA.categories[0].id : appState.menuEditorCategory,
    station: "cold",
    price: 0,
    name: { he: "מנה חדשה", en: "New item", gr: "Νέο πιάτο" }
  };
  MENU_DATA.items.unshift(newItem);
  appState.menuEditorItemId = newItem.id;
  saveMenuData();
  renderMenuEditor();
  refreshMenuSurfaces();
  showToast("נוצרה מנה חדשה לעריכה");
}

function saveMenuEditorItem(event) {
  event.preventDefault();
  const itemId = document.getElementById("menuEditorForm").dataset.itemId || appState.menuEditorItemId;
  const item = MENU_DATA.items.find(menuItem => menuItem.id === itemId);
  if (!item) return;

  const variants = parseVariantsFromEditor(document.getElementById("editVariants").value);
  item.name = {
    he: document.getElementById("editNameHe").value.trim() || "ללא שם",
    en: document.getElementById("editNameEn").value.trim(),
    gr: document.getElementById("editNameGr").value.trim()
  };
  item.category = document.getElementById("editCategory").value;
  item.station = document.getElementById("editStation").value;
  item.price = variants.length ? null : Number(document.getElementById("editPrice").value || 0);
  if (variants.length) {
    item.variants = variants;
  } else {
    delete item.variants;
  }

  saveMenuData();
  document.getElementById("menuEditorTitle").textContent = item.name.he;
  document.getElementById("menuEditorStatus").textContent = "נשמר";
  document.getElementById("menuEditorStatus").classList.add("saved");
  renderMenuEditorList();
  refreshMenuSurfaces();
  showToast("המנה נשמרה בתפריט");
}

function deleteMenuEditorItem() {
  const itemId = appState.menuEditorItemId;
  if (!itemId) return;
  const item = MENU_DATA.items.find(menuItem => menuItem.id === itemId);
  MENU_DATA.items = MENU_DATA.items.filter(menuItem => menuItem.id !== itemId);
  appState.menuEditorItemId = editorVisibleItems()[0]?.id || MENU_DATA.items[0]?.id || null;
  saveMenuData();
  renderMenuEditor();
  refreshMenuSurfaces();
  showToast(`${item?.name?.he || "המנה"} נמחקה מהתפריט`);
}

function resetMenuData() {
  localStorage.removeItem(MENU_STORAGE_KEY);
  MENU_DATA.categories = cloneValue(ORIGINAL_MENU_DATA.categories);
  MENU_DATA.items = cloneValue(ORIGINAL_MENU_DATA.items);
  appState.publicCategory = "all";
  appState.orderCategory = MENU_DATA.categories[0].id;
  appState.menuEditorCategory = "all";
  appState.menuEditorSearch = "";
  appState.menuEditorItemId = MENU_DATA.items[0]?.id || null;
  document.getElementById("menuEditorSearch").value = "";
  renderMenuEditor();
  refreshMenuSurfaces();
  showToast("התפריט אופס למקור");
}

async function loadKitchenOrders() {
  const grid = document.getElementById("ordersGrid");
  grid.innerHTML = `<div class="empty">טוען הזמנות...</div>`;
  try {
    appState.orders = await YASOU_API.fetchOrders();
  } catch (err) {
    grid.innerHTML = `<div class="empty">לא ניתן לטעון הזמנות כרגע</div>`;
    return;
  }
  renderKitchen();
}

function renderKitchen() {
  const grid = document.getElementById("ordersGrid");
  grid.innerHTML = "";
  const visible = appState.orders
    .filter(order => order.status !== "בוצע")
    .map(order => ({ ...order, items: (order.items || []).filter(item => appState.station === "all" || item.station === appState.station) }))
    .filter(order => order.items.length > 0)
    .reverse();

  if (visible.length === 0) {
    grid.innerHTML = `<div class="empty">אין הזמנות פתוחות לתצוגה</div>`;
    return;
  }

  visible.forEach(order => {
    const card = document.createElement("article");
    card.className = "order-card";
    const customerName = (order.customerName || "").trim();
    const guestCount = (order.guestCount || "").toString().trim();
    card.innerHTML = `
      <h3>שולחן ${order.table}</h3>
      ${(customerName || guestCount) ? `<p class="order-customer">${customerName ? escapeHtml(customerName) : "ללא שם"}${guestCount ? ` · ${escapeHtml(guestCount)} סועדים` : ""}</p>` : ""}
      <ul>
        ${order.items.map(item => `<li><strong>${item.qty}x ${item.name}</strong>${item.variantLabel ? " - " + item.variantLabel : ""}${item.note ? "<br>" + item.note : ""}</li>`).join("")}
      </ul>
      <button class="dark-action" type="button">סמן כבוצע</button>
    `;
    card.querySelector("button").onclick = async () => {
      await YASOU_API.updateOrderStatus(order.orderId, "בוצע");
      appState.orders = appState.orders.map(item => item.orderId === order.orderId ? { ...item, status: "בוצע" } : item);
      renderKitchen();
      showToast("ההזמנה סומנה כבוצעה");
    };
    grid.appendChild(card);
  });
}

document.querySelectorAll("[data-view]").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

document.querySelectorAll("[data-lang]").forEach(btn => {
  btn.addEventListener("click", () => {
    appState.lang = btn.dataset.lang;
    document.querySelectorAll("[data-lang]").forEach(item => item.classList.toggle("active", item === btn));
    renderPublicMenu();
  });
});

document.querySelectorAll("[data-station]").forEach(btn => {
  btn.addEventListener("click", () => {
    appState.station = btn.dataset.station;
    document.querySelectorAll("[data-station]").forEach(item => item.classList.toggle("active", item === btn));
    renderKitchen();
  });
});

document.getElementById("hamburger").onclick = () => {
  document.getElementById("side").classList.add("open");
  document.getElementById("screenShade").classList.add("open");
};
document.getElementById("screenShade").onclick = () => {
  document.getElementById("side").classList.remove("open");
  document.getElementById("screenShade").classList.remove("open");
};
document.getElementById("searchInput").oninput = renderOrderItems;
document.getElementById("customerNameInput").oninput = syncActiveCustomerName;
document.getElementById("guestCountInput").oninput = syncActiveCustomerName;
document.getElementById("sendButton").onclick = sendOrder;
document.getElementById("reserveButton").onclick = reserveTable;
document.getElementById("menuEditorSearch").oninput = event => {
  appState.menuEditorSearch = event.target.value;
  renderMenuEditorList();
  fillMenuEditorForm();
};
document.getElementById("menuEditorCategory").onchange = event => {
  appState.menuEditorCategory = event.target.value;
  renderMenuEditorList();
  fillMenuEditorForm();
};
document.getElementById("newMenuItemButton").onclick = createNewMenuItem;
document.getElementById("deleteMenuItemButton").onclick = deleteMenuEditorItem;
document.getElementById("resetMenuButton").onclick = resetMenuData;
document.getElementById("menuEditorForm").onsubmit = saveMenuEditorItem;

window.addEventListener("online", () => OrderQueue.flush(YASOU_API.submitOrder));
setInterval(() => OrderQueue.flush(YASOU_API.submitOrder), 15000);

renderTables();
renderActiveOrders();
renderPublicMenu();
renderMenuEditor();
updateNotice();
OrderQueue.flush(YASOU_API.submitOrder);
