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
    Sun: {
      type: 'G2V Star',
      period: '25.4 days (rot)',
      moons: '8 Planets',
      taglines: [
        'Contains 99.86% of all mass in the Solar System and powers life on Earth',
        'At its core, the Sun fuses about 600 million tons of hydrogen into helium every second',
        'The Sun is about 4.6 billion years old and has consumed about half of its core hydrogen',
        'One million Earths could fit inside the Sun if it were hollow',
        'The Sun\'s gravity is 28 times stronger than Earth\'s gravity',
        'The light from the Sun takes approximately 8 minutes and 20 seconds to reach Earth'
      ]
    },
    Mercury: {
      type: 'Terrestrial',
      period: '88 Earth days',
      moons: 0,
      taglines: [
        'Days are longer than its years — it rotates just 3× per orbit',
        'It is the smallest planet in the Solar System, only slightly larger than Earth\'s Moon',
        'Despite being closest to the Sun, it is not the hottest planet — Venus is',
        'Temperatures on Mercury range from 430°C during the day to -180°C at night',
        'It has no atmosphere, meaning its surface is heavily cratered from space debris',
        'Mercury is the fastest orbiting planet, traveling at nearly 47 kilometers per second'
      ]
    },
    Venus: {
      type: 'Terrestrial',
      period: '225 Earth days',
      moons: 0,
      taglines: [
        'Surface hot enough to melt lead; spins backwards vs. most planets',
        'Venus is the brightest natural object in Earth\'s night sky after the Moon',
        'Its atmosphere is so thick that pressure on the surface is 90 times that of Earth',
        'Venus is the hottest planet in the Solar System, reaching a constant 475°C',
        'A day on Venus (one rotation) lasts longer than a year (one orbit around the Sun)',
        'Venus is covered by active volcanoes and clouds of toxic sulfuric acid'
      ]
    },
    Earth: {
      type: 'Terrestrial',
      period: '365.25 days',
      moons: 1,
      taglines: [
        'The only known world to harbour life — and you are on it right now',
        'Earth is the only planet in the Solar System not named after a mythological god or goddess',
        'Liquid water covers about 71% of Earth\'s surface',
        'Earth\'s atmosphere shields it from harmful solar radiation and meteoroids',
        'Earth has a powerful magnetic field caused by the molten metal in its outer core',
        'The Earth is not a perfect sphere; its rotation causes it to bulge at the equator'
      ]
    },
    Mars: {
      type: 'Terrestrial',
      period: '687 Earth days',
      moons: 2,
      taglines: [
        'Home to Olympus Mons, the tallest volcano in the solar system',
        'Mars is red because its surface soil contains rust (iron oxide)',
        'Features Valles Marineris, a canyon system 10 times longer than the Grand Canyon',
        'Mars has two small, potato-shaped moons named Phobos and Deimos',
        'Liquid water cannot exist on the surface of Mars due to its low atmospheric pressure',
        'Mars experiences massive dust storms that can cover the entire planet for months'
      ]
    },
    Jupiter: {
      type: 'Gas Giant',
      period: '11.9 Earth years',
      moons: 95,
      taglines: [
        'The Great Red Spot is a storm that has raged for over 350 years',
        'Jupiter is more than twice as massive as all the other planets combined',
        'A day on Jupiter lasts only 10 hours, the fastest rotation of any planet',
        'Jupiter has a magnetic field that is 14 times stronger than Earth\'s',
        'Jupiter acts as a cosmic shield, using its gravity to deflect dangerous comets',
        'It has 95 officially recognized moons, including Ganymede, the largest moon in the Solar System'
      ]
    },
    Saturn: {
      type: 'Gas Giant',
      period: '29.5 Earth years',
      moons: 146,
      taglines: [
        'Its rings span 282,000 km yet are only about 1 km thick',
        'Saturn has the lowest density of all planets; it could float in water',
        'Its moon Titan is the only moon in the solar system with a dense atmosphere and liquid lakes',
        'Saturn\'s rings are mostly made of billions of individual particles of water ice and rock',
        'Saturn has 146 moons, the most of any planet in the Solar System',
        'Winds in Saturn\'s upper atmosphere are extremely fast, reaching 1,800 km/h'
      ]
    },
    Uranus: {
      type: 'Ice Giant',
      period: '84 Earth years',
      moons: 28,
      taglines: [
        'Rotates on its side with a 98° axial tilt — likely from a giant impact',
        'It was the first planet discovered with a telescope (by William Herschel in 1781)',
        'Uranus has 13 known rings, which are very dark and narrow',
        'Uranus is the coldest planet in the Solar System, with temperatures reaching -224°C',
        'Its blue-green color is caused by methane gas absorbing red light in its atmosphere',
        'Most of Uranus\'s mass is a hot, dense fluid of water, ammonia, and methane ice'
      ]
    },
    Neptune: {
      type: 'Ice Giant',
      period: '165 Earth years',
      moons: 16,
      taglines: [
        'Winds reach 2,100 km/h — the fastest recorded in the solar system',
        'It was the first planet located through mathematical calculations rather than telescope search',
        'Neptune is 30 times farther from the Sun than Earth',
        'Neptune\'s moon Triton orbits the planet in the opposite direction of the planet\'s rotation',
        'It has 16 known moons and a faint, clumpy ring system',
        'Neptune is an ice giant, composed of a thick soup of water, ammonia, and methane'
      ]
    }
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  let zoom         = 1;
  let targetZoom   = 1;
  let viewMode     = 'system';
  let modeProgress = 0;
  const planetPositions = {};
  const planetFactIndices = {};

  function cyclePlanetFact(planetName) {
    const info = PLANET_INFO[planetName];
    if (!info || !info.taglines) return;
    if (planetFactIndices[planetName] === undefined) {
      planetFactIndices[planetName] = Math.floor(Math.random() * info.taglines.length);
    } else {
      planetFactIndices[planetName] = (planetFactIndices[planetName] + 1) % info.taglines.length;
    }
    const taglineEl = document.getElementById('info-tagline');
    if (taglineEl && viewMode === planetName) {
      taglineEl.textContent = info.taglines[planetFactIndices[planetName]];
    }
  }

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

  // ─── Input: Pinch Zoom (Mobile) ────────────────────────────────────────────
  let initialPinchDist = 0;
  let initialZoom = 1;

  canvas.addEventListener('touchstart', (e) => {
    if (viewMode !== 'system') return;
    if (e.touches.length === 2) {
      initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialZoom = targetZoom;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (viewMode !== 'system') return;
    if (e.touches.length === 2 && initialPinchDist > 0) {
      e.preventDefault(); // Stop native page zooming/panning
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialPinchDist;
      targetZoom = Math.max(0.1, Math.min(100, initialZoom * ratio));
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialPinchDist = 0;
    }
  }, { passive: true });

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
        cyclePlanetFact('Sun');
        return;
      }

      for (const planet of PLANETS) {
        const pos = planetPositions[planet.name];
        if (pos) {
          const dx = clickX - pos.x;
          const dy = clickY - pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            viewMode = planet.name;
            cyclePlanetFact(planet.name);
            return;
          }
        }
      }
    } else {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const fx = cx;
      const fy = cy - 60;
      const dx = clickX - fx;
      const dy = clickY - fy;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        cyclePlanetFact(viewMode);
      } else {
        viewMode = 'system';
      }
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

      // Large Sun at bottom (only drawn if not focusing the Sun or Earth itself)
      let rot = 0;
      if (activePlanetDef.name !== 'Sun' && activePlanetDef.name !== 'Earth') {
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
      } else if (activePlanetDef.name !== 'Earth') {
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

        // 1. Calculate local solar time to find Sun's screen angle
        const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
        let localSolar = (utcH + lon / 15) % 24;
        if (localSolar < 0) localSolar += 24;

        // Sun Angle on screen (Noon is -90deg, Sunset is 0deg, Midnight is 90deg, Sunrise is 180deg)
        const sunAngle = (localSolar - 12) * Math.PI / 12 - Math.PI / 2;

        // 2. Calculate Moon's space angle relative to Sun in geocentric coordinates
        const sunGeo = GeoVector(Body.Sun, astroTime, true);
        const moonGeo = GeoVector(Body.Moon, astroTime, true);
        const sunAngleSpace = Math.atan2(sunGeo.y, sunGeo.x);
        const moonAngleSpace = Math.atan2(moonGeo.y, moonGeo.x);
        const angleDiff = moonAngleSpace - sunAngleSpace;

        // Moon Angle on screen
        const moonAngle = sunAngle - angleDiff;

        const sunDist = 180;
        const moonDist = 100;
        const mx = focusX + Math.cos(moonAngle) * moonDist;
        const my = focusY + Math.sin(moonAngle) * moonDist;

        // 3. Draw Horizon line
        ctx.beginPath();
        ctx.moveTo(focusX - 160, focusY);
        ctx.lineTo(focusX + 160, focusY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4. Draw Sun Orbit path (dashed)
        ctx.save();
        ctx.beginPath();
        ctx.arc(focusX, focusY, sunDist, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.08)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();

        // 5. Draw Moon Orbit path
        ctx.beginPath();
        ctx.arc(focusX, focusY, moonDist, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // 6. Draw Earth
        ctx.beginPath();
        ctx.arc(focusX, focusY, 24, 0, 2 * Math.PI);
        ctx.fillStyle = activePlanetDef.color;
        ctx.fill();

        // Earth Shadow (facing away from the Sun)
        ctx.beginPath();
        ctx.arc(focusX, focusY, 24, sunAngle + Math.PI / 2, sunAngle - Math.PI / 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(focusX, focusY, 24, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        // 7. Draw Observer (stationary at zenith/top of Earth)
        const obsX = focusX;
        const obsY = focusY - 24;

        // Draw Observer View Cone pointing towards the Moon
        const dx = mx - obsX;
        const dy = my - obsY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const lookAngle = Math.atan2(dy, dx);
        const spread = Math.PI / 12; // 15 degrees spread on each side

        // Linear gradient fading out halfway to the Moon
        const coneGrad = ctx.createLinearGradient(obsX, obsY, obsX + dx * 0.5, obsY + dy * 0.5);
        coneGrad.addColorStop(0, 'rgba(255, 68, 68, 0.45)');
        coneGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');

        ctx.beginPath();
        ctx.moveTo(obsX, obsY);
        ctx.lineTo(obsX + Math.cos(lookAngle - spread) * dist, obsY + Math.sin(lookAngle - spread) * dist);
        ctx.lineTo(obsX + Math.cos(lookAngle + spread) * dist, obsY + Math.sin(lookAngle + spread) * dist);
        ctx.closePath();
        ctx.fillStyle = coneGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(obsX, obsY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obsX, obsY, 4, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        ctx.stroke();

        // 8. Draw Sun
        const sx = focusX + Math.cos(sunAngle) * sunDist;
        const sy = focusY + Math.sin(sunAngle) * sunDist;
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, 2 * Math.PI);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#f0f3fa';
        ctx.font = '600 11px Outfit, sans-serif';
        ctx.fillText('Sun', sx + 20, sy + 4);

        // 9. Draw Moon
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#cccccc';
        ctx.fill();

        // Moon Shadow (facing away from the Sun)
        ctx.beginPath();
        ctx.arc(mx, my, 8, sunAngle + Math.PI / 2, sunAngle - Math.PI / 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#f0f3fa';
        ctx.font      = '600 11px Outfit, sans-serif';
        ctx.fillText('Moon', mx + 14, my - 2);

        const moonIllum = Illumination(Body.Moon, astroTime);
        ctx.fillStyle   = '#9aa5ce';
        ctx.font        = '400 10px Inter, sans-serif';
        ctx.fillText(`${(moonIllum.phase_fraction * 100).toFixed(0)}% Illum`, mx + 14, my + 8);

        const obs    = new Observer(lat, lon, 0);
        const moonEq = Equator(Body.Moon, astroTime, obs, true, true);
        const moonHz = Horizon(astroTime, obs, moonEq.ra, moonEq.dec, 'normal');
        ctx.fillText(`Alt: ${moonHz.altitude.toFixed(0)}°`, mx + 14, my + 18);
        ctx.fillText(`Az:  ${moonHz.azimuth.toFixed(0)}°`,  mx + 14, my + 28);
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

      if (activePlanetDef.name !== 'Sun' && activePlanetDef.name !== 'Earth') {
        ctx.fillStyle   = '#f6d365';
        ctx.font        = '600 13px Outfit, sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText('Sun', cx, height - 15);
      }

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
          
          if (planetFactIndices[activePlanetDef.name] === undefined) {
            planetFactIndices[activePlanetDef.name] = Math.floor(Math.random() * info.taglines.length);
          }
          infoTagline.textContent = info.taglines[planetFactIndices[activePlanetDef.name]];
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
