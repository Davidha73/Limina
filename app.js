import SunCalc from 'https://esm.sh/suncalc@1.9.0';

// ==========================================================================
// Application State
// ==========================================================================
const state = {
    // Current Active Date (modified by slider)
    activeDate: new Date(),
    // Anchor Date (always actual "today")
    today: new Date(),
    
    // Active Location
    location: {
        name: 'London, United Kingdom',
        lat: 51.5074,
        lon: -0.1278
    },
    
    // View Options
    skyView: false, // false = Space View (Celestial), true = Sky View (Horizon relative)
    
    // Calendar Focus Month
    calendarMonth: new Date(),
    
    // Timer for slider auto-reset warning
    sliderTimeout: null,

    // Compass Tracker
    compass: {
        active: false,
        targetAz: 0,
        targetAlt: 0,
        sunAz: 0,
        sunAlt: 0,
        targetMode: 'moon',
        hasVibrated: false
    }
};

// Instantiate Moon Renderer
const renderer = new window.MoonRenderer();

// ==========================================================================
// DOM Elements Cache
// ==========================================================================
const DOM = {
    searchInput: document.getElementById('search-input'),
    clearBtn: document.getElementById('clear-btn'),
    geoBtn: document.getElementById('geo-btn'),
    suggestions: document.getElementById('search-suggestions'),
    
    locationName: document.getElementById('location-name'),
    locationCoords: document.getElementById('location-coords'),
    timezoneInfo: document.getElementById('timezone-info'),
    currentDateStr: document.getElementById('current-date-str'),
    currentTimeStr: document.getElementById('current-time-str'),
    
    viewSpaceBtn: document.getElementById('view-space-btn'),
    viewSkyBtn: document.getElementById('view-sky-btn'),
    moonCanvas: document.getElementById('moon-canvas'),
    
    prevDayBtn: document.getElementById('prev-day-btn'),
    nextDayBtn: document.getElementById('next-day-btn'),
    sliderDate: document.getElementById('slider-date'),
    sliderRelativeDay: document.getElementById('slider-relative-day'),
    timeSlider: document.getElementById('time-slider'),
    resetSliderBtn: document.getElementById('reset-slider-btn'),
    
    phaseIcon: document.getElementById('phase-icon'),
    phaseName: document.getElementById('phase-name'),
    illuminationPercent: document.getElementById('illumination-percent'),
    illuminationBar: document.getElementById('illumination-bar'),
    moonAge: document.getElementById('moon-age'),
    ageBar: document.getElementById('age-bar'),
    
    riseTime: document.getElementById('rise-time'),
    setTime: document.getElementById('set-time'),
    altitudeVal: document.getElementById('altitude-val'),
    azimuthVal: document.getElementById('azimuth-val'),
    distanceVal: document.getElementById('distance-val'),
    distanceSub: document.getElementById('distance-sub'),
    
    solarProgressTitle: document.getElementById('solar-progress-title'),
    solarProgressSub: document.getElementById('solar-progress-sub'),
    solarBar: document.getElementById('solar-bar'),
    sunriseTime: document.getElementById('sunrise-time'),
    sunsetTime: document.getElementById('sunset-time'),
    sunAltitudeVal: document.getElementById('sun-altitude-val'),
    sunAzimuthVal: document.getElementById('sun-azimuth-val'),
    
    calendarMonthName: document.getElementById('calendar-month-name'),
    prevMonthBtn: document.getElementById('prev-month-btn'),
    todayMonthBtn: document.getElementById('today-month-btn'),
    nextMonthBtn: document.getElementById('next-month-btn'),
    calendarDays: document.getElementById('calendar-days'),
    
    eventsGrid: document.getElementById('events-grid')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadSavedLocation();
    setupEventListeners();
    updateClock();
    setInterval(updateClock, 60000); // Update clock every minute
    
    // Initial Render
    triggerUpdate();
    
    // Redraw when the high-res moon texture completes loading
    window.addEventListener('moonTextureLoaded', () => {
        renderActiveMoon();
    });
});

