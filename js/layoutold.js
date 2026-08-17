/*
  BANDEAUX PARTAGÉS — <site-header> et <site-footer>
  ====================================================
  Définis une seule fois ici, utilisés sur chaque page via :
    <site-header></site-header>
    <site-footer></site-footer>

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

class SiteHeader extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
  <div class="header__logos">
  <a class="logo" href="/index.html" aria-label="Retour à l'accueil">
  <img src="/assets/logos/logo_checktapharmacie.svg" alt="">
</a>
<a class="logo logo--secondary" href="https://www.planning-familial.org/fr/leplanning38" aria-label="Site du Planning Familial" target="_blank" rel="noopener">
  <img src="/assets/logos/logo_pf38_horiz.svg" alt="">
</a>
  </div>

  <nav class="nav" aria-label="Navigation principale">
    <ul class="nav__list">
      <li><a class="nav__link" href="/index.html">Accueil</a></li>
      <li><a class="nav__link" href="/recommander.html">Recommander une pharmacie</a></li>
      <li><a class="nav__link" href="/trouver.html">Trouver une pharmacie</a></li>
      <li class="nav__item--dropdown">
        <a class="nav__link" href="/ressources.html" aria-haspopup="true">
          Ressources
          <svg class="icon" aria-hidden="true"><use href="/assets/icons/sprite.svg#icon-chevron-down"></use></svg>
        </a>
        <ul class="nav__dropdown">
          <li><a href="/ressources/droits.html">Mes droits</a></li>
          <li><a href="/ressources/abus.html">Que faire en cas d'abus ?</a></li>
          <span class="nav__sublabel">L'annuaire</span>
          <li><a href="/ressources/criteres.html">Les critères de l'annuaire</a></li>
          <li><a href="/ressources/faq.html">FAQ</a></li>
          <li><a href="/ressources/pharmacienne.html">Je suis pharmacien·ne</a></li>
          <span class="nav__sublabel">Qui sommes-nous</span>
          <li><a href="/ressources/contact.html">Contact</a></li>
          <li><a href="https://www.planning-familial.org/fr/leplanning38">Le Planning Familial de l'Isère</a></li>
        </ul>
      </li>
      <li><a class="nav__link" href="https://www.helloasso.com/associations/planning-familial-isere/formulaires/2">Soutenir le Planning Familial</a></li>
    </ul>
    <a class="nav__login" href="#login">Se connecter</a>
    <button class="nav__burger" aria-label="Ouvrir le menu">
      <span></span><span></span><span></span>
    </button>
  </nav>
    `;

    this._markActivePage();
    this._wireBurger();
  }

  _markActivePage(){
    const here = location.pathname.split('/').pop() || 'index.html';
    this.querySelectorAll('.nav__link[href]').forEach(link => {
      const target = link.getAttribute('href').split('/').pop();
      if (target === here) {
        link.setAttribute('aria-current', 'page');

        let label = link.querySelector('.nav__label');
        if (!label) {
          // Pas de span dédié dans le markup : on enveloppe nous-mêmes
          // le texte du lien (le premier nœud texte non vide trouvé
          // dans .nav__link — ça marche même s'il y a une icône à côté).
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
    const burger = this.querySelector('.nav__burger');
    const navList = this.querySelector('.nav__list');
    const navLogin = this.querySelector('.nav__login');
    burger.addEventListener('click', () => {
      const open = navList.style.display === 'flex';
      navList.style.display = open ? 'none' : 'flex';
      navList.style.flexDirection = 'column';
      navLogin.style.display = open ? 'none' : 'inline-flex';
    });
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback(){
    this.innerHTML = `
<ul class="footer__list">
    <li><a class="footer__link" href="/ressources/pourquoi.html">Pourquoi cet annuaire ?</a></li>
    <li><a class="footer__link" href="/ressources/contact.html">Contact</a></li>
    <li>
      <a class="footer__link" href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
        <svg class="icon" aria-hidden="true"><use href="/assets/icons/sprite.svg#icon-instagram"></use></svg>
      </a>
    </li>
    <li>
      <a class="footer__link" href="https://www.planning-familial.org/fr/leplanning38" target="_blank" rel="noopener" aria-label="Planning Familial">
        <svg class="icon" aria-hidden="true"><use href="/assets/icons/sprite.svg#icon-bullseye"></use></svg>
      </a>
    </li>
  </ul>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
