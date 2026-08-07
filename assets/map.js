
/* ---- Interactive footprint map: pan, zoom, arcs, click popups ---- */
(function () {
  var svg = document.getElementById('worldMap');
  if (!svg) return;
  var wrap = document.getElementById('mapWrap');
  var pop = document.getElementById('mapPop');
  var FULL = { x: 0, y: 0, w: 1000, h: 470 };
  var vb = { x: 0, y: 0, w: 1000, h: 470 };
  var MINW = 110; // ~9x max zoom
  var active = null; // marker element with open popup

  var landPath = document.getElementById('landPath');
  var arcs = [].slice.call(svg.querySelectorAll('.arc'));
  var mks = [].slice.call(svg.querySelectorAll('.mk'));

  function apply() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    var k = vb.w / FULL.w; // <1 when zoomed in: keeps screen sizes constant
    landPath.setAttribute('stroke-width', (0.7 * k).toFixed(2));
    arcs.forEach(function (a) {
      a.setAttribute('stroke-width', (1.6 * k).toFixed(2));
      a.setAttribute('stroke-dasharray', (4 * k) + ' ' + (6 * k));
    });
    mks.forEach(function (m) {
      if (m.tagName === 'circle') {
        m.setAttribute('r', (parseFloat(m.dataset.r) * k).toFixed(2));
        m.setAttribute('stroke-width', (2 * k).toFixed(2));
      } else { // the me-pin group
        m.setAttribute('transform', 'translate(' + m.dataset.x + ',' + m.dataset.y + ') scale(' + k + ')');
      }
    });
    positionPop();
  }

  function positionPop() {
    if (!active) return;
    var r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    var mx = parseFloat(active.dataset.x), my = parseFloat(active.dataset.y);
    var left = (mx - vb.x) / vb.w * r.width + (r.left - wr.left);
    var top = (my - vb.y) / vb.h * r.height + (r.top - wr.top);
    var k = vb.w / FULL.w;
    top -= (active.tagName === 'g' ? 28 * k / (vb.w / FULL.w) : parseFloat(active.dataset.r)) * (r.width / vb.w) * k;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function showPop(m) {
    active = m;
    document.getElementById('mpTtl').textContent = m.dataset.title;
    document.getElementById('mpLoc').textContent = m.dataset.loc;
    document.getElementById('mpPpl').textContent = m.dataset.ppl;
    pop.hidden = false;
    positionPop();
  }
  function hidePop() { active = null; pop.hidden = true; }

  function clamp() {
    vb.w = Math.max(MINW, Math.min(FULL.w, vb.w));
    vb.h = vb.w * FULL.h / FULL.w;
    vb.x = Math.max(0, Math.min(FULL.w - vb.w, vb.x));
    vb.y = Math.max(0, Math.min(FULL.h - vb.h, vb.y));
  }
  function svgPoint(cx, cy) {
    var r = svg.getBoundingClientRect();
    return { x: vb.x + (cx - r.left) / r.width * vb.w,
             y: vb.y + (cy - r.top) / r.height * vb.h };
  }
  function zoomAt(p, factor) {
    var nw = vb.w * factor;
    if (nw < MINW) factor = MINW / vb.w;
    if (nw > FULL.w) factor = FULL.w / vb.w;
    vb.x = p.x - (p.x - vb.x) * factor;
    vb.y = p.y - (p.y - vb.y) * factor;
    vb.w *= factor;
    clamp(); apply();
  }

  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(svgPoint(e.clientX, e.clientY), e.deltaY < 0 ? 0.82 : 1 / 0.82);
  }, { passive: false });

  // pan + pinch via pointer events
  var pointers = {};
  var panStart = null, pinchStart = null;
  svg.addEventListener('pointerdown', function (e) {
    // presses on a marker belong to the marker's click handler —
    // capturing here would swallow its pointerup (the popup bug)
    if (e.target.closest && e.target.closest('.mk')) return;
    hidePop();
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(pointers);
    if (keys.length === 1) {
      panStart = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
      svg.setPointerCapture(e.pointerId);
    } else if (keys.length === 2) {
      var a = pointers[keys[0]], b = pointers[keys[1]];
      pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w,
                     cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      panStart = null;
    }
  });
  svg.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var keys = Object.keys(pointers);
    if (keys.length === 2 && pinchStart) {
      var a = pointers[keys[0]], b = pointers[keys[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      var p = svgPoint(pinchStart.cx, pinchStart.cy);
      var targetW = pinchStart.w * pinchStart.d / Math.max(d, 1);
      zoomAt(p, targetW / vb.w);
    } else if (panStart) {
      var r = svg.getBoundingClientRect();
      vb.x = panStart.vx - (e.clientX - panStart.x) * vb.w / r.width;
      vb.y = panStart.vy - (e.clientY - panStart.y) * vb.h / r.height;
      clamp(); apply();
    }
  });
  function endPointer(e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) pinchStart = null;
    if (Object.keys(pointers).length < 1) panStart = null;
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  // marker clicks (suppress when it was a pan)
  mks.forEach(function (m) {
    var down = null;
    m.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
    m.addEventListener('pointerup', function (e) {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
        e.stopPropagation();
        if (active === m) hidePop(); else showPop(m);
      }
      down = null;
    });
  });

  document.getElementById('mzIn').addEventListener('click', function () {
    zoomAt({ x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }, 0.7);
  });
  document.getElementById('mzOut').addEventListener('click', function () {
    zoomAt({ x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 }, 1 / 0.7);
  });
  document.getElementById('mzReset').addEventListener('click', function () {
    vb = { x: 0, y: 0, w: 1000, h: 470 }; hidePop(); apply();
  });
  window.addEventListener('resize', positionPop);
  apply();
})();