function setupEventListeners() {
    // Search input autocomplete setup (Debounced)
    let debounceTimer;
    DOM.searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = DOM.searchInput.value.trim();
        
        if (query.length > 0) {
            DOM.clearBtn.classList.remove('hidden');
        } else {
            DOM.clearBtn.classList.add('hidden');
        }
        
        if (query.length < 3) {
            DOM.suggestions.classList.add('hidden');
            return;
        }
        
        debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, 400);
    });

    DOM.clearBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        DOM.clearBtn.classList.add('hidden');
        DOM.suggestions.classList.add('hidden');
        DOM.searchInput.focus();
    });

    // Close suggestions dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!DOM.searchInput.contains(e.target) && !DOM.suggestions.contains(e.target)) {
            DOM.suggestions.classList.add('hidden');
        }
    });

    // Geolocation trigger
    DOM.geoBtn.addEventListener('click', handleGeolocation);

    // View toggles
    DOM.viewSpaceBtn.addEventListener('click', () => {
        state.skyView = false;
        DOM.viewSpaceBtn.classList.add('active');
        DOM.viewSkyBtn.classList.remove('active');
        updateAstroCalculations();
    });

    DOM.viewSkyBtn.addEventListener('click', () => {
        state.skyView = true;
        DOM.viewSkyBtn.classList.add('active');
        DOM.viewSpaceBtn.classList.remove('active');
        updateAstroCalculations();
    });

    // Time slider scrubber
    DOM.timeSlider.addEventListener('input', () => {
        const offset = parseInt(DOM.timeSlider.value, 10);
        setDateOffset(offset);
    });

    DOM.prevDayBtn.addEventListener('click', () => {
        let val = parseInt(DOM.timeSlider.value, 10);
        if (val > -15) {
            val--;
            DOM.timeSlider.value = val;
            setDateOffset(val);
        }
    });

    DOM.nextDayBtn.addEventListener('click', () => {
        let val = parseInt(DOM.timeSlider.value, 10);
        if (val < 15) {
            val++;
            DOM.timeSlider.value = val;
            setDateOffset(val);
        }
    });

    DOM.resetSliderBtn.addEventListener('click', () => {
        DOM.timeSlider.value = 0;
        setDateOffset(0);
    });

    // Calendar month controls
    DOM.prevMonthBtn.addEventListener('click', () => {
        state.calendarMonth.setMonth(state.calendarMonth.getMonth() - 1);
        renderCalendar();
    });

    DOM.nextMonthBtn.addEventListener('click', () => {
        state.calendarMonth.setMonth(state.calendarMonth.getMonth() + 1);
        renderCalendar();
    });

    DOM.todayMonthBtn.addEventListener('click', () => {
        state.calendarMonth = new Date(state.today);
        renderCalendar();
    });

    // Card explanations click toggle (accordion effect)
    const toggleCard = (e) => {
        const card = e.target.closest('.detail-card, .stat-card');
        if (card) {
            const allCards = document.querySelectorAll('.detail-card, .stat-card');
            allCards.forEach(c => {
                if (c !== card) c.classList.remove('expanded');
            });
            card.classList.toggle('expanded');
        }
    };
    
    const detailsPanel = document.querySelector('.details-panel');
    if (detailsPanel) detailsPanel.addEventListener('click', toggleCard);
    
    const solarRow = document.querySelector('.solar-dashboard-row');
    if (solarRow) solarRow.addEventListener('click', toggleCard);

    // Compass Locator Overlay functionality
    const compassOverlay = document.getElementById('compass-overlay');
    const findSkyBtn = document.getElementById('find-sky-btn');
    const closeCompassBtn = document.getElementById('close-compass-btn');
    const compassDial = document.getElementById('compass-dial');
    const moonTargetAnchor = document.getElementById('moon-target-anchor');
    const sunTargetAnchor = document.getElementById('sun-target-anchor');
    const moonIndicator = document.querySelector('.moon-target-indicator');
    const sunIndicator = document.querySelector('.sun-target-indicator');
    const sunWarningEl = document.querySelector('.sun-warning');
    const currentTiltEl = document.getElementById('current-tilt');
    const targetAltitudeEl = document.getElementById('target-altitude');
    const altitudeCurrentBar = document.getElementById('altitude-current-bar');
    const altitudeTargetBand = document.getElementById('altitude-target-band');
    const compassStatus = document.getElementById('compass-status');

    let orientationHandlerBound = false;

    function handleOrientation(e) {
        if (!state.compass.active) return;

        // Determine active target based on mode
        const targetAz = state.compass.targetMode === 'sun' ? state.compass.sunAz : state.compass.targetAz;
        const targetAlt = state.compass.targetMode === 'sun' ? state.compass.sunAlt : state.compass.targetAlt;

        // 1. Heading (compass direction)
        let heading = null;
        if (e.webkitCompassHeading !== undefined) {
            heading = e.webkitCompassHeading;
        } else if (e.alpha !== null) {
            heading = 360 - e.alpha;
        }

        // 2. Pitch/Tilt (altitude direction)
        let tilt = e.beta !== null ? e.beta : 0;
        // Keep tilt positive for front-facing screen tilts (0 to 90 deg)
        tilt = Math.max(0, Math.min(90, tilt));

        if (heading === null) {
            compassStatus.textContent = "Waiting for compass alignment...";
            return;
        }

        // 3. Update Compass Dial Rotation
        // Rotate the dial by -heading so N always points North
        compassDial.style.transform = `rotate(${-heading}deg)`;

        // 4. Update Target Moon and Sun Angles on the dial
        moonTargetAnchor.style.transform = `rotate(${state.compass.targetAz}deg)`;
        if (sunTargetAnchor) {
            sunTargetAnchor.style.transform = `rotate(${state.compass.sunAz}deg)`;
        }

        // Toggle below-horizon styling if they are set
        if (moonIndicator) {
            if (state.compass.targetAlt < 0) {
                moonIndicator.classList.add('below-horizon');
            } else {
                moonIndicator.classList.remove('below-horizon');
            }
        }
        if (sunIndicator) {
            if (state.compass.sunAlt < 0) {
                sunIndicator.classList.add('below-horizon');
            } else {
                sunIndicator.classList.remove('below-horizon');
            }
        }

        // Show Sun warning dynamically if pointing close to the Sun (within 30 deg) and the Sun is above the horizon
        if (sunWarningEl) {
            let diffToSun = state.compass.sunAz - heading;
            while (diffToSun > 180) diffToSun -= 360;
            while (diffToSun < -180) diffToSun += 360;

            if (state.compass.sunAlt > 0 && Math.abs(diffToSun) < 30) {
                sunWarningEl.classList.remove('hidden');
            } else {
                sunWarningEl.classList.add('hidden');
            }
        }

        // 5. Update Altitude Gauge
        currentTiltEl.textContent = `${Math.round(tilt)}°`;
        targetAltitudeEl.textContent = `${Math.round(targetAlt)}°`;

        const tiltPct = (tilt / 90) * 100;
        altitudeCurrentBar.style.width = `${tiltPct}%`;

        const targetAltPct = (targetAlt / 90) * 100;
        altitudeTargetBand.style.left = `${Math.max(0, targetAltPct - 5)}%`;
        altitudeTargetBand.style.width = '10%';

        // 6. Calculate directional differences
        let diffAz = targetAz - heading;
        while (diffAz > 180) diffAz -= 360;
        while (diffAz < -180) diffAz += 360;

        const diffAlt = targetAlt - tilt;

        // 7. Render status instructions
        if (Math.abs(diffAz) < 6) {
            // Azimuth is aligned! Now align altitude
            if (Math.abs(diffAlt) < 6) {
                compassStatus.textContent = "Aligned! Look Up!";
                compassStatus.className = "compass-status aligned";
                if (!state.compass.hasVibrated) {
                    if (navigator.vibrate) navigator.vibrate(120);
                    state.compass.hasVibrated = true;
                }
            } else {
                compassStatus.textContent = diffAlt > 0 ? "Tilt Phone Up ⬆️" : "Tilt Phone Down ⬇️";
                compassStatus.className = "compass-status";
                state.compass.hasVibrated = false;
            }
        } else {
            // Guide azimuth alignment
            compassStatus.textContent = diffAz > 0 ? "Turn Right ➡️" : "Turn Left ⬅️";
            compassStatus.className = "compass-status";
            state.compass.hasVibrated = false;
        }
    }

    function startCompass(mode = 'moon') {
        state.compass.targetMode = mode;
        state.compass.active = true;
        state.compass.hasVibrated = false;
        compassOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // prevent scrolling behind

        // Initialize target labels and headers
        const compassTitle = compassOverlay.querySelector('h3');
        if (compassTitle) {
            compassTitle.textContent = mode === 'sun' ? "Locate the Sun" : "Locate the Moon";
        }
        
        const targetAlt = mode === 'sun' ? state.compass.sunAlt : state.compass.targetAlt;
        targetAltitudeEl.textContent = `${Math.round(targetAlt)}°`;

        if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
            // iOS Safari requires permission
            window.DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        activateCompassListeners();
                    } else {
                        compassStatus.textContent = "Permission denied. Enable motion sensors.";
                    }
                })
                .catch(err => {
                    console.error("iOS permission error", err);
                    compassStatus.textContent = "Error initializing sensors.";
                });
        } else {
            // Android/Standard browsers
            activateCompassListeners();
        }
    }

    function activateCompassListeners() {
        if (!orientationHandlerBound) {
            // Use deviceorientationabsolute if available (essential for Android absolute North)
            if ('ondeviceorientationabsolute' in window) {
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            } else {
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
            orientationHandlerBound = true;
        }
    }

    function stopCompass() {
        state.compass.active = false;
        compassOverlay.classList.add('hidden');
        document.body.style.overflow = ''; // restore scrolling

        if (orientationHandlerBound) {
            window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
            window.removeEventListener('deviceorientation', handleOrientation, true);
            orientationHandlerBound = false;
        }
    }

    const findSkySunBtn = document.getElementById('find-sky-sun-btn');
    if (findSkyBtn) findSkyBtn.addEventListener('click', () => startCompass('moon'));
    if (findSkySunBtn) findSkySunBtn.addEventListener('click', () => startCompass('sun'));
    if (closeCompassBtn) closeCompassBtn.addEventListener('click', stopCompass);
    if (compassOverlay) {
        // Also close if clicking outside modal
        compassOverlay.addEventListener('click', (e) => {
            if (e.target === compassOverlay) stopCompass();
        });
    }
}

