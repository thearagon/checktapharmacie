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

async function loadPharmacies(){
  const select = document.getElementById('pharmacie');
  try{
    const res = await fetch('assets/data/pharmacies.json');
    const pharmacies = await res.json();
    pharmacies.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = `${p.name} — ${p.address}`;
      select.appendChild(opt);
    });
  }catch(err){
    console.error('Impossible de charger la liste des pharmacies :', err);
  }
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
  if(!form.pharmacie.value) missing.push('pharmacie');
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
  initAutreReveal();
  initForm();
});
