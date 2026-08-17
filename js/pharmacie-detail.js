/*
  FICHE COMPLÈTE D'UNE PHARMACIE
  ================================
  Lit l'id dans l'URL (?id=...), retrouve la pharmacie dans le jeu
  de données, et affiche :
  - ses informations générales (aplaties en champ/valeur)
  - son commentaire admin (s'il y en a un)
  - le détail de CHAQUE réponse individuelle (une ligne par réponse
    au questionnaire), pour pouvoir par exemple repérer une note
    moyenne par raison de visite ou par motif.

  ⚠️ Charge le même fichier de dev que l'admin — à remplacer par un
  vrai appel backend authentifié une fois qu'il existe.
*/

const DATA_URL_DEV = "assets/data/admin-annuaire.json";

const MOTIF_LABELS = {
  preservatif: "Préservatif", contraception: "Contraception",
  contraception_urgence: "Contraception d'urgence", grossesse: "Grossesse/diagnostic",
  ivg: "IVG", protections_reutilisables: "Protections réutilisables",
  violences: "Violences", symptomes: "Symptômes", vaccin: "Vaccin",
  transition_hormonale: "Transition hormonale", don_ovocyte: "Don d'ovocyte",
  trouble_psy: "Trouble psychologique", autre: "Autre"
};
const RAISON_LABELS = { information: "Information", delivrance: "Délivrance" };
const RECOMMANDE_LABELS = { oui: "Oui", non: "Non", pas_sur: "Pas sûr·e" };

function flatten(obj, prefix = ""){
  let rows = [];
  for(const [k, v] of Object.entries(obj)){
    if(k === "reponses") continue; // affiché séparément, en vraie table
    const key = prefix ? `${prefix}.${k}` : k;
    if(v && typeof v === "object" && !Array.isArray(v)){
      rows = rows.concat(flatten(v, key));
    }else if(Array.isArray(v)){
      rows.push([key, v.length ? v.join(", ") : "—"]);
    }else{
      rows.push([key, String(v)]);
    }
  }
  return rows;
}

function formatDate(iso){
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

async function init(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const container = document.getElementById("fiche-container");

  if(!id){
    container.innerHTML = `<p class="pharmacy-list__empty">Aucun identifiant fourni dans l'URL (?id=...).</p>`;
    return;
  }

  try{
    const res = await fetch(DATA_URL_DEV);
    const pharmacies = await res.json();
    const p = pharmacies.find(p => p.id === id);

    if(!p){
      container.innerHTML = `<p class="pharmacy-list__empty">Aucune pharmacie trouvée pour l'identifiant "${id}".</p>`;
      return;
    }

    document.getElementById("fiche-titre").textContent = p.name;

    const commentaireHTML = p.commentaire ? `
      <div class="content__callout" style="margin:1.5rem 0;">
        <p><strong>Commentaire de l'équipe</strong><br>${p.commentaire}</p>
      </div>
    ` : "";

    const rows = flatten(p);
    const infosHTML = `
      <table class="admin-table" style="margin-bottom:2.5rem;">
        <thead><tr><th>Champ</th><th>Valeur</th></tr></thead>
        <tbody>
          ${rows.map(([k, v]) => `<tr><td><code>${k}</code></td><td>${v}</td></tr>`).join("")}
        </tbody>
      </table>
    `;

    const reponses = (p.reponses || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const reponsesHTML = `
      <h2 class="form-section__title" style="font-size:1.1rem; margin-bottom:1rem;">
        Détail des réponses (${reponses.length})
      </h2>
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type de visite</th>
              <th>Motifs</th>
              <th>Accueil</th>
              <th>Conseil</th>
              <th>Délivrance</th>
              <th>Confid.</th>
              <th>Expérience</th>
              <th>Recommande</th>
              <th>Remarques</th>
            </tr>
          </thead>
          <tbody>
            ${reponses.map(r => `
              <tr>
                <td>${formatDate(r.date)}</td>
                <td>${RAISON_LABELS[r.raison] || r.raison}</td>
                <td>${(r.motifs || []).map(m => MOTIF_LABELS[m] || m).join(", ")}</td>
                <td>${r.criteria.accueil.toFixed(1)}</td>
                <td>${r.criteria.conseil.toFixed(1)}</td>
                <td>${r.criteria.delivrance.toFixed(1)}</td>
                <td>${r.criteria.confidentialite.toFixed(1)}</td>
                <td>${r.criteria.experience.toFixed(1)}</td>
                <td>${RECOMMANDE_LABELS[r.recommande] || r.recommande}</td>
                <td>${r.remarques || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = commentaireHTML + infosHTML + reponsesHTML;
  }catch(err){
    console.error("Impossible de charger la fiche :", err);
    container.innerHTML = `<p class="pharmacy-list__empty">Impossible de charger les données.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
