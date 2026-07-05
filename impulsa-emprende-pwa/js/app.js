/*
  Impulsa Emprende — lógica de la beta.

  IMPORTANTE (léelo antes de probar con varias personas):
  Esta versión guarda todo con localStorage, es decir, CADA CELULAR
  tiene su propia copia de los datos. Sirve perfecto para probar look &
  feel y flujos en un solo dispositivo, pero si Ana se registra desde
  su celular, el administrador NO lo va a ver en el suyo todavía.

  Para que eso funcione (multi-dispositivo + notificaciones push reales)
  hay que conectar un backend compartido. Dejé marcado con
  "// >>> BACKEND" cada lugar donde eso se conecta. Ver README.md.
*/

// ---------- Almacenamiento local (temporal, mientras no hay backend) ----------
const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const DB = {
  entrepreneurs: () => Store.get("ie_entrepreneurs", []),
  saveEntrepreneurs: (list) => Store.set("ie_entrepreneurs", list),
  products: () => Store.get("ie_products", []),
  saveProducts: (list) => Store.set("ie_products", list),
  session: () => Store.get("ie_session", null),
  saveSession: (s) => Store.set("ie_session", s)
};

// ---------- Navegación ----------
function show(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  document.getElementById("navbar").classList.toggle(
    "hidden",
    !["screen-marketplace", "screen-dashboard", "screen-admin"].includes(screenId)
  );
  render();
  window.scrollTo(0, 0);
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// ---------- Registro de emprendedor ----------
function submitRegistration(event) {
  event.preventDefault();
  const form = event.target;
  const entrepreneur = {
    id: "e_" + Date.now(),
    name: form.name.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
    email: form.email.value.trim(),
    business: form.business.value.trim(),
    category: form.category.value,
    status: "pending", // pending | approved
    createdAt: new Date().toISOString()
  };
  const list = DB.entrepreneurs();
  list.push(entrepreneur);
  DB.saveEntrepreneurs(list);
  DB.saveSession({ role: "entrepreneur", id: entrepreneur.id });

  // >>> BACKEND: aquí es donde, con un backend real, se dispararía
  // un push al administrador ("nueva solicitud de registro").
  notifyLocally("Nueva solicitud", entrepreneur.name + " quiere registrarse.");

  show("screen-pending");
}

// ---------- Aprobación (admin) ----------
function approveEntrepreneur(id) {
  const list = DB.entrepreneurs().map((e) =>
    e.id === id ? { ...e, status: "approved" } : e
  );
  DB.saveEntrepreneurs(list);
  toast("Cuenta aprobada");
  render();
}

// ---------- Productos ----------
function submitProduct(event) {
  event.preventDefault();
  const session = DB.session();
  if (!session || session.role !== "entrepreneur") return;
  const form = event.target;
  const product = {
    id: "p_" + Date.now(),
    ownerId: session.id,
    name: form.pname.value.trim(),
    price: Number(form.pprice.value || 0),
    stock: Number(form.pstock.value || 0),
    category: form.pcategory.value,
    views: 0,
    sales: 0
  };
  const list = DB.products();
  list.push(product);
  DB.saveProducts(list);
  toast("Producto publicado");
  form.reset();
  show("screen-dashboard");
}

function registerSale(event) {
  event.preventDefault();
  const session = DB.session();
  const form = event.target;
  const productId = form.saleProduct.value;
  const qty = Number(form.saleQty.value || 1);
  const list = DB.products().map((p) => {
    if (p.id === productId) {
      return { ...p, stock: Math.max(0, p.stock - qty), sales: p.sales + qty };
    }
    return p;
  });
  DB.saveProducts(list);

  // >>> BACKEND: aquí se dispararía el push "vendiste 1 producto"
  // al emprendedor, y se actualizaría el indicador global.
  notifyLocally("Venta registrada", qty + " unidad(es) vendidas.");

  toast("Venta registrada");
  form.reset();
  show("screen-dashboard");
}

// ---------- Notificaciones (permiso + aviso local) ----------
async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function notifyLocally(title, body) {
  // Esto es una notificación LOCAL (solo funciona si la app está abierta
  // o en background reciente). Un push real, con la app cerrada del
  // todo, necesita el backend + service worker push (ver README).
  if ("Notification" in window && Notification.permission === "granted") {
    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (reg) reg.showNotification(title, { body, icon: "icons/icon-192.png" });
      else new Notification(title, { body });
    });
  }
}