// ==========================================================================
// Time & Navigation Logic
// ==========================================================================
function updateClock() {
    state.today = new Date();
    
    // Formatting for the location banner date
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    
    DOM.currentDateStr.textContent = state.today.toLocaleDateString(undefined, optionsDate);
    DOM.currentTimeStr.textContent = state.today.toLocaleTimeString(undefined, optionsTime);
}

function setDateOffset(daysOffset) {
    const newDate = new Date(state.today);
    newDate.setDate(state.today.getDate() + daysOffset);
    state.activeDate = newDate;

    // Toggle reset button
    if (daysOffset === 0) {
        DOM.resetSliderBtn.classList.add('hidden');
    } else {
        DOM.resetSliderBtn.classList.remove('hidden');
    }

    // Update central labels
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    DOM.sliderDate.textContent = state.activeDate.toLocaleDateString(undefined, options);

    // Relative offset text
    if (daysOffset === 0) {
        DOM.sliderRelativeDay.textContent = '(Today)';
    } else if (daysOffset === 1) {
        DOM.sliderRelativeDay.textContent = '(Tomorrow)';
    } else if (daysOffset === -1) {
        DOM.sliderRelativeDay.textContent = '(Yesterday)';
    } else if (daysOffset > 1) {
        DOM.sliderRelativeDay.textContent = `(In ${daysOffset} days)`;
    } else {
        DOM.sliderRelativeDay.textContent = `(${Math.abs(daysOffset)} days ago)`;
    }

    // Refresh calculations and redrawing
    updateAstroCalculations();
    highlightActiveCalendarCell();
}

