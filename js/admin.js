/*
  ADMIN — connexion + tableau complet
  =====================================
  Toute la protection réelle vient du backend : /api/admin/pharmacies
  refuse de répondre sans un token valide (voir api_reponses.py côté
  serveur). Ce fichier se contente de porter ce token dans l'en-tête
  Authorization de chaque requête.
*/

const API_URL = "https://VOTRE-BACKEND.example/api";

const TOKEN_KEY = "checktapharmacie_admin_token";

const BADGES = [
  { key: "liste_noire", label: "Liste noire" },
  { key: "carton_rouge", label: "Carton rouge" },
  { key: "contactee", label: "Contactée" },
  { key: "a_tester", label: "À tester" }
];

const CRITERES = [
  { key: "accueil", label: "Accueil" },
  { key: "conseil", label: "Conseil et orientation" },
  { key: "delivrance", label: "Délivrance" },
  { key: "confidentialite", label: "Confidentialité" },
  { key: "experience", label: "Expérience positive" }
];

let pharmacies = [];
let sortKey = "name";
let sortDir = 1; // 1 = asc, -1 = desc
let ligneOuverte = null; // id de la pharmacie dont le détail est déplié

let map = null;
let markers = []; // { marker, pharmacy }
let carteOuverte = false;
let carteInteractive = false; // devient vrai dès que la carte a bougé/zoomé

function getToken(){ return sessionStorage.getItem(TOKEN_KEY); }
function setToken(t){ sessionStorage.setItem(TOKEN_KEY, t); }
function clearToken(){ sessionStorage.removeItem(TOKEN_KEY); }

/* ============================================================
   CONNEXION
   ============================================================ */