// ---------- Render ----------
function render() {
  const session = DB.session();
  const entrepreneurs = DB.entrepreneurs();
  const products = DB.products();

  // Marketplace
  const grid = document.getElementById("marketplaceGrid");
  const empty = document.getElementById("marketplaceEmpty");
  if (products.length === 0) {
    grid.style.display = "none";
    empty.style.display = "flex";
  } else {
    grid.style.display = "grid";
    empty.style.display = "none";
    grid.innerHTML = products.map((p) => {
      const owner = entrepreneurs.find((e) => e.id === p.ownerId);
      return `<div class="card">
        <div style="height:64px;background:var(--marigold);opacity:.3;border-radius:10px;margin-bottom:8px;"></div>
        <div style="font-size:12px;font-weight:600;">${escapeHtml(p.name)}</div>
        <div class="muted" style="font-size:11px;">${escapeHtml(owner ? owner.business : "")}</div>
        <div class="metric" style="font-size:13px;color:var(--forest);margin-top:4px;">$${p.price.toLocaleString("es-CO")}</div>
      </div>`;
    }).join("");
  }

  // Dashboard emprendedor
  if (session && session.role === "entrepreneur") {
    const me = entrepreneurs.find((e) => e.id === session.id);
    const myProducts = products.filter((p) => p.ownerId === session.id);
    document.getElementById("dashName").textContent = me ? me.name : "";
    document.getElementById("dashStatus").innerHTML = me && me.status === "pending"
      ? '<span class="chip warn">Cuenta pendiente de aprobación</span>'
      : '<span class="chip">Cuenta activa</span>';
    const totalSales = myProducts.reduce((sum, p) => sum + p.sales * p.price, 0);
    document.getElementById("dashSales").textContent = "$" + totalSales.toLocaleString("es-CO");
    const lowStock = myProducts.filter((p) => p.stock > 0 && p.stock <= 3);
    document.getElementById("dashAlert").style.display = lowStock.length ? "flex" : "none";
    if (lowStock.length) {
      document.getElementById("dashAlertText").textContent =
        "Stock bajo: " + lowStock.map((p) => p.name).join(", ");
    }
    document.getElementById("dashProducts").innerHTML = myProducts.length
      ? myProducts.map((p) => `<div class="list-item card">
          <div><div style="font-size:13px;font-weight:600;">${escapeHtml(p.name)}</div>
          <div class="muted" style="font-size:11px;">${p.sales} vendidos</div></div>
          <span class="chip ${p.stock <= 3 ? "warn" : ""}">${p.stock} en stock</span>
        </div>`).join("")
      : '<p class="muted">Aún no tienes productos. Publica el primero.</p>';

    const saleSelect = document.querySelector("#formSale select[name=saleProduct]");
    saleSelect.innerHTML = myProducts.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  }

  // Panel admin
  const pending = entrepreneurs.filter((e) => e.status === "pending");
  const approved = entrepreneurs.filter((e) => e.status === "approved");
  document.getElementById("adminBanner").style.display = pending.length ? "flex" : "none";
  document.getElementById("adminBannerText").textContent = `${pending.length} solicitud(es) nueva(s)`;
  document.getElementById("adminPendingList").innerHTML = pending.map((e) => `
    <div class="card list-item">
      <div><div style="font-size:13px;font-weight:600;">${escapeHtml(e.name)}</div>
      <div class="muted" style="font-size:11px;">${escapeHtml(e.business)} · ${escapeHtml(e.whatsapp)}</div></div>
      <button class="btn-primary" style="padding:8px 12px;font-size:12px;" onclick="approveEntrepreneur('${e.id}')">Aprobar</button>
    </div>`).join("") || '<p class="muted">No hay solicitudes pendientes.</p>';
  document.getElementById("adminApprovedList").innerHTML = approved.map((e) => `
    <div class="card list-item">
      <div><div style="font-size:13px;font-weight:600;">${escapeHtml(e.name)}</div>
      <div class="muted" style="font-size:11px;">${escapeHtml(e.business)}</div></div>
      <span class="chip">Activo</span>
    </div>`).join("") || '<p class="muted">Todavía nadie aprobado.</p>';
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- Arranque ----------
function logout() {
  DB.saveSession(null);
  show("screen-welcome");
}

function loginAsAdmin() {
  DB.saveSession({ role: "admin" });
  requestNotificationPermission();
  show("screen-admin");
}

function continueAsEntrepreneur() {
  const session = DB.session();
  if (session && session.role === "entrepreneur") {
    requestNotificationPermission();
    show("screen-dashboard");
  } else {
    show("screen-register");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
  document.getElementById("formRegister").addEventListener("submit", submitRegistration);
  document.getElementById("formProduct").addEventListener("submit", submitProduct);
  document.getElementById("formSale").addEventListener("submit", registerSale);

  const session = DB.session();
  if (session && session.role === "admin") show("screen-admin");
  else if (session && session.role === "entrepreneur") show("screen-dashboard");
  else show("screen-welcome");
});