function loadSavedLocation() {
    const saved = localStorage.getItem('lumina_location');
    if (saved) {
        try {
            state.location = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse cached location', e);
        }
    }
    displayActiveLocationInfo();
}

function displayActiveLocationInfo() {
    DOM.locationName.textContent = state.location.name;
    
    // Latitude/Longitude Formatting
    const lat = Math.abs(state.location.lat).toFixed(4);
    const latDir = state.location.lat >= 0 ? 'N' : 'S';
    const lon = Math.abs(state.location.lon).toFixed(4);
    const lonDir = state.location.lon >= 0 ? 'E' : 'W';
    DOM.locationCoords.innerHTML = `<i class="fa-solid fa-compass"></i> ${lat}° ${latDir}, ${lon}° ${lonDir}`;
    
    // Timezone string
    const offsetMin = new Date().getTimezoneOffset();
    const offsetHr = Math.abs(Math.floor(offsetMin / 60));
    const offsetMinRemain = Math.abs(offsetMin % 60);
    const offsetSign = offsetMin <= 0 ? '+' : '-';
    const tzString = `GMT${offsetSign}${String(offsetHr).padStart(2, '0')}:${String(offsetMinRemain).padStart(2, '0')}`;
    DOM.timezoneInfo.innerHTML = `<i class="fa-solid fa-clock"></i> Local Time (${tzString})`;
}

function triggerUpdate() {
    displayActiveLocationInfo();
    setDateOffset(0);
    renderCalendar();
    renderUpcomingEvents();
}

// ==========================================================================
// Geocoding & Nominatim API
// ==========================================================================
async function fetchSuggestions(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        const results = await response.json();
        renderSuggestions(results);
    } catch (err) {
        console.error('Geocoding error:', err);
    }
}

function renderSuggestions(results) {
    DOM.suggestions.innerHTML = '';
    
    if (results.length === 0) {
        DOM.suggestions.innerHTML = '<div class="suggestion-item">No locations found</div>';
        DOM.suggestions.classList.remove('hidden');
        return;
    }
    
    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        // Build readable description
        const address = item.address;
        const name = item.display_name.split(',')[0];
        const parts = [];
        if (address.city || address.town || address.village) {
            parts.push(address.city || address.town || address.village);
        }
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);
        
        const desc = parts.length > 0 ? parts.join(', ') : item.display_name;
        div.textContent = `${name} (${desc})`;
        
        div.addEventListener('click', () => {
            selectLocation({
                name: `${name}, ${address.country || ''}`,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            });
        });
        
        DOM.suggestions.appendChild(div);
    });
    
    DOM.suggestions.classList.remove('hidden');
}

