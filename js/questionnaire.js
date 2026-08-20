/*
  QUESTIONNAIRE
  =============
  - Charge la liste des pharmacies depuis assets/data/pharmacies.json
  - Valide les champs obligatoires (*)
  - Envoie les réponses en JSON vers l'API du backend
  - Affiche la page de fin une fois la réponse acceptée

  ⚠️ À FAIRE : remplacer API_URL par l'URL réelle de ton backend
  une fois qu'il est en place (PocketBase, API Python, etc.).
*/

const API_URL = "https://VOTRE-BACKEND.example/api/reponses";

// Enregistré au chargement de la page — sert à calculer le temps de
// remplissage, un des signaux anti-bot vérifiés côté backend.
const FORM_LOADED_AT = Date.now();

let pharmaciesParLibelle = new Map();

async function loadPharmacies(){
  const datalist = document.getElementById('pharmacies-list');
  try{
    const res = await fetch('assets/data/pharmacies.json');
    const pharmacies = await res.json();
    pharmacies.forEach(p => {
      // Le libellé combine nom + adresse complète (rue, ville, code postal)
      // — le navigateur filtre l'autocomplétion en cherchant ce texte tapé
      // n'importe où dans cette chaîne, donc ça marche aussi bien en tapant
      // le nom que la rue, la ville ou le code postal.
      const libelle = `${p.name} — ${p.address_full}`;
      const opt = document.createElement('option');
      opt.value = libelle;
      datalist.appendChild(opt);
      pharmaciesParLibelle.set(libelle, p.id);
    });
  }catch(err){
    console.error('Impossible de charger la liste des pharmacies :', err);
  }
}

function initPharmacieAutocomplete(){
  const input = document.getElementById('pharmacie');
  const hiddenId = document.getElementById('pharmacie_id');
  const avertissement = document.getElementById('pharmacie-non-trouvee');

  input.addEventListener('input', () => {
    const id = pharmaciesParLibelle.get(input.value);
    hiddenId.value = id || '';
    avertissement.hidden = true; // ne montre l'avertissement qu'à la tentative d'envoi, pas pendant la frappe
  });
}

function initAutreReveal(){
  const autreCheckbox = document.querySelector('input[name="pour"][value="autre"]');
  const autreChamp = document.getElementById('pour-autre-champ');
  if(!autreCheckbox || !autreChamp) return;
  const sync = () => { autreChamp.hidden = !autreCheckbox.checked; };
  sync();
  autreCheckbox.addEventListener('change', sync);
}

function validate(form){
  const missing = [];
  if(!form.pharmacie_id.value){
    missing.push('pharmacie');
    // Distingue "rien tapé du tout" de "tapé quelque chose qui ne correspond à rien"
    document.getElementById('pharmacie-non-trouvee').hidden = !form.pharmacie.value.trim();
  }
  if(!form.querySelector('input[name="raison"]:checked')) missing.push('raison');
  if(!form.querySelectorAll('input[name="pour"]:checked').length) missing.push('pour');
  ['accueil','conseil','delivrance','confidentialite','experience'].forEach(q => {
    if(!form.querySelector(`input[name="scale-${q}"]:checked`)) missing.push(q);
  });
  if(!form.querySelector('input[name="recommande"]:checked')) missing.push('recommande');
  return missing;
}

function serialize(form){
  const data = new FormData(form);
  const payload = {};
  for(const [key, value] of data.entries()){
    if(payload[key] === undefined){
      payload[key] = value;
    }else if(Array.isArray(payload[key])){
      payload[key].push(value);
    }else{
      payload[key] = [payload[key], value];
    }
  }
  // "pour" doit toujours être un tableau, même avec une seule case cochée
  // (sinon FormData ne produit qu'une chaîne simple, que le backend rejette).
  if(payload.pour !== undefined && !Array.isArray(payload.pour)){
    payload.pour = [payload.pour];
  }
  return payload;
}

function initForm(){
  const form = document.getElementById('questionnaire-form');
  const errorBanner = document.getElementById('form-error');
  const sendError = document.getElementById('form-send-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const missing = validate(form);
    if(missing.length){
      errorBanner.hidden = false;
      errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    errorBanner.hidden = true;
    sendError.hidden = true;

    const payload = serialize(form);
    payload.temps_remplissage_ms = Date.now() - FORM_LOADED_AT;
    // payload.site_web est déjà inclus automatiquement par serialize()
    // puisque c'est un champ du formulaire (le honeypot lui-même).

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    try{
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error(`Réponse serveur : ${res.status}`);

      document.getElementById('questionnaire-form-wrapper').hidden = true;
      const confirmation = document.getElementById('questionnaire-confirmation');
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: 'smooth' });
    }catch(err){
      console.error('Échec de l\'envoi du questionnaire :', err);
      sendError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer le questionnaire';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPharmacies();
  initPharmacieAutocomplete();
  initAutreReveal();
  initForm();
});