function initLogin(){
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Connexion…";

    try{
      const res = await fetch(`${API_URL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if(!res.ok) throw new Error("Identifiants invalides");
      const data = await res.json();
      setToken(data.token);
      showAdmin();
    }catch(err){
      console.error("Échec de connexion :", err);
      errorEl.textContent = "Connexion impossible : identifiants invalides, ou backend pas encore branché (voir API_URL dans js/admin.js).";
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Se connecter";
    }
  });
}

function logout(){
  clearToken();
  location.reload();
}

/* ============================================================
   BASCULE LOGIN / ADMIN
   ============================================================ */
function showAdmin(){
  document.getElementById("login-wrap").hidden = true;
  document.getElementById("admin-wrap").hidden = false;
  syncNavLogin(true);
  loadPharmacies();
}

/* ============================================================
   LIEN "SE CONNECTER" DU BANDEAU → "SE DÉCONNECTER" UNE FOIS CONNECTÉ·E
   ============================================================ */
function onLogoutClick(e){
  e.preventDefault();
  logout();
}

function syncNavLogin(loggedIn){
  const link = document.querySelector("site-header .nav__login");
  if(!link) return;

  if(loggedIn){
    link.textContent = "Se déconnecter";
    link.setAttribute("href", "#");
    link.addEventListener("click", onLogoutClick);
  }else{
    link.textContent = "Se connecter";
    link.setAttribute("href", "admin.html");
    link.removeEventListener("click", onLogoutClick);
  }
}

/* ============================================================
   CHARGEMENT DES DONNÉES
   ============================================================ */
async function loadPharmacies(){
  const tbody = document.getElementById("admin-tbody");

  try{
    const res = await fetch(`${API_URL}/admin/pharmacies`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if(res.status === 401){
      clearToken();
      location.reload();
      return;
    }
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    pharmacies = await res.json();
    render();
  }catch(err){
    console.error("Impossible de charger les données admin :", err);
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Impossible de charger les données.</td></tr>`;
  }
}

/* ============================================================
   COULEURS DE NOTE (cohérent avec trouver.js)
   ============================================================ */
function melange(c1, c2, t){
  const r = Math.round(c1[0] + (c2[0]-c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1]-c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2]-c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
function couleurCritere(score){
  return melange([200, 90, 80], [92, 156, 108], Math.max(0, Math.min(1, score / 5)));
}
function couleurMoyenne(score){
  return melange([212, 140, 64], [92, 156, 108], Math.max(0, Math.min(1, score / 5)));
}

function ratingBar(score, variant){
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  const couleur = variant === "average" ? couleurMoyenne(score) : couleurCritere(score);
  return `
    <div class="rating-bar rating-bar--${variant}">
      <div class="rating-bar__track"></div>
      <div class="rating-bar__pointer" style="left:${pct}%; background:${couleur};"></div>
    </div>
  `;
}

function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/* ============================================================
   FILTRES
   ============================================================ */
function critereActif(){ return document.getElementById("filtre-critere").value; }

function scoreAffiche(p){
  const critere = critereActif();
  return critere ? p.criteria[critere] : p.average;
}

function pharmacieCorrespond(p){
  const note = document.getElementById("filtre-note").value; // '', 'sous3', 'sup3'
  const critere = critereActif();
  const raison = document.getElementById("filtre-raison").value;
  const motif = document.getElementById("filtre-motif").value;
  const badge = document.getElementById("filtre-badge").value;
  const statut = document.getElementById("filtre-statut").value;

  const score = critere ? p.criteria[critere] : p.average;

  if(note === "sous3" && !(score < 3)) return false;
  if(note === "sup3" && !(score >= 3)) return false;
  if(raison && !(p.raisons || []).includes(raison)) return false;
  if(motif && !(p.motifs || []).includes(motif)) return false;
  if(badge === "aucun" && p.badges.length) return false;
  if(badge && badge !== "aucun" && !p.badges.includes(badge)) return false;
  if(statut === "visible" && p.masquee_annuaire) return false;
  if(statut === "retiree" && !p.masquee_annuaire) return false;

  return true;
}

function pharmaciesFiltrees(){
  const liste = pharmacies.filter(pharmacieCorrespond);
  liste.sort((a, b) => {
    let va = sortKey === "average" ? scoreAffiche(a) : a[sortKey];
    let vb = sortKey === "average" ? scoreAffiche(b) : b[sortKey];
    if(typeof va === "string") return va.localeCompare(vb, "fr") * sortDir;
    return (va - vb) * sortDir;
  });
  return liste;
}

/* ============================================================
   RENDU DE LA LISTE
   ============================================================ */
function render(){
  const tbody = document.getElementById("admin-tbody");
  let liste = pharmaciesFiltrees();

  // Si la carte a été manipulée, on restreint en plus à son cadrage actuel
  if(carteOuverte && carteInteractive && map){
    const bounds = map.getBounds();
    const idsVisibles = new Set(
      markers.filter(m => bounds.contains(m.marker.getLatLng())).map(m => m.pharmacy.id)
    );
    liste = liste.filter(p => idsVisibles.has(p.id));
  }

  if(!liste.length){
    tbody.innerHTML = `<tr><td colspan="5" class="admin-table__empty">Aucune pharmacie ne correspond à ces filtres.</td></tr>`;
    return;
  }

  tbody.innerHTML = liste.map(p => ligneHTML(p)).join("");

  tbody.querySelectorAll(".badge-toggle").forEach(btn => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleBadge(btn); });
  });

  tbody.querySelectorAll("tr[data-clickable]").forEach(tr => {
    tr.addEventListener("click", () => toggleDetail(tr.dataset.id));
  });

  tbody.querySelectorAll(".admin-table__comment-input").forEach(textarea => {
    textarea.addEventListener("click", (e) => e.stopPropagation());

    textarea.addEventListener("focus", () => {
      textarea.classList.add("is-expanded");
      autoGrow(textarea);
    });

    textarea.addEventListener("input", () => autoGrow(textarea));

    textarea.addEventListener("blur", () => {
      saveComment(textarea);
      textarea.classList.remove("is-expanded");
      textarea.style.height = ""; // revient à une seule ligne compacte
    });
  });

  // Si une ligne était dépliée avant le re-rendu, on la redéplie
  if(ligneOuverte && liste.some(p => p.id === ligneOuverte)){
    const tr = tbody.querySelector(`tr[data-id="${ligneOuverte}"]`);
    if(tr) tr.insertAdjacentHTML("afterend", detailRowHTML(pharmacies.find(p => p.id === ligneOuverte)));
  }

  updateMapMarkers();
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ligneHTML(p){
  const score = scoreAffiche(p);
  const variant = critereActif() ? "criteria" : "average";
  const couleur = variant === "criteria" ? couleurCritere(score) : couleurMoyenne(score);

  return `
    <tr data-id="${p.id}" data-clickable>
      <td>
        <div class="admin-table__name">
          ${p.name}
          ${p.masquee_annuaire ? '<span class="badge badge--warn" style="margin-left:.5rem;">Retirée sur demande</span>' : ''}
        </div>
        <div class="admin-table__address">${p.address}, ${p.city}</div>
      </td>
      <td>
        <span class="admin-table__score" style="color:${couleur}; border-color:${couleur}">
          ${score.toFixed(1)}
        </span>
        <div class="admin-table__address">${p.responses_count} réponse${p.responses_count > 1 ? "s" : ""}</div>
      </td>
      <td>
        <div class="badge-toggles">
          ${BADGES.map(b => `
            <button type="button" class="badge-toggle ${p.badges.includes(b.key) ? "is-active" : ""}" data-badge="${b.key}">
              ${b.label}
            </button>
          `).join("")}
        </div>
      </td>
      <td>
        <a class="admin-table__rawlink" href="pharmacie-detail.html?id=${p.id}#${encodeURIComponent(getToken() || '')}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          Voir tout →
        </a>
      </td>
      <td onclick="event.stopPropagation()">
        <textarea class="admin-table__comment-input" data-id="${p.id}" rows="1"
                  placeholder="Ajouter un commentaire…">${escapeHtml(p.commentaire || "")}</textarea>
        <div class="admin-table__comment-saved">Enregistré ✓</div>
      </td>
    </tr>
  `;
}

