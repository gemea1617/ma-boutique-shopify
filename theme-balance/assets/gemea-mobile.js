/**
 * GEMEA — interactions mobiles de la page produit.
 *
 * Tout ce qui suit ne s'active qu'en dessous de 750 px, le point de rupture
 * du thème Balance. Au-dessus, le script se contente de défaire ce qu'il a
 * appliqué, pour que le rendu desktop reste celui du thème.
 */
(() => {
  const MOBILE = window.matchMedia('(max-width: 749px)');

  /* ------------------------------------------------------------------ */
  /* Accroche produit : repliée à 4 lignes, dépliable d'une pression.    */
  /* ------------------------------------------------------------------ */
  const teaserState = new WeakMap();

  function setUpTeaser(teaser) {
    let toggle = teaserState.get(teaser);

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'gemea-teaser-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', () => {
        const clamped = teaser.dataset.gemeaClamped === 'true';
        teaser.dataset.gemeaClamped = clamped ? 'false' : 'true';
        toggle.textContent = clamped ? 'Voir moins' : 'Voir plus';
        toggle.setAttribute('aria-expanded', String(clamped));
      });
      teaserState.set(teaser, toggle);
    }

    teaser.dataset.gemeaClamped = 'true';
    toggle.textContent = 'Voir plus';
    toggle.setAttribute('aria-expanded', 'false');
    teaser.insertAdjacentElement('afterend', toggle);

    // Le bouton n'a de sens que si le texte déborde réellement.
    requestAnimationFrame(() => {
      const overflows = teaser.scrollHeight > teaser.clientHeight + 2;
      toggle.hidden = !overflows;
      if (!overflows) teaser.dataset.gemeaClamped = 'false';
    });
  }

  function tearDownTeaser(teaser) {
    delete teaser.dataset.gemeaClamped;
    teaserState.get(teaser)?.remove();
  }

  /* ------------------------------------------------------------------ */
  /* Accordéons : tout replié sur mobile, pour raccourcir la page.       */
  /* Le thème rouvre la ligne au redimensionnement via l'attribut        */
  /* open-by-default-on-mobile ; on le retire donc, en mémorisant sa     */
  /* présence pour pouvoir le restaurer sur desktop.                     */
  /* ------------------------------------------------------------------ */
  function collapseAccordions(root) {
    root.querySelectorAll('accordion-custom[open-by-default-on-mobile]').forEach((accordion) => {
      accordion.dataset.gemeaRestoreMobileOpen = 'true';
      accordion.removeAttribute('open-by-default-on-mobile');
      accordion.removeAttribute('open');
      accordion.querySelector('details')?.removeAttribute('open');
    });
  }

  function restoreAccordions(root) {
    root.querySelectorAll('accordion-custom[data-gemea-restore-mobile-open]').forEach((accordion) => {
      accordion.setAttribute('open-by-default-on-mobile', '');
      delete accordion.dataset.gemeaRestoreMobileOpen;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Guide des tailles : panneau glissant au lieu d'un changement de page */
  /* ------------------------------------------------------------------ */
  function sizeGuideSheet() {
    return document.getElementById('gemea-size-guide');
  }

  function onSizeGuideClick(event) {
    if (!MOBILE.matches) return;

    const link = event.target.closest('a[href*="guide-des-tailles"]');
    if (!link) return;

    const sheet = sizeGuideSheet();
    if (!sheet || typeof sheet.showModal !== 'function') return;

    event.preventDefault();
    sheet.showModal();
  }

  function setUpSheet() {
    const sheet = sizeGuideSheet();
    if (!sheet) return;

    sheet.querySelector('[data-gemea-sheet-close]')?.addEventListener('click', () => sheet.close());

    // Une pression en dehors du panneau referme, comme sur une vraie feuille.
    sheet.addEventListener('click', (event) => {
      if (event.target === sheet) sheet.close();
    });

    // Fermeture au glissement vers le bas.
    const panel = sheet.querySelector('.gemea-sheet__panel');
    if (!panel) return;

    let startY = null;

    panel.addEventListener(
      'touchstart',
      (event) => {
        startY = panel.scrollTop === 0 ? event.touches[0].clientY : null;
      },
      { passive: true }
    );

    panel.addEventListener(
      'touchmove',
      (event) => {
        if (startY === null) return;
        const delta = event.touches[0].clientY - startY;
        if (delta > 0) panel.style.transform = `translateY(${delta}px)`;
      },
      { passive: true }
    );

    panel.addEventListener('touchend', (event) => {
      if (startY === null) return;
      const delta = event.changedTouches[0].clientY - startY;
      panel.style.transform = '';
      startY = null;
      if (delta > 90) sheet.close();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Application / retrait selon la largeur                              */
  /* ------------------------------------------------------------------ */
  function apply() {
    const root = document;
    const teaser = root.querySelector('.gemea-teaser');

    if (MOBILE.matches) {
      if (teaser) setUpTeaser(teaser);
      collapseAccordions(root);
    } else {
      if (teaser) tearDownTeaser(teaser);
      restoreAccordions(root);
    }
  }

  function init() {
    apply();
    setUpSheet();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  MOBILE.addEventListener('change', apply);
  document.addEventListener('click', onSizeGuideClick);

  // Le thème réhydrate les sections après une mise à jour de variante.
  document.addEventListener('shopify:section:load', init);
})();
