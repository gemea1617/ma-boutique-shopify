/* GEMEA — comportements de la vitrine. Pas de dépendance, pas de framework. */
(function () {
  'use strict';

  /* ------------------------------------------------------- Menu mobile */
  document.querySelectorAll('[data-menu-toggle]').forEach(function (button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
  });

  /* ------------------------------------------------- Sélecteur de quantité */
  document.querySelectorAll('[data-qty]').forEach(function (wrapper) {
    var input = wrapper.querySelector('input');
    if (!input) return;

    wrapper.querySelectorAll('button[data-qty-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        var step = parseInt(button.dataset.qtyStep, 10);
        var min = parseInt(input.min, 10) || 1;
        var next = (parseInt(input.value, 10) || min) + step;
        input.value = String(Math.max(min, next));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });

  /* ------------------------------------------------------ Galerie produit */
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var main = gallery.querySelector('[data-gallery-main]');
    if (!main) return;

    gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.dataset.full;
        main.srcset = '';
        main.alt = thumb.dataset.alt || '';
        gallery
          .querySelectorAll('[data-gallery-thumb]')
          .forEach(function (other) { other.setAttribute('aria-current', 'false'); });
        thumb.setAttribute('aria-current', 'true');
      });
    });
  });

  /* ------------------------------------------------ Variantes du produit */
  document.querySelectorAll('[data-variants]').forEach(function (form) {
    var variants;
    try {
      variants = JSON.parse(form.querySelector('[data-variants-json]').textContent);
    } catch (error) {
      return;
    }

    var idInput = form.querySelector('[data-variant-id]');
    var priceNode = form.querySelector('[data-variant-price]');
    var submit = form.querySelector('[data-add-button]');
    var soldOutLabel = submit ? submit.dataset.soldOut : '';
    var addLabel = submit ? submit.dataset.add : '';

    function currentOptions() {
      return Array.prototype.map.call(
        form.querySelectorAll('[data-option-index]'),
        function (group) {
          var checked = group.querySelector('input:checked');
          return checked ? checked.value : null;
        }
      );
    }

    function update() {
      var chosen = currentOptions();
      var match = variants.find(function (variant) {
        return chosen.every(function (value, index) {
          return value === null || variant.options[index] === value;
        });
      });

      if (!match) return;

      if (idInput) idInput.value = match.id;
      if (priceNode) priceNode.innerHTML = match.price_html;

      if (submit) {
        submit.disabled = !match.available;
        submit.textContent = match.available ? addLabel : soldOutLabel;
      }

      // Garder l'URL partageable sans recharger la page.
      var url = new URL(window.location.href);
      url.searchParams.set('variant', match.id);
      window.history.replaceState({}, '', url);
    }

    form.querySelectorAll('[data-option-index] input').forEach(function (input) {
      input.addEventListener('change', update);
    });
  });

  /* --------------------------------------------- Produits recommandés */
  document.querySelectorAll('[data-recommendations]').forEach(function (holder) {
    fetch(holder.dataset.url)
      .then(function (response) { return response.text(); })
      .then(function (html) {
        var fresh = new DOMParser()
          .parseFromString(html, 'text/html')
          .querySelector('[data-recommendations]');
        if (fresh) holder.innerHTML = fresh.innerHTML;
      })
      .catch(function () { /* pas de suggestions : la section reste vide */ });
  });

  /* ------------------------------------------- Tri d'une page collection */
  document.querySelectorAll('[data-sort]').forEach(function (select) {
    select.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', select.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  });
})();