/* ============================================================
   DÉTAIL DÉPLIABLE (au clic sur une ligne)
   ============================================================ */
function toggleDetail(id){
  const tbody = document.getElementById("admin-tbody");
  const existant = tbody.querySelector(".admin-detail-row");

  if(existant){
    const etaitLaMemePharmacie = existant.dataset.for === id;
    existant.remove();
    if(etaitLaMemePharmacie){ ligneOuverte = null; return; }
  }

  const tr = tbody.querySelector(`tr[data-id="${id}"]`);
  const p = pharmacies.find(p => p.id === id);
  if(!tr || !p) return;

  tr.insertAdjacentHTML("afterend", detailRowHTML(p));
  ligneOuverte = id;
}

function detailRowHTML(p){
  const criteresHTML = CRITERES.map(c => `
    <div>
      <div class="pharmacy-popup__criterion-head">
        <span>${c.label}</span>
        <strong style="color:${couleurCritere(p.criteria[c.key])}">${p.criteria[c.key].toFixed(1)}</strong>
      </div>
      ${ratingBar(p.criteria[c.key], "criteria")}
    </div>
  `).join("");

  const isRecent = (Date.now() - new Date(p.last_response).getTime()) < (365 * 24 * 60 * 60 * 1000);
  const badgesLabels = p.badges.map(k => BADGES.find(b => b.key === k)?.label || k);

  return `
    <tr class="admin-detail-row" data-for="${p.id}">
      <td colspan="5">
        <div class="pharmacy-popup" style="max-width:360px;">
          <p class="pharmacy-popup__name">
            ${p.name}
            ${p.masquee_annuaire ? '<span class="badge badge--warn" style="margin-left:.5rem;">Retirée sur demande</span>' : ''}
          </p>
          <p class="pharmacy-popup__address">${p.address}, ${p.city}</p>
          <div class="pharmacy-popup__score" style="color:${couleurMoyenne(p.average)}">
            ${p.average.toFixed(1)}<span>/5</span>
          </div>
          ${ratingBar(p.average, "average")}
          <div class="pharmacy-popup__criteria">${criteresHTML}</div>
          <div class="pharmacy-popup__meta">
            <span class="badge ${p.responses_count < 5 ? "badge--warn" : ""}">${p.responses_count} réponse${p.responses_count > 1 ? "s" : ""}</span>
            <span class="badge ${isRecent ? "" : "badge--warn"}">dernière réponse : ${formatDate(p.last_response)}</span>
            ${badgesLabels.length ? `<span class="badge">${badgesLabels.join(" · ")}</span>` : ""}
          </div>
        </div>
      </td>
    </tr>
  `;
}

/* ============================================================
   BADGES — bascule + envoi au backend
   ============================================================ */
