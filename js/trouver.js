/*
  TROUVER UNE PHARMACIE
  ======================
  - Charge assets/data/annuaire.json (pharmacies déjà notées ≥ 3/5)
  - Affiche les marqueurs sur une carte Leaflet
  - Liste sous la carte = pharmacies visibles dans le cadrage actuel
  - Clic sur un marqueur = popup avec le détail des notes par critère
  - Filtre par raison de la visite (Information / Délivrance)
*/

const CRITERES = [
  { key: 'accueil', label: 'Accueil' },
  { key: 'conseil', label: 'Conseil et orientation' },
  { key: 'delivrance', label: 'Délivrance' },
  { key: 'confidentialite', label: 'Confidentialité' },
  { key: 'experience', label: 'Expérience positive' }
];

const UN_AN_MS = 365 * 24 * 60 * 60 * 1000;

function melange(c1, c2, t){
  const r = Math.round(c1[0] + (c2[0]-c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1]-c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2]-c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
// rouge → vert, pour les notes par critère
function couleurCritere(score){
  return melange([200, 90, 80], [92, 156, 108], Math.max(0, Math.min(1, score / 5)));
}
// orange → vert, pour la note moyenne globale
function couleurMoyenne(score){
  return melange([212, 140, 64], [92, 156, 108], Math.max(0, Math.min(1, score / 5)));
}

function ratingBar(score, variant){
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  const couleur = variant === 'average' ? couleurMoyenne(score) : couleurCritere(score);
  return `
    <div class="rating-bar rating-bar--${variant}">
      <div class="rating-bar__track"></div>
      <div class="rating-bar__pointer" style="left:${pct}%; background:${couleur};"></div>
    </div>
  `;
}

function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function popupHTML(p){
  const criteresHTML = CRITERES.map(c => `
    <div>
      <div class="pharmacy-popup__criterion-head">
        <span>${c.label}</span>
        <strong style="color:${couleurCritere(p.criteria[c.key])}">${p.criteria[c.key].toFixed(1)}</strong>
      </div>
      ${ratingBar(p.criteria[c.key], 'criteria')}
    </div>
  `).join('');

  const isRecent = (Date.now() - new Date(p.last_response).getTime()) < UN_AN_MS;
  const badges = `
    <span class="badge ${p.responses_count < 5 ? 'badge--warn' : ''}">${p.responses_count} réponse${p.responses_count > 1 ? 's' : ''}</span>
    <span class="badge ${isRecent ? '' : 'badge--warn'}">dernière réponse : ${formatDate(p.last_response)}</span>
  `;

  return `
    <div class="pharmacy-popup">
      <p class="pharmacy-popup__name">${p.name}</p>
      <p class="pharmacy-popup__address">${p.address}, ${p.city}</p>
      <div class="pharmacy-popup__score" style="color:${couleurMoyenne(p.average)}">
        ${p.average.toFixed(1)}<span>/5</span>
      </div>
      ${ratingBar(p.average, 'average')}
      <div class="pharmacy-popup__criteria">${criteresHTML}</div>
      <div class="pharmacy-popup__meta">${badges}</div>
    </div>
  `;
}

function pharmacyIcon(){
  return L.divIcon({
    className: 'pharmacy-marker',
    html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#7f4a94" stroke="#f9efe5" stroke-width="1.5">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="#f9efe5" stroke="none"/>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26]
  });
}

const CRITERE_LABELS = {
  accueil: 'Accueil',
  conseil: 'Conseil et orientation',
  delivrance: 'Délivrance',
  confidentialite: 'Confidentialité',
  experience: 'Expérience positive'
};

async function init(){
  const listEl = document.getElementById('pharmacy-list');
  const critereLabelEl = document.getElementById('liste-critere-label');
  const filterTypeVisiteEl = document.getElementById('filtre-type-visite');
  const filterRaisonEl = document.getElementById('filtre-raison');
  const filterCritereEl = document.getElementById('filtre-critere');

  // La carte (fond de plan) s'affiche toujours, même si les données
  // ne peuvent pas être chargées (ex: fichier ouvert en double-clic,
  // sans serveur local — voir le fetch plus bas).
  const map = L.map('map', { scrollWheelZoom: true }).setView([45.1885, 5.7245], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  let pharmacies = [];
  try{
    const res = await fetch('assets/data/annuaire.json');
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    pharmacies = await res.json();
  }catch(err){
    console.error("Impossible de charger l'annuaire :", err);
    listEl.innerHTML = `
      <p class="pharmacy-list__empty">
        Impossible de charger les données des pharmacies.<br>
        Si tu as ouvert ce fichier directement (double-clic), c'est normal :
        le navigateur bloque le chargement de fichiers locaux de cette façon.
        Lance un petit serveur local (<code>python3 -m http.server</code> depuis
        le dossier du site) et ouvre <code>http://localhost:8000</code> à la place.
      </p>`;
    return;
  }

  // Sécurité : ne garder que les pharmacies "positives" (≥ 3/5), au cas où
  pharmacies = pharmacies.filter(p => p.average >= 3);

  const icon = pharmacyIcon();
  const markersById = new Map();
  const markers = pharmacies.map(p => {
    const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
    marker.bindPopup(popupHTML(p), { maxWidth: 280 });
    marker._pharmacy = p;
    markersById.set(p.id, marker);
    return marker;
  });

  function pharmacieVisible(p){
    const typeVisite = filterTypeVisiteEl.value; // '' = toutes
    const raison = filterRaisonEl.value;         // '' = toutes
    const critere = filterCritereEl.value;       // '' = note globale

    const typeVisiteOk = !typeVisite || (p.raisons || []).includes(typeVisite);
    const raisonOk = !raison || (p.motifs || []).includes(raison);
    const critereOk = !critere || (p.criteria[critere] >= 3);

    return typeVisiteOk && raisonOk && critereOk;
  }

  function appliquerFiltre(){
    markers.forEach(m => {
      const visible = pharmacieVisible(m._pharmacy);
      if(visible && !map.hasLayer(m)) m.addTo(map);
      if(!visible && map.hasLayer(m)) map.removeLayer(m);
    });
    updateListe();
  }

  function updateListe(){
    const critere = filterCritereEl.value; // '' = note globale

    // Libellé au-dessus de la liste, pour que le changement de critère
    // soit visible même si les notes ne bougent que légèrement.
    if(critere){
      critereLabelEl.hidden = false;
      critereLabelEl.textContent = `Note affichée : ${CRITERE_LABELS[critere]}`;
    }else{
      critereLabelEl.hidden = true;
    }

    const bounds = map.getBounds();
    const visibles = markers
      .filter(m => map.hasLayer(m) && bounds.contains(m.getLatLng()))
      .map(m => m._pharmacy)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    if(!visibles.length){
      listEl.innerHTML = '<p class="pharmacy-list__empty">Aucune pharmacie visible dans cette zone — dézoome, déplace la carte, ou change les filtres.</p>';
      return;
    }

    listEl.innerHTML = visibles.map(p => {
      // Si un critère précis est choisi, on affiche sa note (échelle
      // rouge→vert) au lieu de la note globale (échelle orange→vert).
      const score = critere ? p.criteria[critere] : p.average;
      const couleur = critere ? couleurCritere(score) : couleurMoyenne(score);
      return `
        <article class="pharmacy-card" data-id="${p.id}" tabindex="0" role="button"
                  aria-label="Voir le détail de ${p.name} sur la carte">
          <div>
            <p class="pharmacy-card__name">${p.name}</p>
            <p class="pharmacy-card__address">${p.address}, ${p.city}</p>
          </div>
          <div class="pharmacy-card__score" style="color:${couleur}">${score.toFixed(1)}</div>
        </article>
      `;
    }).join('');

    // Clic (ou clavier) sur une carte de la liste → centre la carte sur
    // cette pharmacie et ouvre sa fenêtre de détail.
    listEl.querySelectorAll('.pharmacy-card').forEach(card => {
      const ouvrir = () => {
        const marker = markersById.get(card.dataset.id);
        if(!marker) return;

        // Désactive le survol "collé" sur la carte cliquée (courant sur
        // mobile), en la marquant comme active plutôt qu'au survol.
        listEl.querySelectorAll('.pharmacy-card--active').forEach(c => c.classList.remove('pharmacy-card--active'));
        card.classList.add('pharmacy-card--active');
        card.blur();

        map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: .6 });
        map.once('moveend', () => marker.openPopup());
        document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      card.addEventListener('click', ouvrir);
      card.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
      });
    });
  }

  map.on('moveend zoomend', updateListe);
  filterTypeVisiteEl.addEventListener('change', appliquerFiltre);
  filterRaisonEl.addEventListener('change', appliquerFiltre);
  filterCritereEl.addEventListener('change', appliquerFiltre);

  updateListe();
}

document.addEventListener('DOMContentLoaded', init);
