/* ════════════════════════════════════════════════════
   BuiltByInstincts — Projects redesign · app logic
   ════════════════════════════════════════════════════ */
(function () {
  const grid = document.getElementById('grid');
  const filtersEl = document.getElementById('filters');
  const ov = document.getElementById('ov');
  const ovCard = document.getElementById('ovCard');

  let activeFilter = 'all';
  let current = null;   // current project index
  let slide = 0;

  /* ── count per filter ── */
  function countFor(key) {
    if (key === 'all') return PROJECTS.length;
    return PROJECTS.filter(p => p.filters.includes(key)).length;
  }

  /* ── render filter chips ── */
  function renderFilters() {
    filtersEl.innerHTML = '';
    FILTER_DEFS.forEach(f => {
      const n = countFor(f.key);
      if (n === 0) return;
      const b = document.createElement('button');
      b.className = 'filter' + (f.key === activeFilter ? ' active' : '');
      b.innerHTML = `${f.label}<span class="count">${String(n).padStart(2, '0')}</span>`;
      b.onclick = () => { activeFilter = f.key; renderFilters(); renderGrid(); };
      filtersEl.appendChild(b);
    });
  }

  /* ── render bento grid ── */
  function renderGrid() {
    grid.innerHTML = '';
    const list = PROJECTS.filter(p => activeFilter === 'all' || p.filters.includes(activeFilter));
    document.getElementById('m-count').textContent = list.length;

    list.forEach((p, i) => {
      const idx = PROJECTS.indexOf(p);
      const featured = activeFilter === 'all' && idx === 0;
      const tile = document.createElement('article');
      tile.className = 'tile' + (featured ? ' featured' : '');
      tile.style.setProperty('--tacc', p.acc);

      const chipCount = featured ? 6 : 3;
      const shown = p.stack.slice(0, chipCount);
      const extra = p.stack.length - shown.length;
      const chipsHtml = shown.map(s => `<span class="chip">${s}</span>`).join('') +
        (extra > 0 ? `<span class="chip more">+${extra}</span>` : '');

      const hlHtml = featured
        ? `<ul class="tile-hl">${p.highlights.slice(0, 3).map(h => `<li>${h}</li>`).join('')}</ul>`
        : '';

      const logoHtml = (featured && p.logo)
        ? `<img class="tile-logo" src="${p.logo}" alt="${p.name} logo" />`
        : '';

      const phoneHtml = (featured && p.shots && p.shots.length)
        ? `<div class="tile-phone">
            <div class="iphone"><div class="iphone-screen" data-phone>${
              p.shots.map((s, n) => `<div class="iphone-shot"><img src="${s}" alt="${p.name} screen ${n + 1}" loading="lazy" /></div>`).join('')
            }</div></div>
            <div class="phone-nav" data-dots>${p.shots.map((_, n) => `<i class="${n === 0 ? 'on' : ''}"></i>`).join('')}</div>
          </div>`
        : '';

      const bodyHtml = `
        <div class="tile-top">
          ${logoHtml}
          <span class="status" style="color:${p.statusColor}">
            <span class="dot" style="--st:${p.statusColor}"></span>${p.statusLabel}
          </span>
        </div>
        <h3 class="tile-name">${p.name}</h3>
        <div class="tile-domain">${p.domain}</div>
        ${featured ? `<p class="tile-liner">${p.liner}</p>` : ''}
        <div class="tile-impact">
          <span class="impact-stat">${p.impact.stat}</span>
          <p class="impact-line">${p.impact.line}</p>
        </div>
        ${hlHtml}
        <div class="tile-signal"></div>
        <div class="tile-foot">
          <div class="chips">${chipsHtml}</div>
          <span class="tile-cta"><span>View case study</span><span class="arrow">→</span></span>
        </div>`;

      tile.innerHTML = featured
        ? `<div class="tile-bloom"></div>
           <div class="tile-num">${p.num}</div>
           <div class="tile-split">
             <div class="tile-body">${bodyHtml}</div>
             ${phoneHtml}
           </div>`
        : `<div class="tile-bloom"></div>
           <div class="tile-num">${p.num}</div>
           ${bodyHtml}`;

      tile.onclick = () => openOverlay(idx);

      // Phone: drag-to-scroll + clickable dots. A real click still opens the
      // overlay (click-anywhere); only a drag is suppressed from opening it.
      const phone = tile.querySelector('[data-phone]');
      if (phone) {
        const dots = [...tile.querySelectorAll('[data-dots] i')];
        const sync = () => {
          const k = Math.round(phone.scrollLeft / phone.clientWidth);
          dots.forEach((d, n) => d.classList.toggle('on', n === k));
        };
        phone.addEventListener('scroll', sync, { passive: true });

        dots.forEach((d, n) => d.addEventListener('click', e => {
          e.stopPropagation();
          phone.scrollLeft = n * phone.clientWidth;   // CSS scroll-behavior animates in a live tab
        }));

        let down = false, startX = 0, startLeft = 0, moved = 0;
        phone.addEventListener('pointerdown', e => {
          down = true; startX = e.clientX; startLeft = phone.scrollLeft; moved = 0;
          phone.classList.add('dragging');
          phone.setPointerCapture(e.pointerId);
        });
        phone.addEventListener('pointermove', e => {
          if (!down) return;
          const dx = e.clientX - startX;
          moved = Math.max(moved, Math.abs(dx));
          phone.scrollLeft = startLeft - dx;
        });
        const end = e => {
          if (!down) return;
          down = false;
          phone.classList.remove('dragging');
          try { phone.releasePointerCapture(e.pointerId); } catch (_) {}
          const k = Math.round(phone.scrollLeft / phone.clientWidth);
          phone.scrollLeft = k * phone.clientWidth;   // snap to nearest screen (instant = reliable)
        };
        phone.addEventListener('pointerup', end);
        phone.addEventListener('pointercancel', end);
        // swallow the click that follows a drag so it doesn't open the overlay
        phone.addEventListener('click', e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } });
      }

      grid.appendChild(tile);
    });
  }

  /* ── link buttons (shared by both slides) ── */
  function linksHtml(p) {
    const repo = `<a class="lnk lnk-repo" href="${p.repoUrl}" target="_blank" rel="noopener">${ICONS.github}View Repo</a>`;
    const ui = `<a class="lnk lnk-ui" href="${p.uiUrl}" target="_blank" rel="noopener" ${p.uiDummy ? 'data-dummy="1"' : ''}>${ICONS.ui}Live UI</a>`;
    return ui + repo;
  }

  /* ── populate + open overlay ── */
  function openOverlay(idx) {
    current = idx; slide = 0;
    const p = PROJECTS[idx];
    ovCard.style.setProperty('--tacc', p.acc);

    document.getElementById('ovNum').textContent = p.num;
    document.getElementById('ovName').textContent = p.name;

    // Slide 0
    document.getElementById('ovHeadline').textContent = p.headline;
    document.getElementById('ovLead').innerHTML = p.lead;
    document.getElementById('ovBenefit').textContent = p.benefit;
    document.getElementById('ovMarket').innerHTML = p.market.map(m =>
      `<div class="cell"><span class="big">${m.big}</span><div class="cap">${m.cap.replace(/\s*\/\*\s*DUMMY\s*\*\//, '')}</div></div>`
    ).join('');

    // Persistent header links
    document.getElementById('ovLinks').innerHTML = linksHtml(p);

    // Slide 1
    document.getElementById('ovArch').innerHTML = p.arch.map(n => `<div class="node">${n}</div>`).join('');
    document.getElementById('ovHighlights').innerHTML = p.highlights.map(h => `<li>${h}</li>`).join('');
    document.getElementById('ovStack').innerHTML = p.stack.map(s =>
      `<span class="pill">${TECH_ICONS[s] || TECH_ICONS._fallback}${s}</span>`).join('');

    goSlide(0);
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeOverlay() {
    ov.classList.remove('open');
    document.body.style.overflow = '';
    current = null;
  }

  /* ── slide nav ── */
  function goSlide(n) {
    slide = n;
    document.getElementById('slide0').classList.toggle('active', n === 0);
    document.getElementById('slide1').classList.toggle('active', n === 1);
    document.querySelectorAll('.dot-nav').forEach(d =>
      d.classList.toggle('active', +d.dataset.slide === n));
    const prev = document.getElementById('ovPrev');
    const next = document.getElementById('ovNext');
    prev.disabled = n === 0;
    next.disabled = n === 1;
    next.style.visibility = n === 1 ? 'hidden' : 'visible';
    document.getElementById('ovSlideLabel').textContent = `${String(n + 1).padStart(2, '0')} / 02`;
    // reset scroll
    const s = document.getElementById('slide' + n);
    if (s) s.scrollTop = 0;
  }

  /* ── wire controls ── */
  document.getElementById('ovNext').onclick = () => goSlide(1);
  document.getElementById('ovPrev').onclick = () => goSlide(0);
  document.querySelectorAll('.dot-nav').forEach(d =>
    d.onclick = () => goSlide(+d.dataset.slide));
  document.querySelectorAll('[data-close]').forEach(el => el.onclick = closeOverlay);

  document.addEventListener('keydown', e => {
    if (!ov.classList.contains('open')) return;
    if (e.key === 'Escape') closeOverlay();
    else if (e.key === 'ArrowRight') goSlide(1);
    else if (e.key === 'ArrowLeft') goSlide(0);
  });

  renderFilters();
  renderGrid();
})();
