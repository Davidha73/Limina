/**
 * orrery.js — Solar System Orrery for Lumina
 *
 * Reads lat/lon from Lumina's global `state.location` so it automatically
 * updates when the user changes location via the search bar.
 *
 * Depends on: astronomy.browser.min.js (loaded before this script via index.html)
 */

/* global Astronomy, state */
(function () {
  'use strict';

  const {
    Body, HelioVector, AstroTime, GeoVector,
    Ecliptic, Illumination, Observer, Equator, Horizon, JupiterMoons
  } = Astronomy;

  // ─── Planet Definitions ────────────────────────────────────────────────────
  const PLANETS = [
    { name: 'Mercury', body: Body.Mercury, color: '#A8A8A8', radius: 3 },
    { name: 'Venus',   body: Body.Venus,   color: '#E0C89C', radius: 4 },
    { name: 'Earth',   body: Body.Earth,   color: '#4b90ff', radius: 5 },
    { name: 'Mars',    body: Body.Mars,    color: '#E27B58', radius: 4 },
    { name: 'Jupiter', body: Body.Jupiter, color: '#C88B3A', radius: 10 },
    { name: 'Saturn',  body: Body.Saturn,  color: '#EAD6B8', radius: 8 },
    { name: 'Uranus',  body: Body.Uranus,  color: '#C1EAFA', radius: 6 },
    { name: 'Neptune', body: Body.Neptune, color: '#5B5DDF', radius: 6 }
  ];

  const MOON_DATA = {
    Mars:    [
      { name: 'Phobos',   dist: 50,  period: 0.31, size: 2.5, color: '#aaa' },
      { name: 'Deimos',   dist: 80,  period: 1.26, size: 2,   color: '#ccc' }
    ],
    Saturn:  [
      { name: 'Titan',     dist: 130, period: 15.9, size: 5,   color: '#d6b360' },
      { name: 'Enceladus', dist: 70,  period: 1.3,  size: 3,   color: '#d1e3e5' },
      { name: 'Rhea',      dist: 100, period: 4.5,  size: 3.5, color: '#c7c2bc' }
    ],
    Uranus:  [
      { name: 'Titania', dist: 80,  period: 8.7,  size: 3, color: '#b5b2a1' },
      { name: 'Oberon',  dist: 110, period: 13.4, size: 3, color: '#918b82' }
    ],
    Neptune: [
      { name: 'Triton', dist: 90, period: 5.8, size: 4, color: '#aab8ba' }
    ]
  };

  // ─── Planet Info (static facts + live distances rendered in focus view) ──────
  const PLANET_INFO = {
    Sun:     { type: 'G2V Star',          period: '25.4 days (rot)',  moons: '8 Planets', tagline: 'Contains 99.86% of all mass in the Solar System and powers life on Earth' },
    Mercury: { type: 'Terrestrial',  period: '88 Earth days',    moons: 0,   tagline: 'Days are longer than its years — it rotates just 3× per orbit' },
    Venus:   { type: 'Terrestrial',  period: '225 Earth days',   moons: 0,   tagline: 'Surface hot enough to melt lead; spins backwards vs. most planets' },
    Earth:   { type: 'Terrestrial',  period: '365.25 days',      moons: 1,   tagline: 'The only known world to harbour life — and you are on it right now' },
    Mars:    { type: 'Terrestrial',  period: '687 Earth days',   moons: 2,   tagline: 'Home to Olympus Mons, the tallest volcano in the solar system' },
    Jupiter: { type: 'Gas Giant',    period: '11.9 Earth years',  moons: 95,  tagline: 'The Great Red Spot is a storm that has raged for over 350 years' },
    Saturn:  { type: 'Gas Giant',    period: '29.5 Earth years',  moons: 146, tagline: 'Its rings span 282,000 km yet are only about 1 km thick' },
    Uranus:  { type: 'Ice Giant',    period: '84 Earth years',    moons: 28,  tagline: 'Rotates on its side with a 98° axial tilt — likely from a giant impact' },
    Neptune: { type: 'Ice Giant',    period: '165 Earth years',   moons: 16,  tagline: 'Winds reach 2,100 km/h — the fastest recorded in the solar system' },
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  let zoom         = 1;
  let targetZoom   = 1;
  let viewMode     = 'system';
  let modeProgress = 0;
  const planetPositions = {};

  // ─── DOM References ────────────────────────────────────────────────────────
  const canvas    = document.getElementById('orrery-canvas');
  const ctx       = canvas.getContext('2d');
  const tsEl      = document.getElementById('orrery-timestamp');
  const btnZoomIn  = document.getElementById('orrery-zoom-in');
  const btnZoomOut = document.getElementById('orrery-zoom-out');
  const btnZoomAll = document.getElementById('orrery-zoom-all');

  const infoPanel = document.getElementById('orrery-planet-info');
  const infoName  = document.getElementById('info-planet-name');
  const infoType  = document.getElementById('info-planet-type');
  const infoDistS = document.getElementById('info-dist-sun');
  const infoDistE = document.getElementById('info-dist-earth');
  const infoPeriod = document.getElementById('info-period');
  const infoMoons = document.getElementById('info-moons');
  const infoTagline = document.getElementById('info-tagline');


  // ─── Helper: get lat/lon from Lumina state (with fallback) ─────────────────
  function getLocation() {
    if (typeof state !== 'undefined' && state.location) {
      return { lat: state.location.lat, lon: state.location.lon };
    }
    return { lat: 51.5074, lon: -0.1278 }; // London fallback
  }

  // ─── Canvas Resize ─────────────────────────────────────────────────────────
  function resizeCanvas() {
    const dpr    = window.devicePixelRatio || 1;
    const rect   = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ─── Input: Wheel Zoom ─────────────────────────────────────────────────────
  canvas.addEventListener('wheel', (e) => {
    if (viewMode !== 'system') return;
    e.preventDefault();
    targetZoom = Math.max(0.1, Math.min(100, targetZoom * Math.exp(-e.deltaY * 0.001)));
  }, { passive: false });

  // ─── Input: Click to focus/unfocus planet ──────────────────────────────────
  canvas.addEventListener('click', (e) => {
    const rect   = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (viewMode === 'system') {
      // Check if Sun clicked (center of canvas)
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dxSun = clickX - cx;
      const dySun = clickY - cy;
      if (Math.sqrt(dxSun * dxSun + dySun * dySun) < 25) {
        viewMode = 'Sun';
        return;
      }

      for (const planet of PLANETS) {
        const pos = planetPositions[planet.name];
        if (pos) {
          const dx = clickX - pos.x;
          const dy = clickY - pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            viewMode = planet.name;
            return;
          }
        }
      }
    } else {
      viewMode = 'system';
    }
  });

  // ─── Input: Zoom Buttons ───────────────────────────────────────────────────
  btnZoomIn.addEventListener('click',  () => { targetZoom = Math.min(100, targetZoom * 1.5); });
  btnZoomOut.addEventListener('click', () => {
    // Always snap back to the full system view (all planets visible)
    targetZoom = 1;
    viewMode   = 'system';
  });
  btnZoomAll.addEventListener('click', () => {
    targetZoom = 1;
    viewMode   = 'system';
  });


  // ─── Off-screen Planet Indicators ─────────────────────────────────────────
  function drawOffScreenIndicators(width, height, cx, cy, alpha) {
    if (alpha <= 0.01) return;

    const EDGE = 30; // inset from canvas edge
    const A    = 7;  // arrow triangle half-size
    const GAP  = 8;  // min pixel gap between badges

    // ── 1. Collect all off-screen planets and measure their badges ──────
    ctx.font = '500 10px Inter, sans-serif';
    const inds = [];

    for (const planet of PLANETS) {
      const pos = planetPositions[planet.name];
      if (!pos) continue;
      if (pos.x >= 0 && pos.x <= width && pos.y >= 0 && pos.y <= height) continue;

      const angle = Math.atan2(pos.y - cy, pos.x - cx);
      const cos   = Math.cos(angle);
      const sin   = Math.sin(angle);

      let t = Infinity;
      if (cos >  1e-6) t = Math.min(t, (width  - EDGE - cx) / cos);
      if (cos < -1e-6) t = Math.min(t, (EDGE   - cx)        / cos);
      if (sin >  1e-6) t = Math.min(t, (height - EDGE - cy) / sin);
      if (sin < -1e-6) t = Math.min(t, (EDGE   - cy)        / sin);

      const ex = cx + cos * t;
      const ey = cy + sin * t;

      const tw   = ctx.measureText(planet.name).width;
      const padX = 7, padY = 4;
      const bw   = tw + padX * 2;
      const bh   = 10  + padY * 2;

      inds.push({ planet, ex, ey, bw, bh });
    }

    if (inds.length === 0) return;

    // ── 2. Parameterise onto inset-rectangle perimeter & sort ───────────
    const iW    = width  - 2 * EDGE;
    const iH    = height - 2 * EDGE;
    const perim = 2 * (iW + iH);

    const toS = (x, y) => {
      const eps = 2;
      if (Math.abs(y - EDGE) < eps)             return x - EDGE;                      // top
      if (Math.abs(x - (width  - EDGE)) < eps)  return iW + (y - EDGE);               // right
      if (Math.abs(y - (height - EDGE)) < eps)  return iW + iH + (width - EDGE - x); // bottom
      return 2 * iW + iH + (height - EDGE - y);                                       // left
    };

    const fromS = (s) => {
      s = ((s % perim) + perim) % perim;
      if (s < iW) return { x: EDGE + s,               y: EDGE };
      s -= iW;
      if (s < iH) return { x: width - EDGE,           y: EDGE + s };
      s -= iH;
      if (s < iW) return { x: width - EDGE - s,       y: height - EDGE };
      s -= iW;
      return              { x: EDGE,                  y: height - EDGE - s };
    };

    for (const ind of inds) ind.s = toS(ind.ex, ind.ey);
    inds.sort((a, b) => a.s - b.s);

    // ── 3. Iterative push-apart — 25 passes guarantees convergence ──────
    for (let pass = 0; pass < 25; pass++) {
      let moved = false;
      for (let i = 0; i < inds.length - 1; i++) {
        const a      = inds[i];
        const b      = inds[i + 1];
        const minSep = (a.bw + b.bw) / 2 + GAP;
        const ds     = b.s - a.s;
        if (ds < minSep) {
          const push = (minSep - ds) / 2;
          a.s -= push;
          b.s += push;
          moved = true;
        }
      }
      if (!moved) break;
    }

    // ── 4. Draw every indicator at its collision-free position ──────────
    for (const ind of inds) {
      const pt  = fromS(ind.s);
      const dir = Math.atan2(pt.y - cy, pt.x - cx);
      const c   = Math.cos(dir);
      const sn  = Math.sin(dir);

      // Badge centre is pushed inward along the direction vector
      const badgeDist = A + 6 + ind.bw / 2;
      const lx = pt.x - c  * badgeDist;
      const ly = pt.y - sn * badgeDist;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Arrow triangle (points outward)
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(dir);
      ctx.beginPath();
      ctx.moveTo( A + 2,  0);
      ctx.lineTo(-A,     -A * 0.65);
      ctx.lineTo(-A,      A * 0.65);
      ctx.closePath();
      ctx.fillStyle   = ind.planet.color;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = ind.planet.color;
      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.restore();

      // Badge background
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(lx - ind.bw / 2, ly - ind.bh / 2, ind.bw, ind.bh, ind.bh / 2);
      } else {
        ctx.rect(lx - ind.bw / 2, ly - ind.bh / 2, ind.bw, ind.bh);
      }
      ctx.fillStyle   = 'rgba(3, 4, 9, 0.85)';
      ctx.strokeStyle = ind.planet.color + '66';
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();

      // Badge label
      ctx.font         = '500 10px Inter, sans-serif';
      ctx.fillStyle    = ind.planet.color;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ind.planet.name, lx, ly);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';

      ctx.restore();
    }
  }


  // Planet info rendering moved to HTML panel below canvas

  // ─── Draw Loop ──────────────────────────────────────────────────────────────
  let lastTimestamp = performance.now();

  function draw(timestamp) {
    const dpr    = window.devicePixelRatio || 1;
    const width  = canvas.width  / dpr;
    const height = canvas.height / dpr;

    const dt = (timestamp - lastTimestamp) / 1000 || 0;
    lastTimestamp = timestamp;

    // Smooth zoom
    const zoomDiff = targetZoom - zoom;
    zoom += zoomDiff * 10 * dt;
    if (Math.abs(zoomDiff) < 0.001) zoom = targetZoom;

    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const hh = pad(now.getUTCHours());
    const mm = pad(now.getUTCMinutes());
    const ss = pad(now.getUTCSeconds());
    const day = pad(now.getUTCDate());
    const month = pad(now.getUTCMonth() + 1);
    const year = now.getUTCFullYear();
    tsEl.textContent = `${hh}:${mm}:${ss} UTC ${day}/${month}/${year}`;

    ctx.clearRect(0, 0, width, height);

    const cx = width  / 2;
    const cy = height / 2;
    const astroTime = new AstroTime(now);

    // Smooth view mode transition
    const targetP  = viewMode !== 'system' ? 1 : 0;
    const modeDiff = targetP - modeProgress;
    modeProgress  += modeDiff * 4 * dt;
    if (Math.abs(modeDiff) < 0.001) modeProgress = targetP;
    const p = modeProgress;

    const maxScreenRadius = Math.min(width, height) / 2 * 0.72;

    const scaleFactor     = maxScreenRadius / Math.pow(30, 0.45);

    // Active planet for transition panning
    const activePlanetDef = viewMode === 'Sun'
      ? { name: 'Sun', body: Body.Sun, color: '#fbbf24', radius: 16 }
      : (PLANETS.find(pl => pl.name === viewMode) || PLANETS.find(pl => pl.name === 'Earth'));

    let activePx = cx;
    let activePy = cy;

    if (viewMode !== 'Sun') {
      const activeHelio      = HelioVector(activePlanetDef.body, astroTime);
      const activeEclVec     = Ecliptic(activeHelio).vec;
      const activeR          = Math.sqrt(activeEclVec.x ** 2 + activeEclVec.y ** 2);
      const activePathRadius = scaleFactor * zoom * Math.pow(activeR, 0.45);
      const activeAngle      = Math.atan2(activeEclVec.y, activeEclVec.x);
      activePx               = cx + Math.cos(activeAngle) * activePathRadius;
      activePy               = cy + Math.sin(activeAngle) * activePathRadius;
    }

    // ── System View ──────────────────────────────────────────────────────────
    if (p < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - p;

      const sysScale = 1 + p * 8;
      const panX     = cx + (activePx - cx) * Math.pow(p, 0.5);
      const panY     = cy + (activePy - cy) * Math.pow(p, 0.5);

      ctx.translate(cx, cy);
      ctx.scale(sysScale, sysScale);
      ctx.translate(-panX, -panY);

      // Sun
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, 2 * Math.PI);
      ctx.fillStyle   = '#fbbf24';
      ctx.shadowBlur  = 40;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.fill();
      ctx.shadowBlur  = 0;

      for (const planet of PLANETS) {
        const helio   = HelioVector(planet.body, astroTime);
        const eclVec  = Ecliptic(helio).vec;
        const rReal   = Math.sqrt(eclVec.x ** 2 + eclVec.y ** 2);
        const pathRad = scaleFactor * zoom * Math.pow(rReal, 0.45);

        ctx.beginPath();
        ctx.arc(cx, cy, pathRad, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth   = 1;
        ctx.stroke();

        const angle = Math.atan2(eclVec.y, eclVec.x);
        const px    = cx + Math.cos(angle) * pathRad;
        const py    = cy + Math.sin(angle) * pathRad;

        planetPositions[planet.name] = { x: px, y: py };

        ctx.beginPath();
        ctx.arc(px, py, planet.radius, 0, 2 * Math.PI);
        ctx.fillStyle   = planet.color;
        ctx.shadowBlur  = Math.max(2, planet.radius);
        ctx.shadowColor = planet.color;
        ctx.fill();
        ctx.shadowBlur  = 0;

        ctx.fillStyle = '#9aa5ce';
        ctx.font      = '400 10px Inter, sans-serif';
        ctx.fillText(planet.name, px + planet.radius + 4, py + 3);


        if (planet.name === 'Earth') {
          const moonGeo = GeoVector(Body.Moon, astroTime, true);
          const moonEcl = Ecliptic(moonGeo).vec;
          const mAngle  = Math.atan2(moonEcl.y, moonEcl.x);
          const mOrbit  = 16;

          ctx.beginPath();
          ctx.arc(px, py, mOrbit, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth   = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px + Math.cos(mAngle) * mOrbit, py + Math.sin(mAngle) * mOrbit, 1.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#CCCCCC';
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // ── Planet Focus View ────────────────────────────────────────────────────
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha = p;

      const viewScale = 0.5 + p * 0.5;
      ctx.translate(cx, cy);
      ctx.scale(viewScale, viewScale);
      ctx.translate(-cx, -cy);

      const focusX = cx;
      const focusY = cy - 60;

      // Large Sun at bottom (only drawn if not focusing the Sun itself)
      let rot = 0;
      if (activePlanetDef.name !== 'Sun') {
        const sunRadius = 400;
        ctx.beginPath();
        ctx.arc(cx, height + sunRadius - 40, sunRadius, 0, 2 * Math.PI);
        ctx.fillStyle   = '#fbbf24';
        ctx.shadowBlur  = 80;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.2)';
        ctx.fill();
        ctx.shadowBlur  = 0;

        const sunHelio = HelioVector(activePlanetDef.body, astroTime);
        const sunAngle = Math.atan2(-sunHelio.y, -sunHelio.x);
        rot            = Math.PI / 2 - sunAngle;
      }

      if (activePlanetDef.name === 'Sun') {
        ctx.beginPath();
        ctx.arc(focusX, focusY, 32, 0, 2 * Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 45;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(focusX, focusY, 24, 0, 2 * Math.PI);
        ctx.fillStyle = activePlanetDef.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(focusX, focusY, 24, Math.PI, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(focusX, focusY, 24, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();
      }

      ctx.fillStyle = '#f0f3fa';
      ctx.font      = '600 11px Outfit, sans-serif';
      ctx.fillText(activePlanetDef.name, focusX + (activePlanetDef.name === 'Sun' ? 42 : 32), focusY + 4);


      if (activePlanetDef.name === 'Sun') {
        const innerPlanets = [
          { name: 'Mercury', dist: 60,  color: '#A8A8A8', size: 3,   speed: 0.24 },
          { name: 'Venus',   dist: 90,  color: '#E0C89C', size: 4,   speed: 0.62 },
          { name: 'Earth',   dist: 125, color: '#4b90ff', size: 4.5, speed: 1.00 },
          { name: 'Mars',    dist: 160, color: '#E27B58', size: 3.5, speed: 1.88 }
        ];

        for (const p of innerPlanets) {
          const angle = (timestamp / 1000 / p.speed * 0.4) % (Math.PI * 2);
          const px = focusX + Math.cos(angle) * p.dist;
          const py = focusY + Math.sin(angle) * p.dist;

          ctx.beginPath();
          ctx.arc(focusX, focusY, p.dist, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, 2 * Math.PI);
          ctx.fillStyle = p.color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px, py, p.size, Math.PI + angle, angle);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fill();

          ctx.fillStyle = '#9aa5ce';
          ctx.font      = '600 9px Inter, sans-serif';
          ctx.fillText(p.name, px + p.size + 4, py + 3);
        }
      } else if (activePlanetDef.name === 'Earth') {
        const { lat, lon } = getLocation();
        const moonGeo   = GeoVector(Body.Moon, astroTime, true);
        const moonEcl   = Ecliptic(moonGeo).vec;
        const moonAngle = Math.atan2(moonEcl.y, moonEcl.x);
        const moonDist  = Math.min(cx * 0.8, 160);
        const mAligned  = moonAngle + rot;
        const mx        = focusX + Math.cos(mAligned) * moonDist;
        const my        = focusY + Math.sin(mAligned) * moonDist;

        ctx.beginPath();
        ctx.arc(focusX, focusY, moonDist, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        // Observer dot
        const utcH       = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
        let localSolar   = (utcH + lon / 15) % 24;
        if (localSolar < 0) localSolar += 24;
        const obsAngle   = -(localSolar - 12) * Math.PI / 12 + Math.PI / 2;
        const obsDist    = 24 * Math.cos(lat * Math.PI / 180);
        const obsX       = focusX + Math.cos(obsAngle) * obsDist;
        const obsY       = focusY + Math.sin(obsAngle) * obsDist;

        ctx.beginPath();
        ctx.arc(obsX, obsY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff4444';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(obsX, obsY, 4, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#cccccc';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mx, my, 8, Math.PI, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.fillStyle = '#f0f3fa';
        ctx.font      = '600 11px Outfit, sans-serif';
        ctx.fillText('Moon', mx + 16, my + 4);

        const moonIllum = Illumination(Body.Moon, astroTime);
        ctx.fillStyle   = '#9aa5ce';
        ctx.font        = '400 10px Inter, sans-serif';
        ctx.fillText(`Illum: ${(moonIllum.phase_fraction * 100).toFixed(1)}%`, mx + 16, my + 16);


        const obs    = new Observer(lat, lon, 0);
        const moonEq = Equator(Body.Moon, astroTime, obs, true, true);
        const moonHz = Horizon(astroTime, obs, moonEq.ra, moonEq.dec, 'normal');
        ctx.fillText(`Local Alt: ${moonHz.altitude.toFixed(1)}°`, mx + 16, my + 28);
        ctx.fillText(`Local Az:  ${moonHz.azimuth.toFixed(1)}°`,  mx + 16, my + 40);

      } else if (activePlanetDef.name === 'Jupiter') {
        const jMoons = JupiterMoons(astroTime);
        const galilean = [
          { name: 'Io',       v: jMoons.io,       size: 5, color: '#e5d05e' },
          { name: 'Europa',   v: jMoons.europa,   size: 4, color: '#d1cfa9' },
          { name: 'Ganymede', v: jMoons.ganymede, size: 6, color: '#9e978e' },
          { name: 'Callisto', v: jMoons.callisto, size: 5, color: '#7a7671' }
        ];

        for (const m of galilean) {
          const mOrbit = Math.sqrt(m.v.x ** 2 + m.v.y ** 2) * 10000;
          const mAngle = Math.atan2(m.v.y, m.v.x);
          const mx     = focusX + Math.cos(mAngle + rot) * mOrbit;
          const my     = focusY + Math.sin(mAngle + rot) * mOrbit;

          ctx.beginPath();
          ctx.arc(focusX, focusY, mOrbit, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mx, my, m.size, 0, 2 * Math.PI);
          ctx.fillStyle = m.color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(mx, my, m.size, Math.PI, 0);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fill();

          ctx.fillStyle = '#f0f3fa';
          ctx.font      = '600 11px Outfit, sans-serif';
          ctx.fillText(m.name, mx + m.size + 4, my + 3);

        }

      } else {
        for (const m of (MOON_DATA[activePlanetDef.name] || [])) {
          const phase    = ((astroTime.tt / m.period) * Math.PI * 2) % (Math.PI * 2);
          const mAligned = phase + rot;
          const mx       = focusX + Math.cos(mAligned) * m.dist;
          const my       = focusY + Math.sin(mAligned) * m.dist;

          ctx.beginPath();
          ctx.arc(focusX, focusY, m.dist, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mx, my, m.size, 0, 2 * Math.PI);
          ctx.fillStyle = m.color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(mx, my, m.size, Math.PI, 0);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.fill();

          ctx.fillStyle = '#f0f3fa';
          ctx.font      = '600 11px Outfit, sans-serif';
          ctx.fillText(m.name, mx + m.size + 4, my + 3);

        }
      }

      if (activePlanetDef.name !== 'Sun') {
        ctx.fillStyle   = '#f6d365';
        ctx.font        = '600 13px Outfit, sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText('Sun', cx, height - 15);
      }

      ctx.fillStyle   = '#565f89';
      ctx.font        = '400 11px Inter, sans-serif';
      ctx.fillText('Click anywhere to return', cx, 36);
      ctx.textAlign   = 'left';


      ctx.restore();
    }

    // Off-screen arrows: only shown in (or near) system view
    if (p < 0.6) {
      drawOffScreenIndicators(width, height, cx, cy, 1 - p / 0.6);
    }

    // Update HTML planet info panel
    if (viewMode !== 'system') {
      const info = PLANET_INFO[activePlanetDef.name];
      if (info) {
        if (infoPanel.getAttribute('data-planet') !== activePlanetDef.name) {
          infoPanel.setAttribute('data-planet', activePlanetDef.name);
          infoName.textContent = activePlanetDef.name;
          infoType.textContent = info.type;
          infoPeriod.textContent = info.period;
          infoMoons.textContent = info.moons;
          infoTagline.textContent = info.tagline;
        }

        let sunDistAU = 0;
        let earthDistAU = 1.0;

        if (activePlanetDef.name === 'Sun') {
          const geo = GeoVector(Body.Sun, astroTime, true);
          earthDistAU = Math.sqrt(geo.x ** 2 + geo.y ** 2 + geo.z ** 2);
          infoDistS.textContent = '0.000 AU (Center)';
        } else {
          const helio = HelioVector(activePlanetDef.body, astroTime);
          sunDistAU = Math.sqrt(helio.x ** 2 + helio.y ** 2 + helio.z ** 2);
          const geo = GeoVector(activePlanetDef.body, astroTime, true);
          earthDistAU = Math.sqrt(geo.x ** 2 + geo.y ** 2 + geo.z ** 2);
          infoDistS.textContent = `${sunDistAU.toFixed(3)} AU`;
        }

        infoDistE.textContent = `${earthDistAU.toFixed(3)} AU`;

        if (p > 0.4) {
          infoPanel.classList.add('active');
        }
      }
    } else {
      infoPanel.classList.remove('active');
      infoPanel.removeAttribute('data-planet');
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
