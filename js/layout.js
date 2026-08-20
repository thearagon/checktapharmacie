/*
  BANDEAUX PARTAGÉS — <site-header> et <site-footer>
  ====================================================
  Définis une seule fois ici, utilisés sur chaque page via :
    <site-header></site-header>
    <site-footer></site-footer>

  CHEMINS RELATIFS AUTO-ADAPTÉS
  ------------------------------
  Ce fichier peut être chargé depuis la racine (index.html) ou depuis
  ressources/ (ressources/droits.html, etc.) — deux profondeurs
  différentes. Comme layout.js ne peut pas utiliser un seul chemin
  fixe qui marche aux deux niveaux, on calcule deux préfixes au
  chargement du script :
    ROOT : chemin vers la racine du site (ex: "assets/", "css/"...)
           → "" si on est déjà à la racine, "../" si on est dans
           ressources/
    RES  : chemin vers une autre page de ressources/
           → "ressources/" si on est à la racine, "" si on y est déjà
  Ça permet de déployer le site n'importe où (racine du domaine,
  GitHub Pages en sous-dossier de projet, etc.) sans rien changer.

  La page active est détectée automatiquement (comparaison du nom
  de fichier dans l'URL avec le href de chaque lien) — pas besoin
  de préciser quoi que ce soit page par page.

  IMPORTANT : chaque lien de nav doit envelopper son texte dans
  <span class="nav__label">...</span> — c'est ce span que
  _markActivePage() va chercher pour lui appliquer dynamiquement
  les classes "chalk chalk--onviolet". Un lien sans ce span ne
  sera jamais mis en valeur, même actif.

  Pour modifier le contenu du bandeau (liens, logos, structure) :
  modifier uniquement le template ci-dessous, ça se répercute
  partout automatiquement.
*/

const DANS_RESSOURCES = location.pathname.includes('/ressources/');
const ROOT = DANS_RESSOURCES ? '../' : '';
const RES = DANS_RESSOURCES ? '' : 'ressources/';

class SiteHeader extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
  <div class="header__logos">
  <a class="logo" href="${ROOT}index.html" aria-label="Retour à l'accueil">
  <img src="${ROOT}assets/logos/checktapharmacie.svg" alt="">
</a>
<a class="logo logo--secondary" href="https://www.planning-familial.org/fr/leplanning38" aria-label="Site du Planning Familial" target="_blank" rel="noopener">
  <img src="${ROOT}assets/logos/logo_pf38_horiz.svg" alt="">
</a>
  </div>

  <nav class="nav" aria-label="Navigation principale">
    <ul class="nav__list">
      <li><a class="nav__link" href="${ROOT}index.html">Accueil</a></li>
      <li><a class="nav__link" href="${ROOT}recommander.html">Recommander une pharmacie</a></li>
      <li><a class="nav__link" href="${ROOT}trouver.html">Trouver une pharmacie</a></li>
      <li class="nav__item--dropdown">
        <a class="nav__link" href="${ROOT}ressources.html" aria-haspopup="true">
          Ressources
          <svg class="icon" aria-hidden="true"><use href="${ROOT}assets/icons/sprite.svg#icon-chevron-down"></use></svg>
        </a>
        <ul class="nav__dropdown">
          <li><a href="${RES}droits.html">Mes droits</a></li>
          <li><a href="${RES}abus.html">Que faire en cas d'abus ?</a></li>
          <span class="nav__sublabel">L'annuaire</span>
          <li><a href="${RES}faq.html">FAQ</a></li>
          <li><a href="${RES}pharmacienne.html">Je suis pharmacien·ne</a></li>
        </ul>
      </li>
      <li><a class="nav__link" href="https://www.helloasso.com/associations/planning-familial-isere/formulaires/2">Soutenir le Planning Familial</a></li>
    </ul>
    <button class="nav__burger" aria-label="Ouvrir le menu">
      <span></span><span></span><span></span>
    </button>
  </nav>
    `;

    this._markActivePage();
    this._wireBurger();
    this._wireDropdownMobile();
  }

  _markActivePage(){
    const path = location.pathname;
    const here = path.split('/').pop() || 'index.html';

    this.querySelectorAll('.nav__link[href]').forEach(link => {
      const href = link.getAttribute('href');
      const target = href.split('/').pop();

      // Actif si : c'est exactement la page courante, OU si on navigue
      // quelque part dans ressources/ et que ce lien est celui vers
      // "Ressources" dans le menu principal.
      const estCeLien = target === here;
      const estRessourcesDepuisSousPage = DANS_RESSOURCES && target === 'ressources.html';

      if (estCeLien || estRessourcesDepuisSousPage) {
        link.setAttribute('aria-current', 'page');

        let label = link.querySelector('.nav__label');
        if (!label) {
          const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
          let textNode;
          while ((textNode = walker.nextNode())) {
            if (textNode.textContent.trim()) break;
          }
          if (textNode) {
            label = document.createElement('span');
            label.className = 'nav__label';
            textNode.replaceWith(label);
            label.appendChild(textNode);
          }
        }

        if (label) label.classList.add('chalk', 'chalk--onviolet');
      }
    });
  }

_wireBurger(){
  const nav = this.querySelector('.nav');
  const burger = this.querySelector('.nav__burger');
  burger.addEventListener('click', () => {
    nav.classList.toggle('is-open');
  });
}
_wireDropdownMobile(){
  const item = this.querySelector('.nav__item--dropdown');
  const trigger = item.querySelector(':scope > .nav__link');
  trigger.addEventListener('click', (e) => {
    if(window.matchMedia('(max-width: 880px)').matches){
      e.preventDefault();
      item.classList.toggle('is-open');
    }
  });
}
}

class SiteFooter extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
<ul class="footer__list">
    <li><a class="footer__link" href="${RES}pourquoi.html">Pourquoi cet annuaire ?</a></li>
    <li><a class="footer__link" href="${RES}faq.html">FAQ</a></li>
    <li><a class="footer__link" href="${RES}contact.html">Contact</a></li>
    <li>
      <a class="footer__link" href="https://www.instagram.com/planningfamilial38/" target="_blank" rel="noopener" aria-label="Instagram">
        <svg class="icon" aria-hidden="true"><use href="${ROOT}assets/icons/sprite.svg#icon-instagram"></use></svg>
      </a>
    </li>
    <li>
      <a class="footer__link" href="https://www.planning-familial.org/fr/leplanning38" target="_blank" rel="noopener" aria-label="Planning Familial">
        <svg class="icon" aria-hidden="true"><use href="${ROOT}assets/icons/sprite.svg#icon-bullseye"></use></svg>
      </a>
    </li>
    <a class="nav__login" href="${ROOT}admin.html">Se connecter</a>
  </ul>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