function selectLocation(loc) {
    state.location = loc;
    localStorage.setItem('lumina_location', JSON.stringify(loc));
    DOM.searchInput.value = '';
    DOM.clearBtn.classList.add('hidden');
    DOM.suggestions.classList.add('hidden');
    
    triggerUpdate();
}

async function handleGeolocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    
    DOM.geoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        
        // Reverse Geocode
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const address = data.address;
                const city = address.city || address.town || address.village || address.suburb;
                const country = address.country;
                if (city && country) {
                    name = `${city}, ${country}`;
                } else {
                    name = data.display_name.split(',')[0] + ', ' + (country || '');
                }
            }
        } catch (e) {
            console.error('Reverse geocode failed', e);
        }
        
        DOM.geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
        selectLocation({ name, lat, lon });
    }, (err) => {
        DOM.geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
        alert(`Geolocation failed: ${err.message}. Defaulting to London.`);
    }, { timeout: 8000 });
}

// ==========================================================================
// Astronomical Calculations
// ==========================================================================
function updateAstroCalculations() {
    const date = state.activeDate;
    const lat = state.location.lat;
    const lon = state.location.lon;
    
    // Moon Illumination (remains SunCalc for visual compatibility with renderer)
    const illum = SunCalc.getMoonIllumination(date);
    const phase = illum.phase; // 0.0 to 1.0
    const fraction = illum.fraction; // 0.0 to 1.0
    const angle = illum.angle; // radians
    const parallacticAngle = SunCalc.getMoonPosition(date, lat, lon).parallacticAngle; // needed for skyView orientation rotation
    
    // Moon position and distance using high-precision Astronomy Engine
    const Astronomy = window.Astronomy;
    const obs = new Astronomy.Observer(lat, lon, 0);
    const astroTime = new Astronomy.AstroTime(date);
    
    const moonEq = Astronomy.Equator(Astronomy.Body.Moon, astroTime, obs, true, true);
    const moonHz = Astronomy.Horizon(astroTime, obs, moonEq.ra, moonEq.dec, 'normal');
    const moonGeo = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, true);
    
    const altitude = moonHz.altitude; // degrees
    const azimuth = moonHz.azimuth; // degrees (compass bearing 0-360)
    const distance = Math.sqrt(moonGeo.x ** 2 + moonGeo.y ** 2 + moonGeo.z ** 2) * 149597870.7; // AU to km
    
    state.compass.targetAz = azimuth;
    state.compass.targetAlt = altitude;

    // Update active render options
    state.activeMoonOptions = {
        skyView: state.skyView,
        angle: angle,
        parallacticAngle: parallacticAngle
    };
    state.activePhase = phase;
    
    renderActiveMoon();
    
    // Moon rise/set
    const times = SunCalc.getMoonTimes(date, lat, lon);
    
    // Sun position using Astronomy Engine
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, astroTime, obs, true, true);
    const sunHz = Astronomy.Horizon(astroTime, obs, sunEq.ra, sunEq.dec, 'normal');
    
    const sunAltitude = sunHz.altitude;
    const sunAzimuth = sunHz.azimuth;
    
    state.compass.sunAz = sunAzimuth;
    state.compass.sunAlt = sunAltitude;
    
    // Sun times
    const sunTimes = SunCalc.getTimes(date, lat, lon);
    
    // Update Details Grid
    updateDetailsUI({
        phase,
        fraction,
        altitude,
        azimuth,
        distance,
        times,
        sunAltitude,
        sunAzimuth,
        sunTimes
    });
}

function renderActiveMoon() {
    if (state.activePhase !== undefined) {
        renderer.draw(DOM.moonCanvas, state.activePhase, state.activeMoonOptions);
    }
}

