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
    var stage = gallery.querySelector('[data-stage]');
    var image = gallery.querySelector('[data-stage-image]');
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-thumb]'));
    var counter = gallery.querySelector('[data-counter]');
    if (!image) return;

    var index = 0;

    function show(next) {
      if (!thumbs.length) return;
      index = (next + thumbs.length) % thumbs.length;

      var thumb = thumbs[index];
      image.src = thumb.dataset.full;
      image.srcset = '';
      image.alt = thumb.dataset.alt || '';

      thumbs.forEach(function (other) { other.setAttribute('aria-current', 'false'); });
      thumb.setAttribute('aria-current', 'true');
      thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });

      if (counter) counter.textContent = String(index + 1);
    }

    thumbs.forEach(function (thumb, position) {
      thumb.addEventListener('click', function () { show(position); });
    });

    gallery.querySelectorAll('[data-step]').forEach(function (arrow) {
      arrow.addEventListener('click', function () {
        show(index + parseInt(arrow.dataset.step, 10));
      });
    });

    // Une couleur choisie amène son visuel au premier plan.
    var pdp = gallery.closest('[data-pdp]');
    if (pdp) {
      pdp.addEventListener('gemea:variant', function (event) {
        var target = event.detail.mediaIndex;
        if (target >= 0 && target < thumbs.length && target !== index) show(target);
      });
    }

    /* Zoom au survol : l'origine de la transformation suit le curseur. */
    if (stage && window.matchMedia('(hover: hover)').matches) {
      stage.addEventListener('mouseenter', function () { stage.classList.add('is-zoomed'); });
      stage.addEventListener('mouseleave', function () {
        stage.classList.remove('is-zoomed');
        image.style.transformOrigin = '';
      });
      stage.addEventListener('mousemove', function (event) {
        var box = stage.getBoundingClientRect();
        var x = ((event.clientX - box.left) / box.width) * 100;
        var y = ((event.clientY - box.top) / box.height) * 100;
        image.style.transformOrigin = x + '% ' + y + '%';
      });
    }
  });

  /* ------------------------------------------------ Variantes du produit */
  document.querySelectorAll('[data-variants]').forEach(function (form) {
    var holder = form.querySelector('[data-variants-json]');
    var variants;
    try {
      variants = JSON.parse(holder.textContent);
    } catch (error) {
      return;
    }

    var scope = form.closest('[data-pdp]') || document;
    var idInput = form.querySelector('[data-variant-id]');
    var groups = Array.prototype.slice.call(form.querySelectorAll('[data-option-index]'));
    var stock = form.querySelector('[data-stock]');
    var saveBadge = scope.querySelector('[data-save]');

    // Le bouton principal et celui de la barre collante suivent le même état.
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll('[data-add-button], [data-sticky-add]')
    );
    // Le prix est affiché à deux endroits : la colonne et la barre collante.
    var priceNodes = Array.prototype.slice.call(
      document.querySelectorAll('[data-variant-price]')
    );

    function chosen() {
      return groups.map(function (group) {
        var checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    function matches(values) {
      return variants.find(function (variant) {
        return values.every(function (value, i) {
          return value === null || variant.options[i] === value;
        });
      });
    }

    /* Grise les valeurs qui, combinées aux autres choix, n'existent pas
       ou sont épuisées — sans jamais les masquer. */
    function refreshAvailability(values) {
      groups.forEach(function (group, groupIndex) {
        group.querySelectorAll('input').forEach(function (input) {
          var probe = values.slice();
          probe[groupIndex] = input.value;

          var reachable = variants.some(function (variant) {
            return (
              variant.available &&
              probe.every(function (value, i) {
                return value === null || variant.options[i] === value;
              })
            );
          });

          var label = input.closest('[data-value-label]');
          if (!label) return;
          label.classList.toggle('pill--out', !reachable && label.classList.contains('pill'));
          label.classList.toggle('swatch--out', !reachable && label.classList.contains('swatch'));
        });
      });
    }

    function update() {
      var values = chosen();
      var match = matches(values);

      refreshAvailability(values);

      groups.forEach(function (group) {
        var checked = group.querySelector('input:checked');
        var readout = group.querySelector('[data-option-chosen]');
        if (checked && readout) readout.textContent = checked.value;
      });

      if (!match) return;

      if (idInput) idInput.value = match.id;

      priceNodes.forEach(function (node) {
        node.innerHTML = match.compare_html
          ? '<s>' + match.compare_html + '</s> ' + match.price_html
          : match.price_html;
      });

      if (saveBadge) {
        saveBadge.hidden = !match.compare_html;
        if (match.compare_html) saveBadge.textContent = '-' + match.save_percent + ' %';
      }

      buttons.forEach(function (button) {
        button.disabled = !match.available;
        button.textContent = match.available ? button.dataset.add : button.dataset.soldOut;
      });

      if (stock) {
        stock.classList.toggle('stock--out', !match.available);
        stock.textContent = match.available ? stock.dataset.inStock : stock.dataset.soldOut;
      }

      scope.dispatchEvent(
        new CustomEvent('gemea:variant', { detail: { mediaIndex: match.media_index } })
      );

      var url = new URL(window.location.href);
      url.searchParams.set('variant', match.id);
      window.history.replaceState({}, '', url);
    }

    groups.forEach(function (group) {
      group.querySelectorAll('input').forEach(function (input) {
        input.addEventListener('change', update);
      });
    });

    refreshAvailability(chosen());
  });

  /* --------------------------------------------------- Barre d'achat collante */
  (function () {
    var bar = document.querySelector('[data-sticky-buy]');
    var anchor = document.querySelector('[data-add-button]');
    if (!bar || !anchor || !('IntersectionObserver' in window)) return;

    bar.querySelector('[data-sticky-add]').addEventListener('click', function () {
      var form = anchor.closest('form');
      if (form) form.requestSubmit(anchor);
    });

    new IntersectionObserver(
      function (entries) {
        bar.dataset.visible = String(!entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
      },
      { threshold: 0 }
    ).observe(anchor);
  })();

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

  /* ------------------------------------------------------ Vus récemment */
  (function () {
    var KEY = 'gemea:recently-viewed';
    var MAX = 8;

    function read() {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
      } catch (error) {
        return [];
      }
    }

    // Mémorise le produit affiché, en tête de liste et sans doublon.
    var current = document.querySelector('[data-product-id]');
    if (current) {
      var id = current.dataset.productId;
      var kept = read().filter(function (other) { return other !== id; });
      kept.unshift(id);
      try {
        localStorage.setItem(KEY, JSON.stringify(kept.slice(0, MAX)));
      } catch (error) { /* stockage indisponible : on s'en passe */ }
    }

    var holder = document.querySelector('[data-recently-viewed]');
    if (!holder) return;

    var ids = read().filter(function (other) {
      return !current || other !== current.dataset.productId;
    });
    if (!ids.length) return;

    var query = ids.slice(0, parseInt(holder.dataset.count, 10) || 4)
      .map(function (other) { return 'id:' + other; })
      .join(' OR ');

    fetch(holder.dataset.url + '&q=' + encodeURIComponent(query))
      .then(function (response) { return response.text(); })
      .then(function (html) {
        var fresh = new DOMParser()
          .parseFromString(html, 'text/html')
          .querySelector('[data-recently-viewed]');
        if (fresh) holder.innerHTML = fresh.innerHTML;
      })
      .catch(function () { /* silencieux : la section reste vide */ });
  })();

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