async function toggleBadge(btn){
  const tr = btn.closest("tr");
  const id = tr.dataset.id;
  const badgeKey = btn.dataset.badge;
  const pharmacy = pharmacies.find(p => p.id === id);
  if(!pharmacy) return;

  const idx = pharmacy.badges.indexOf(badgeKey);
  const activer = idx === -1;
  if(activer) pharmacy.badges.push(badgeKey);
  else pharmacy.badges.splice(idx, 1);

  btn.classList.toggle("is-active", activer);

  try{
    const res = await fetch(`${API_URL}/admin/pharmacies/${id}/badges`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ badges: pharmacy.badges })
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
  }catch(err){
    console.error("Échec de mise à jour du badge (backend pas encore branché) :", err);
  }
}

function autoGrow(textarea){
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

/* ============================================================
   COMMENTAIRE — sauvegarde au blur du champ
   ============================================================ */
async function saveComment(input){
  const id = input.dataset.id;
  const pharmacy = pharmacies.find(p => p.id === id);
  if(!pharmacy) return;

  const valeur = input.value.trim();
  if(valeur === (pharmacy.commentaire || "")) return; // rien de changé
  pharmacy.commentaire = valeur;

  const confirmation = input.nextElementSibling;

  try{
    const res = await fetch(`${API_URL}/admin/pharmacies/${id}/commentaire`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ commentaire: valeur })
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
  }catch(err){
    console.error("Échec de sauvegarde du commentaire (backend pas encore branché) :", err);
  }

  if(confirmation){
    confirmation.classList.add("is-visible");
    setTimeout(() => confirmation.classList.remove("is-visible"), 1500);
  }
}

/* ============================================================
   CARTE — repliable, sélectionne les pharmacies de la liste
   ============================================================ */
function pharmacyIcon(couleur){
  return L.divIcon({
    className: "pharmacy-marker",
    html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="${couleur}" stroke="#f9efe5" stroke-width="1.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="#f9efe5" stroke="none"/>
    </svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
    popupAnchor: [0, -22]
  });
}

function initMap(){
  map = L.map("map", { scrollWheelZoom: true }).setView([45.1885, 5.7245], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  map.on("moveend zoomend", () => {
    carteInteractive = true;
    document.getElementById("admin-map-hint").hidden = false;
    render();
  });
}

function updateMapMarkers(){
  if(!map) return;
  markers.forEach(m => map.removeLayer(m.marker));
  markers = [];

  pharmaciesFiltrees().forEach(p => {
    const couleur = couleurMoyenne(p.average);
    const marker = L.marker([p.lat, p.lng], { icon: pharmacyIcon(couleur) }).addTo(map);
    marker.bindTooltip(`${p.name} (${p.average.toFixed(1)}/5)`);
    markers.push({ marker, pharmacy: p });
  });
}

function initMapToggle(){
  const toggleBtn = document.getElementById("admin-map-toggle");
  const wrap = document.getElementById("admin-map-wrap");

  toggleBtn.addEventListener("click", () => {
    carteOuverte = !carteOuverte;
    wrap.hidden = !carteOuverte;
    toggleBtn.textContent = carteOuverte ? "Masquer la carte ▴" : "Afficher la carte ▾";

    if(carteOuverte && !map){
      initMap();
      updateMapMarkers();
    }else if(carteOuverte && map){
      map.invalidateSize();
    }

    if(!carteOuverte){
      // On referme : la carte ne filtre plus la liste tant qu'elle n'est pas rouverte et manipulée
      carteInteractive = false;
      document.getElementById("admin-map-hint").hidden = true;
      render();
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initMapToggle();

  ["filtre-note", "filtre-critere", "filtre-raison", "filtre-motif", "filtre-badge", "filtre-statut"].forEach(id => {
    document.getElementById(id).addEventListener("change", render);
  });

  document.querySelectorAll(".admin-table th[data-sortable]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortable;
      if(sortKey === key){ sortDir *= -1; }
      else { sortKey = key; sortDir = 1; }
      document.querySelectorAll(".admin-table th[data-sortable] .sort-arrow").forEach(a => a.textContent = "");
      th.querySelector(".sort-arrow").textContent = sortDir === 1 ? "↑" : "↓";
      render();
    });
  });

  if(getToken()) showAdmin();
});
