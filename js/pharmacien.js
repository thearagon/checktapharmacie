/*
  JE SUIS UNE PHARMACIEN·NE — demande de retrait
  ================================================
  Envoie pharmacie_id + nom + e-mail de contact + message au backend, qui
  vérifie automatiquement le nom contre le registre de l'Ordre des
  pharmaciens pour cette officine (voir api_reponses.py, route
  /api/retraits) avant de retirer quoi que ce soit.

  Autocomplétion identique à celle du questionnaire : un champ texte
  (datalist) + un champ caché résolu uniquement sur correspondance
  exacte avec une pharmacie de la liste.

  ⚠️ À FAIRE : remplacer API_URL par l'URL réelle du backend une
  fois qu'il sera en place.
*/

const API_URL = "https://VOTRE-BACKEND.example/api/retraits";

// Sert au calcul du temps de remplissage (signal anti-bot, comme pour
// le questionnaire).
const FORM_LOADED_AT = Date.now();

let pharmaciesParLibelle = new Map();

async function loadPharmacies(){
  const datalist = document.getElementById('pharmacies-retrait-list');
  try{
    const res = await fetch('../assets/data/annuaire.json');
    const pharmacies = await res.json();
    pharmacies
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .forEach(p => {
        const libelle = `${p.name} — ${p.address}, ${p.city}`;
        const opt = document.createElement('option');
        opt.value = libelle;
        datalist.appendChild(opt);
        pharmaciesParLibelle.set(libelle, p.id);
      });
  }catch(err){
    console.error("Impossible de charger la liste des pharmacies :", err);
  }
}

function initPharmacieAutocomplete(){
  const input = document.getElementById('pharmacie-retrait');
  const hiddenId = document.getElementById('pharmacie_id');
  const avertissement = document.getElementById('pharmacie-non-trouvee');

  input.addEventListener('input', () => {
    const id = pharmaciesParLibelle.get(input.value);
    hiddenId.value = id || '';
    avertissement.hidden = true;
  });
}

function initForm(){
  const form = document.getElementById('retrait-form');
  const formError = document.getElementById('form-error');
  const sendError = document.getElementById('form-send-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const pharmacieId = form.pharmacie_id.value;
    const nomPharmacien = form.nom_pharmacien.value.trim();
    const emailContact = form.email_contact.value.trim();

    if(!pharmacieId || !nomPharmacien || !emailContact){
      formError.hidden = false;
      formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('pharmacie-non-trouvee').hidden = !!pharmacieId || !form.pharmacie.value.trim();
      return;
    }
    formError.hidden = true;
    sendError.hidden = true;

    const payload = {
      pharmacie_id: pharmacieId,
      nom_pharmacien: nomPharmacien,
      email_contact: emailContact,
      message: document.getElementById('message-retrait').value.trim(),
      site_web: form.site_web.value, // honeypot
      temps_remplissage_ms: Date.now() - FORM_LOADED_AT
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    try{
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error(`Réponse serveur : ${res.status}`);

      document.getElementById('retrait-form-wrapper').hidden = true;
      const confirmation = document.getElementById('retrait-confirmation');
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: 'smooth' });
    }catch(err){
      console.error("Échec de l'envoi de la demande de retrait :", err);
      sendError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer la demande de retrait';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPharmacies();
  initPharmacieAutocomplete();
  initForm();
});
