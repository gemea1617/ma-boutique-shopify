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
    var image = gallery.querySelector('[data-stage-image]');
    var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('[data-thumb]'));
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
    }

    thumbs.forEach(function (thumb, position) {
      thumb.addEventListener('click', function () { show(position); });
    });

    gallery.querySelectorAll('[data-step]').forEach(function (arrow) {
      arrow.addEventListener('click', function () {
        show(index + parseInt(arrow.dataset.step, 10));
      });
    });

    // Le rail plus long que sa fenêtre défile d'une vignette à la fois.
    var railScroll = gallery.querySelector('[data-rail-scroll]');
    var track = gallery.querySelector('[data-thumbs]');
    if (railScroll && track) {
      railScroll.addEventListener('click', function () {
        var step = track.firstElementChild ? track.firstElementChild.offsetHeight + 10 : 88;
        track.scrollBy({ top: step, behavior: 'smooth' });
      });
    }

    // Une variante choisie amène son visuel au premier plan.
    var pdp = gallery.closest('[data-pdp]');
    if (pdp) {
      pdp.addEventListener('gemea:variant', function (event) {
        var target = event.detail.mediaIndex;
        if (target >= 0 && target < thumbs.length && target !== index) show(target);
      });
    }

    /* Visionneuse plein écran */
    var dialog = document.querySelector('[data-lightbox]');
    var opener = gallery.querySelector('[data-zoom-open]');
    if (dialog && opener && typeof dialog.showModal === 'function') {
      var large = dialog.querySelector('[data-lightbox-image]');

      opener.addEventListener('click', function () {
        large.src = image.src;
        large.alt = image.alt;
        dialog.showModal();
      });

      dialog.querySelector('[data-lightbox-close]').addEventListener('click', function () {
        dialog.close();
      });

      // Un clic sur le fond ferme aussi, comme on s'y attend d'une visionneuse.
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) dialog.close();
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
    var button = form.querySelector('[data-add-button]');
    var priceNodes = Array.prototype.slice.call(scope.querySelectorAll('[data-variant-price]'));

    function chosen() {
      return groups.map(function (group) {
        var checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    /* Grise les valeurs qui, combinées aux autres choix, n'existent pas ou
       sont épuisées — sans jamais les masquer. */
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
          if (label.classList.contains('pill')) label.classList.toggle('pill--out', !reachable);
          if (label.classList.contains('swatch')) label.classList.toggle('swatch--out', !reachable);
        });
      });
    }

    function update() {
      var values = chosen();
      var match = variants.find(function (variant) {
        return values.every(function (value, i) {
          return value === null || variant.options[i] === value;
        });
      });

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

      if (button) {
        button.disabled = !match.available;
        button.textContent = match.available ? button.dataset.add : button.dataset.soldOut;
      }

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

  /* ------------------------------------------------------------- Favoris
     Sans compte client, une envie ne peut être gardée que dans le navigateur
     du visiteur. C'est ce que le cœur promet, rien de plus. */
  (function () {
    var KEY = 'gemea:wishlist';

    function read() {
      try {
        return JSON.parse(localStorage.getItem(KEY)) || [];
      } catch (error) {
        return [];
      }
    }

    document.querySelectorAll('[data-wishlist]').forEach(function (button) {
      var id = button.dataset.wishlist;
      button.setAttribute('aria-pressed', String(read().indexOf(id) !== -1));

      button.addEventListener('click', function () {
        var kept = read();
        var position = kept.indexOf(id);
        if (position === -1) kept.push(id);
        else kept.splice(position, 1);

        try {
          localStorage.setItem(KEY, JSON.stringify(kept));
        } catch (error) { /* stockage indisponible : on n'insiste pas */ }

        button.setAttribute('aria-pressed', String(position === -1));
      });
    });
  })();

  /* ------------------------------------------------------- Offre groupée */

  function armBundle(button) {
    if (button.dataset.armed) return;
    button.dataset.armed = 'true';

    button.addEventListener('click', function () {
      var items = button.dataset.ids.split(',').map(function (id) {
        return { id: Number(id), quantity: 1 };
      });

      button.disabled = true;

      fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items }),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('cart');
          // Passer par /discount applique le code puis renvoie au panier.
          window.location.href = button.dataset.discount
            ? window.Shopify.routes.root + 'discount/' + encodeURIComponent(button.dataset.discount) + '?redirect=/cart'
            : window.Shopify.routes.root + 'cart';
        })
        .catch(function () {
          button.disabled = false;
        });
    });
  }

  /* ------------------------------------------------------------ Carrousels */

  function armCarousel(carousel) {
    var track = carousel.querySelector('[data-carousel-track]');
    if (!track || track.dataset.armed) return;
    track.dataset.armed = 'true';

    function refresh() {
      var max = track.scrollWidth - track.clientWidth - 1;
      carousel.querySelectorAll('[data-scroll]').forEach(function (arrow) {
        var forward = parseInt(arrow.dataset.scroll, 10) > 0;
        arrow.disabled = forward ? track.scrollLeft >= max : track.scrollLeft <= 0;
      });
    }

    carousel.querySelectorAll('[data-scroll]').forEach(function (arrow) {
      arrow.addEventListener('click', function () {
        var first = track.firstElementChild;
        var step = first ? first.offsetWidth + 24 : track.clientWidth * 0.8;
        track.scrollBy({ left: step * parseInt(arrow.dataset.scroll, 10), behavior: 'smooth' });
      });
    });

    track.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    refresh();
  }

  document.querySelectorAll('[data-carousel]').forEach(armCarousel);
  document.querySelectorAll('[data-bundle-add]').forEach(armBundle);

  /* --------------------------------------------- Recommandations et parures */
  document.querySelectorAll('[data-recommendations]').forEach(function (holder) {
    fetch(holder.dataset.url)
      .then(function (response) { return response.text(); })
      .then(function (html) {
        var fresh = new DOMParser()
          .parseFromString(html, 'text/html')
          .querySelector('[data-recommendations]');
        if (!fresh) return;

        holder.innerHTML = fresh.innerHTML;

        // Ce contenu vient d'arriver : ses comportements ne sont pas armés.
        holder.querySelectorAll('[data-carousel]').forEach(armCarousel);
        holder.querySelectorAll('[data-bundle-add]').forEach(armBundle);
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
