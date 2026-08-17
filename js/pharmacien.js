/*
  JE SUIS UNE PHARMACIEN·NE — demande de retrait
  ================================================
  Envoie la demande directement au backend en JSON (comme le
  questionnaire), avec un objet [RETIRER] + nom de la pharmacie
  pour que ce soit facile à repérer/trier côté back-office.

  ⚠️ À FAIRE : remplacer API_URL par l'URL réelle du backend une
  fois qu'il sera en place.
*/

const API_URL = "https://VOTRE-BACKEND.example/api/retraits";

async function loadPharmacies(){
  const select = document.getElementById('pharmacie-retrait');
  try{
    const res = await fetch('assets/data/annuaire.json');
    const pharmacies = await res.json();
    pharmacies
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.dataset.address = `${p.address}, ${p.city}`;
        opt.textContent = `${p.name} — ${p.address}`;
        select.appendChild(opt);
      });
  }catch(err){
    console.error("Impossible de charger la liste des pharmacies :", err);
  }
}

function initChampsManuels(){
  const select = document.getElementById('pharmacie-retrait');
  const champsManuels = document.getElementById('pharmacie-manuelle-champs');
  const sync = () => { champsManuels.hidden = select.value !== ''; };
  select.addEventListener('change', sync);
  sync();
}

function initForm(){
  const form = document.getElementById('retrait-form');
  const select = document.getElementById('pharmacie-retrait');
  const formError = document.getElementById('form-error');
  const sendError = document.getElementById('form-send-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    let nom, adresse;
    if(select.value){
      nom = select.value;
      adresse = select.selectedOptions[0].dataset.address || '';
    }else{
      nom = document.getElementById('nom-manuel').value.trim();
      adresse = document.getElementById('adresse-manuel').value.trim();
    }

    if(!nom){
      formError.hidden = false;
      formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    formError.hidden = true;
    sendError.hidden = true;

    const message = document.getElementById('message-retrait').value.trim();

    const payload = {
      objet: `[RETIRER] ${nom}`,
      nom,
      adresse,
      message
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
  initChampsManuels();
  initForm();
});