function updateDetailsUI(data) {
    const fractionPct = Math.round(data.fraction * 100);
    DOM.illuminationPercent.textContent = `${fractionPct}%`;
    DOM.illuminationBar.style.width = `${fractionPct}%`;
    
    // Set Phase Name and Icon
    const phaseInfo = getPhaseDetails(data.phase);
    DOM.phaseName.textContent = phaseInfo.name;
    DOM.phaseIcon.className = `fa-solid ${phaseInfo.iconClass}`;
    
    // Age of Moon
    const ageDays = data.phase * 29.53059;
    DOM.moonAge.textContent = `${ageDays.toFixed(1)} days`;
    DOM.ageBar.style.width = `${(ageDays / 29.53059 * 100).toFixed(1)}%`;
    
    // Rise & Set Format
    const formatTime = (dateVal) => {
        if (!dateVal || isNaN(dateVal.getTime())) return '--:--';
        return dateVal.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    
    // If moon is always up/down
    if (data.times.alwaysUp) {
        DOM.riseTime.textContent = 'Always Up';
        DOM.setTime.textContent = '---';
    } else if (data.times.alwaysDown) {
        DOM.riseTime.textContent = 'Always Down';
        DOM.setTime.textContent = '---';
    } else {
        DOM.riseTime.textContent = formatTime(data.times.rise);
        DOM.setTime.textContent = formatTime(data.times.set);
    }
    
    // Altitude formatting
    if (data.altitude < 0) {
        DOM.altitudeVal.innerHTML = `${data.altitude.toFixed(1)}° <span class="stat-sub">(Horizon)</span>`;
        DOM.altitudeVal.classList.add('text-muted');
    } else {
        DOM.altitudeVal.textContent = `${data.altitude.toFixed(1)}°`;
        DOM.altitudeVal.classList.remove('text-muted');
    }
    
    // Azimuth compass string
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    let idx = Math.round(data.azimuth / 22.5) % 16;
    let compassDir = directions[idx];
    DOM.azimuthVal.textContent = `${Math.round(data.azimuth)}° ${compassDir}`;
    
    // Distance Formatting
    DOM.distanceVal.textContent = `${Math.round(data.distance).toLocaleString()} km`;
    if (data.distance < 363000) {
        DOM.distanceSub.textContent = 'Apogee / Aphelion: Supermoon (Perigee)';
        DOM.distanceSub.className = 'stat-sub text-gold';
    } else if (data.distance > 404000) {
        DOM.distanceSub.textContent = 'Micromoon (Apogee)';
        DOM.distanceSub.className = 'stat-sub';
    } else {
        DOM.distanceSub.textContent = 'Typical distance';
        DOM.distanceSub.className = 'stat-sub';
    }
    
    // ==========================================================================
    // Update Solar UI Elements
    // ==========================================================================
    DOM.sunriseTime.textContent = formatTime(data.sunTimes.sunrise);
    DOM.sunsetTime.textContent = formatTime(data.sunTimes.sunset);
    
    // Sun Altitude formatting
    if (data.sunAltitude < 0) {
        DOM.sunAltitudeVal.innerHTML = `${data.sunAltitude.toFixed(1)}° <span class="stat-sub">(Night)</span>`;
        DOM.sunAltitudeVal.classList.add('text-muted');
    } else {
        DOM.sunAltitudeVal.textContent = `${data.sunAltitude.toFixed(1)}°`;
        DOM.sunAltitudeVal.classList.remove('text-muted');
    }
    
    // Sun Azimuth compass string
    idx = Math.round(data.sunAzimuth / 22.5) % 16;
    compassDir = directions[idx];
    DOM.sunAzimuthVal.textContent = `${Math.round(data.sunAzimuth)}° ${compassDir}`;
    
    // Solar Day Progress Calculation
    const sunriseMs = data.sunTimes.sunrise.getTime();
    const sunsetMs = data.sunTimes.sunset.getTime();
    const totalDaylightMs = sunsetMs - sunriseMs;
    
    const sunHours = Math.floor(totalDaylightMs / 3600000);
    const sunMins = Math.floor((totalDaylightMs % 3600000) / 60000);
    DOM.solarProgressTitle.textContent = `${sunHours}h ${sunMins}m of Daylight`;
    
    const nowMs = state.activeDate.getTime();
    
    if (nowMs < sunriseMs) {
        // Before sunrise
        const diffMs = sunriseMs - nowMs;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        DOM.solarProgressSub.textContent = `Sunrise in ${diffHrs}h ${diffMins}m`;
        DOM.solarBar.style.width = '0%';
    } else if (nowMs > sunsetMs) {
        // After sunset
        const nextSunrise = new Date(data.sunTimes.sunrise);
        nextSunrise.setDate(nextSunrise.getDate() + 1); // rough guess for tomorrow morning
        const diffMs = nextSunrise.getTime() - nowMs;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        DOM.solarProgressSub.textContent = `Nighttime • Sunrise in ${diffHrs > 0 ? diffHrs + 'h ' : ''}${diffMins}m`;
        DOM.solarBar.style.width = '100%';
    } else {
        // During daytime
        const elapsedMs = nowMs - sunriseMs;
        const pct = (elapsedMs / totalDaylightMs) * 100;
        DOM.solarBar.style.width = `${pct.toFixed(1)}%`;
        
        const remainingMs = sunsetMs - nowMs;
        const remHrs = Math.floor(remainingMs / 3600000);
        const remMins = Math.floor((remainingMs % 3600000) / 60000);
        DOM.solarProgressSub.textContent = `Sunset in ${remHrs}h ${remMins}m`;
    }
}

function getPhaseDetails(phase) {
    // Dividers for 8 astronomical phases
    if (phase < 0.015 || phase > 0.985) return { name: 'New Moon', iconClass: 'fa-moon-new-moon-custom' }; // we style standard icon
    if (phase < 0.235) return { name: 'Waxing Crescent', iconClass: 'fa-moon' };
    if (phase < 0.265) return { name: 'First Quarter', iconClass: 'fa-circle-half-stroke' };
    if (phase < 0.485) return { name: 'Waxing Gibbous', iconClass: 'fa-moon' };
    if (phase < 0.515) return { name: 'Full Moon', iconClass: 'fa-circle' };
    if (phase < 0.735) return { name: 'Waning Gibbous', iconClass: 'fa-moon' };
    if (phase < 0.765) return { name: 'Last Quarter', iconClass: 'fa-circle-half-stroke fa-flip-horizontal' };
    return { name: 'Waning Crescent', iconClass: 'fa-moon' };
}

// Custom New moon styled color via custom class
// We handle specific icon stylings in style.css or let standard layouts draw.

// ==========================================================================
// Monthly Calendar Builder
// ==========================================================================
function renderCalendar() {
    const year = state.calendarMonth.getFullYear();
    const month = state.calendarMonth.getMonth();
    
    // Set Header Month Year Name
    const options = { month: 'long', year: 'numeric' };
    DOM.calendarMonthName.textContent = state.calendarMonth.toLocaleDateString(undefined, options);
    
    // Clear Days Grid
    DOM.calendarDays.innerHTML = '';
    
    // First day of month and total days
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // 1. Draw leading empty placeholder cells
    for (let i = 0; i < startOffset; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell empty-cell';
        DOM.calendarDays.appendChild(cell);
    }
    
    // 2. Draw active calendar day cells
    for (let d = 1; d <= totalDays; d++) {
        const cellDate = new Date(year, month, d);
        
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        cell.dataset.dateString = cellDate.toDateString();
        
        // Day number
        const numberSpan = document.createElement('span');
        numberSpan.className = 'day-number';
        numberSpan.textContent = d;
        cell.appendChild(numberSpan);
        
        // Canvas for mini moon representation
        const miniCanvas = document.createElement('canvas');
        miniCanvas.className = 'mini-moon-canvas';
        miniCanvas.width = 96;
        miniCanvas.height = 96;
        cell.appendChild(miniCanvas);
        
        // Draw mini moon
        // Phase is computed at noon local time for consistency
        const noonDate = new Date(year, month, d, 12, 0, 0);
        const cellIllum = SunCalc.getMoonIllumination(noonDate);
        renderer.drawMini(miniCanvas, cellIllum.phase);
        
        // Active click selection handler
        cell.addEventListener('click', () => {
            const timeDiff = cellDate.getTime() - state.today.getTime();
            const daysDiff = Math.round(timeDiff / (24 * 60 * 60 * 1000));
            
            // Limit navigation to the slider's -15 / +15 range for visual clarity
            if (daysDiff >= -15 && daysDiff <= 15) {
                DOM.timeSlider.value = daysDiff;
                setDateOffset(daysDiff);
            } else {
                // If clicked outside slider range, still jump to the date
                state.activeDate = cellDate;
                DOM.timeSlider.value = 0; // reset slider to 0 to prevent mismatch
                DOM.resetSliderBtn.classList.remove('hidden');
                
                // Update central labels
                const opt = { month: 'long', day: 'numeric', year: 'numeric' };
                DOM.sliderDate.textContent = state.activeDate.toLocaleDateString(undefined, opt);
                DOM.sliderRelativeDay.textContent = `(Selected: ${cellDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})})`;
                
                updateAstroCalculations();
                highlightActiveCalendarCell();
            }
        });
        
        DOM.calendarDays.appendChild(cell);
    }
    
    // Highlight cells representing Today and the currently Active/Selected day
    highlightActiveCalendarCell();
}

function highlightActiveCalendarCell() {
    const todayStr = state.today.toDateString();
    const activeStr = state.activeDate.toDateString();
    
    const cells = DOM.calendarDays.querySelectorAll('.calendar-day-cell:not(.empty-cell)');
    cells.forEach(cell => {
        cell.classList.remove('active-cell');
        cell.classList.remove('today-cell');
        
        const cellDateStr = cell.dataset.dateString;
        if (cellDateStr === activeStr) {
            cell.classList.add('active-cell');
        }
        if (cellDateStr === todayStr) {
            cell.classList.add('today-cell');
        }
    });
}

// ==========================================================================
// Lunar Events Phase Crossings Calculator (Forward Solver)
// ==========================================================================
function renderUpcomingEvents() {
    DOM.eventsGrid.innerHTML = '';
    
    const phases = [
        { name: 'New Moon', target: 0.0, icon: 'new' },
        { name: 'First Quarter', target: 0.25, icon: 'first-quarter' },
        { name: 'Full Moon', target: 0.5, icon: 'full' },
        { name: 'Last Quarter', target: 0.75, icon: 'last-quarter' }
    ];
    
    // Start search from today
    let t = new Date(state.today.getTime());
    const maxTime = t.getTime() + 32 * 24 * 60 * 60 * 1000;
    
    let prevIllum = SunCalc.getMoonIllumination(t);
    const step = 60 * 60 * 1000; // 1 hour steps
    
    const foundEvents = [];
    
    while (t.getTime() < maxTime && foundEvents.length < 4) {
        t.setTime(t.getTime() + step);
        const currIllum = SunCalc.getMoonIllumination(t);
        
        const p0 = prevIllum.phase;
        const p1 = currIllum.phase;
        
        phases.forEach(phase => {
            // Check if already found
            if (foundEvents.some(e => e.name === phase.name)) return;
            
            let crossed = false;
            if (phase.target === 0.0) {
                // Crossing wrap-around (1.0 -> 0.0)
                crossed = (p0 > p1 && p0 > 0.95 && p1 < 0.05);
            } else {
                crossed = (p0 <= phase.target && p1 >= phase.target) || 
                          (p0 >= phase.target && p1 <= phase.target && Math.abs(p0 - p1) < 0.2);
            }
            
            if (crossed) {
                let refinedTime;
                if (phase.target === 0.0) {
                    const d0 = 1 - p0;
                    const d1 = p1;
                    const frac = d0 / (d0 + d1);
                    refinedTime = new Date(t.getTime() - step + step * frac);
                } else {
                    const frac = (phase.target - p0) / (p1 - p0);
                    refinedTime = new Date(t.getTime() - step + step * frac);
                }
                
                foundEvents.push({
                    name: phase.name,
                    target: phase.target,
                    date: refinedTime
                });
            }
        });
        
        prevIllum = currIllum;
    }
    
    // Sort events chronological
    foundEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Draw events cards
    foundEvents.forEach(evt => {
        const item = document.createElement('div');
        item.className = 'event-item';
        
        const canvas = document.createElement('canvas');
        canvas.className = 'event-moon-canvas';
        canvas.width = 88;
        canvas.height = 88;
        item.appendChild(canvas);
        
        // Draw mini-moon representing event
        renderer.drawMini(canvas, evt.target);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'event-details';
        
        const h4 = document.createElement('h4');
        h4.textContent = evt.name;
        detailsDiv.appendChild(h4);
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'event-date';
        dateSpan.textContent = evt.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + 
            ' at ' + evt.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        detailsDiv.appendChild(dateSpan);
        
        // Calculate countdown
        const timeDiff = evt.date.getTime() - state.today.getTime();
        const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        const hrs = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        const countdownSpan = document.createElement('span');
        countdownSpan.className = 'event-countdown';
        if (days === 0 && hrs === 0) {
            countdownSpan.textContent = 'Happening Now';
        } else if (days === 0) {
            countdownSpan.textContent = `In ${hrs}h`;
        } else {
            countdownSpan.textContent = `In ${days}d ${hrs}h`;
        }
        detailsDiv.appendChild(countdownSpan);
        
        item.appendChild(detailsDiv);
        
        // Click to jump main view to event date!
        item.addEventListener('click', () => {
            const timeDiffSec = evt.date.getTime() - state.today.getTime();
            const daysDiff = Math.round(timeDiffSec / (24 * 60 * 60 * 1000));
            
            if (daysDiff >= -15 && daysDiff <= 15) {
                DOM.timeSlider.value = daysDiff;
                setDateOffset(daysDiff);
            } else {
                state.activeDate = evt.date;
                DOM.timeSlider.value = 0;
                DOM.resetSliderBtn.classList.remove('hidden');
                
                const opt = { month: 'long', day: 'numeric', year: 'numeric' };
                DOM.sliderDate.textContent = state.activeDate.toLocaleDateString(undefined, opt);
                DOM.sliderRelativeDay.textContent = `(Selected crossing)`;
                
                updateAstroCalculations();
                highlightActiveCalendarCell();
            }
        });
        
        DOM.eventsGrid.appendChild(item);
    });
}
