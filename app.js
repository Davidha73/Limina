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
        hasVibrated: false,
        useCamera: localStorage.getItem('lumina_compass_camera') !== 'false',
        stream: null
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
    
    // Settings Drawer
    settingsBtn: document.getElementById('settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsDrawer: document.getElementById('settings-drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    
    // Preferences Toggles
    prefMasterAlerts: document.getElementById('pref-master-alerts'),
    prefCatEclipses: document.getElementById('pref-cat-eclipses'),
    prefCatMeteors: document.getElementById('pref-cat-meteors'),
    prefCatMoons: document.getElementById('pref-cat-moons'),
    
    // Timeline Section
    timelineContainer: document.getElementById('timeline-container'),
    tabAll: document.getElementById('tab-all'),
    tabEclipses: document.getElementById('tab-eclipses'),
    tabMeteors: document.getElementById('tab-meteors'),
    tabMoons: document.getElementById('tab-moons')
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadSavedLocation();
    loadSettings();
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
    // Hold active DOM element references for the active compass modal
    let activeElements = {
        overlay: null,
        dial: null,
        anchor: null,
        indicator: null,
        warning: null,
        currentTilt: null,
        targetAltitude: null,
        currentBar: null,
        targetBand: null,
        status: null
    };

    let orientationHandlerBound = false;

    function handleOrientation(e) {
        if (!state.compass.active || !activeElements.overlay) return;

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
            if (activeElements.status) activeElements.status.textContent = "Waiting for compass alignment...";
            return;
        }

        // 3. Update Compass Dial Rotation
        // Rotate the dial by -heading so N always points North
        if (activeElements.dial) {
            activeElements.dial.style.transform = `rotate(${-heading}deg)`;
        }

        // 4. Update Target Moon/Sun Angles on the dial
        if (activeElements.anchor) {
            activeElements.anchor.style.transform = `rotate(${targetAz}deg)`;
        }

        // Toggle below-horizon styling
        if (activeElements.indicator) {
            if (targetAlt < 0) {
                activeElements.indicator.classList.add('below-horizon');
            } else {
                activeElements.indicator.classList.remove('below-horizon');
            }
        }

        // Show Sun warning dynamically if pointing close to the Sun (within 30 deg) and the Sun is above the horizon
        if (state.compass.targetMode === 'sun' && activeElements.warning) {
            let diffToSun = state.compass.sunAz - heading;
            while (diffToSun > 180) diffToSun -= 360;
            while (diffToSun < -180) diffToSun += 360;

            if (state.compass.sunAlt > 0 && Math.abs(diffToSun) < 30) {
                activeElements.warning.classList.remove('hidden');
            } else {
                activeElements.warning.classList.add('hidden');
            }
        }

        // 5. Update Altitude Gauge
        if (activeElements.currentTilt) {
            activeElements.currentTilt.textContent = `${Math.round(tilt)}°`;
        }
        if (activeElements.targetAltitude) {
            activeElements.targetAltitude.textContent = `${Math.round(targetAlt)}°`;
        }

        if (activeElements.currentBar) {
            const tiltPct = (tilt / 90) * 100;
            activeElements.currentBar.style.width = `${tiltPct}%`;
        }

        if (activeElements.targetBand) {
            const targetAltPct = (targetAlt / 90) * 100;
            activeElements.targetBand.style.left = `${Math.max(0, targetAltPct - 5)}%`;
            activeElements.targetBand.style.width = '10%';
        }

        // 6. Calculate directional differences
        let diffAz = targetAz - heading;
        while (diffAz > 180) diffAz -= 360;
        while (diffAz < -180) diffAz += 360;

        const diffAlt = targetAlt - tilt;

        // 7. Render status instructions
        if (activeElements.status) {
            if (Math.abs(diffAz) < 6) {
                // Azimuth is aligned! Now align altitude
                if (Math.abs(diffAlt) < 6) {
                    activeElements.status.textContent = "Aligned! Look Up!";
                    activeElements.status.className = "compass-status aligned";
                    if (activeElements.reticle) {
                        activeElements.reticle.classList.add('aligned');
                    }
                    if (!state.compass.hasVibrated) {
                        if (navigator.vibrate) navigator.vibrate(120);
                        state.compass.hasVibrated = true;
                    }
                } else {
                    activeElements.status.textContent = diffAlt > 0 ? "Tilt Phone Up ⬆️" : "Tilt Phone Down ⬇️";
                    activeElements.status.className = "compass-status";
                    if (activeElements.reticle) {
                        activeElements.reticle.classList.remove('aligned');
                    }
                    state.compass.hasVibrated = false;
                }
            } else {
                // Guide azimuth alignment
                activeElements.status.textContent = diffAz > 0 ? "Turn Right ➡️" : "Turn Left ⬅️";
                activeElements.status.className = "compass-status";
                if (activeElements.reticle) {
                    activeElements.reticle.classList.remove('aligned');
                }
                state.compass.hasVibrated = false;
            }
        }
    }

    async function startCamera() {
        if (!state.compass.useCamera) {
            stopCameraStream();
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("Camera access not supported on this device/browser.");
            return;
        }

        const isSun = state.compass.targetMode === 'sun';
        const videoEl = isSun ? document.getElementById('camera-video-sun') : document.getElementById('camera-video-moon');
        const btnEl = isSun ? document.getElementById('camera-toggle-sun') : document.getElementById('camera-toggle-moon');

        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            state.compass.stream = stream;

            if (videoEl) {
                videoEl.srcObject = stream;
                videoEl.classList.remove('hidden');
                await videoEl.play().catch(e => console.error("Error playing video stream:", e));
            }

            if (activeElements.overlay) {
                activeElements.overlay.classList.add('camera-active');
            }
            if (btnEl) {
                btnEl.classList.add('active');
            }
        } catch (err) {
            console.error("Error accessing camera stream:", err);
            stopCameraStream();
            if (btnEl) {
                btnEl.classList.remove('active');
            }
        }
    }

    function stopCameraStream() {
        if (state.compass.stream) {
            state.compass.stream.getTracks().forEach(track => track.stop());
            state.compass.stream = null;
        }

        const videoElMoon = document.getElementById('camera-video-moon');
        const videoElSun = document.getElementById('camera-video-sun');
        if (videoElMoon) {
            videoElMoon.srcObject = null;
            videoElMoon.classList.add('hidden');
        }
        if (videoElSun) {
            videoElSun.srcObject = null;
            videoElSun.classList.add('hidden');
        }

        const overlayMoon = document.getElementById('compass-overlay-moon');
        const overlaySun = document.getElementById('compass-overlay-sun');
        if (overlayMoon) overlayMoon.classList.remove('camera-active');
        if (overlaySun) overlaySun.classList.remove('camera-active');

        const btnElMoon = document.getElementById('camera-toggle-moon');
        const btnElSun = document.getElementById('camera-toggle-sun');
        if (btnElMoon) btnElMoon.classList.remove('active');
        if (btnElSun) btnElSun.classList.remove('active');
    }

    function toggleCameraMode() {
        state.compass.useCamera = !state.compass.useCamera;
        localStorage.setItem('lumina_compass_camera', state.compass.useCamera);
        if (state.compass.useCamera) {
            startCamera();
        } else {
            stopCameraStream();
        }
    }

    function startCompass(mode = 'moon') {
        state.compass.targetMode = mode;
        state.compass.active = true;
        state.compass.hasVibrated = false;

        const isSun = mode === 'sun';
        activeElements.overlay = isSun ? document.getElementById('compass-overlay-sun') : document.getElementById('compass-overlay-moon');
        activeElements.dial = isSun ? document.getElementById('compass-dial-sun') : document.getElementById('compass-dial-moon');
        activeElements.anchor = isSun ? activeElements.overlay.querySelector('.sun-target-anchor') : activeElements.overlay.querySelector('.moon-target-anchor');
        activeElements.indicator = isSun ? activeElements.overlay.querySelector('.sun-target-indicator') : activeElements.overlay.querySelector('.moon-target-indicator');
        activeElements.warning = isSun ? activeElements.overlay.querySelector('.sun-warning') : null;
        activeElements.reticle = isSun ? document.getElementById('compass-reticle-sun') : document.getElementById('compass-reticle-moon');
        
        activeElements.currentTilt = isSun ? document.getElementById('current-tilt-sun') : document.getElementById('current-tilt-moon');
        activeElements.targetAltitude = isSun ? document.getElementById('target-altitude-sun') : document.getElementById('target-altitude-moon');
        activeElements.currentBar = isSun ? document.getElementById('altitude-current-bar-sun') : document.getElementById('altitude-current-bar-moon');
        activeElements.targetBand = isSun ? document.getElementById('altitude-target-band-sun') : document.getElementById('altitude-target-band-moon');
        activeElements.status = isSun ? document.getElementById('compass-status-sun') : document.getElementById('compass-status-moon');

        if (activeElements.overlay) {
            activeElements.overlay.classList.remove('hidden');
        }
        document.body.style.overflow = 'hidden'; // prevent scrolling behind

        const targetAlt = mode === 'sun' ? state.compass.sunAlt : state.compass.targetAlt;
        if (activeElements.targetAltitude) {
            activeElements.targetAltitude.textContent = `${Math.round(targetAlt)}°`;
        }

        // Start camera stream if enabled
        startCamera();

        if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
            // iOS Safari requires permission
            window.DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        activateCompassListeners();
                    } else {
                        if (activeElements.status) {
                            activeElements.status.textContent = "Permission denied. Enable motion sensors.";
                        }
                    }
                })
                .catch(err => {
                    console.error("iOS permission error", err);
                    if (activeElements.status) {
                        activeElements.status.textContent = "Error initializing sensors.";
                    }
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
        
        // Stop camera stream
        stopCameraStream();

        if (activeElements.overlay) {
            activeElements.overlay.classList.add('hidden');
        }
        document.body.style.overflow = ''; // restore scrolling

        if (orientationHandlerBound) {
            window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
            window.removeEventListener('deviceorientation', handleOrientation, true);
            orientationHandlerBound = false;
        }

        // Reset references
        activeElements.overlay = null;
        activeElements.dial = null;
        activeElements.anchor = null;
        activeElements.indicator = null;
        activeElements.warning = null;
        activeElements.reticle = null;
        activeElements.currentTilt = null;
        activeElements.targetAltitude = null;
        activeElements.currentBar = null;
        activeElements.targetBand = null;
        activeElements.status = null;
    }

    // Popover locator elements
    const navLocate = document.getElementById('nav-locate');
    const locatePopover = document.getElementById('locate-popover');
    const locateMoonOption = document.getElementById('locate-moon-option');
    const locateSunOption = document.getElementById('locate-sun-option');
    const closeCompassMoonBtn = document.getElementById('close-compass-moon-btn');
    const closeCompassSunBtn = document.getElementById('close-compass-sun-btn');
    const compassOverlayMoon = document.getElementById('compass-overlay-moon');
    const compassOverlaySun = document.getElementById('compass-overlay-sun');

    if (navLocate && locatePopover) {
        navLocate.addEventListener('click', (e) => {
            e.stopPropagation();
            locatePopover.classList.toggle('visible');
            navLocate.classList.toggle('active');
        });

        if (locateMoonOption) {
            locateMoonOption.addEventListener('click', () => {
                locatePopover.classList.remove('visible');
                navLocate.classList.remove('active');
                startCompass('moon');
            });
        }
        if (locateSunOption) {
            locateSunOption.addEventListener('click', () => {
                locatePopover.classList.remove('visible');
                navLocate.classList.remove('active');
                startCompass('sun');
            });
        }

        // Close popover when clicking anywhere else on screen
        document.addEventListener('click', (e) => {
            if (!locatePopover.contains(e.target) && e.target !== navLocate) {
                locatePopover.classList.remove('visible');
                navLocate.classList.remove('active');
            }
        });
    }

    if (closeCompassMoonBtn) closeCompassMoonBtn.addEventListener('click', stopCompass);
    if (closeCompassSunBtn) closeCompassSunBtn.addEventListener('click', stopCompass);

    const cameraToggleMoon = document.getElementById('camera-toggle-moon');
    const cameraToggleSun = document.getElementById('camera-toggle-sun');

    if (cameraToggleMoon) {
        cameraToggleMoon.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCameraMode();
        });
    }
    if (cameraToggleSun) {
        cameraToggleSun.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCameraMode();
        });
    }
    
    if (compassOverlayMoon) {
        compassOverlayMoon.addEventListener('click', (e) => {
            if (e.target === compassOverlayMoon) stopCompass();
        });
    }
    if (compassOverlaySun) {
        compassOverlaySun.addEventListener('click', (e) => {
            if (e.target === compassOverlaySun) stopCompass();
        });
    }

    // Settings Drawer toggling
    if (DOM.settingsBtn && DOM.settingsDrawer) {
        DOM.settingsBtn.addEventListener('click', () => {
            DOM.settingsDrawer.classList.remove('hidden');
        });
    }
    if (DOM.closeSettingsBtn && DOM.settingsDrawer) {
        DOM.closeSettingsBtn.addEventListener('click', () => {
            DOM.settingsDrawer.classList.add('hidden');
        });
    }
    if (DOM.drawerOverlay && DOM.settingsDrawer) {
        DOM.drawerOverlay.addEventListener('click', () => {
            DOM.settingsDrawer.classList.add('hidden');
        });
    }

    // Settings preferences change handlers
    if (DOM.prefMasterAlerts) {
        DOM.prefMasterAlerts.addEventListener('change', async () => {
            if (DOM.prefMasterAlerts.checked) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    DOM.prefMasterAlerts.checked = false;
                    alert('Notification permission is required to enable alerts.');
                }
            }
            saveSettings();
            renderUpcomingEvents();
            checkAndTriggerNotifications();
        });
    }

    ['prefCatEclipses', 'prefCatMeteors', 'prefCatMoons'].forEach(prefKey => {
        if (DOM[prefKey]) {
            DOM[prefKey].addEventListener('change', () => {
                saveSettings();
                renderUpcomingEvents();
            });
        }
    });

    // Timeline tab handlers
    const timelineTabs = [DOM.tabAll, DOM.tabEclipses, DOM.tabMeteors, DOM.tabMoons];
    timelineTabs.forEach(tab => {
        if (tab) {
            tab.addEventListener('click', () => {
                timelineTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderUpcomingEvents();
            });
        }
    });

    // Toggle Celestial Timeline collapse
    const timelineToggle = document.getElementById('timeline-toggle-btn');
    if (timelineToggle) {
        timelineToggle.addEventListener('click', () => {
            const section = timelineToggle.closest('.timeline-section');
            if (section) {
                section.classList.toggle('collapsed');
                const isCollapsed = section.classList.contains('collapsed');
                localStorage.setItem('lumina_timeline_collapsed', isCollapsed);
            }
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
    checkAndTriggerNotifications();
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
// Celestial Timeline & Astronomy Solvers
// ==========================================================================
function renderUpcomingEvents() {
    if (!DOM.timelineContainer) return;
    DOM.timelineContainer.innerHTML = '';
    
    const showEclipses = DOM.prefCatEclipses ? DOM.prefCatEclipses.checked : true;
    const showMeteors = DOM.prefCatMeteors ? DOM.prefCatMeteors.checked : true;
    const showMoons = DOM.prefCatMoons ? DOM.prefCatMoons.checked : true;
    
    let events = [];
    if (showMoons) {
        events = events.concat(getMoonPhasesAndSupermoons(state.today, 12));
    }
    if (showEclipses) {
        events = events.concat(getLunarEclipses(state.today, 12));
        events = events.concat(getLocalSolarEclipses(state.today, state.location.lat, state.location.lon, 12));
    }
    if (showMeteors) {
        events = events.concat(getMeteorShowers(state.today, 12));
    }
    
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let activeCategory = 'all';
    const activeTab = document.querySelector('.timeline-tab-btn.active');
    if (activeTab) {
        const id = activeTab.id;
        if (id === 'tab-eclipses') activeCategory = 'eclipse';
        else if (id === 'tab-meteors') activeCategory = 'meteor';
        else if (id === 'tab-moons') activeCategory = 'moon';
    }
    
    let filteredEvents = events;
    if (activeCategory !== 'all') {
        filteredEvents = events.filter(evt => evt.category === activeCategory);
    }
    
    filteredEvents = filteredEvents.slice(0, 10);
    
    if (filteredEvents.length === 0) {
        const noEvents = document.createElement('div');
        noEvents.className = 'no-events-message';
        noEvents.textContent = 'No upcoming events found matching criteria.';
        DOM.timelineContainer.appendChild(noEvents);
        return;
    }
    
    filteredEvents.forEach(evt => {
        const card = document.createElement('div');
        card.className = 'timeline-card';
        card.setAttribute('data-category', evt.category);
        
        let iconClass = 'fa-moon';
        if (evt.category === 'eclipse') {
            iconClass = 'fa-circle-notch';
        } else if (evt.category === 'meteor') {
            iconClass = 'fa-meteor';
        } else if (evt.category === 'moon') {
            if (evt.isSuper) {
                iconClass = 'fa-circle-nodes';
            } else if (evt.quarterVal === 0) {
                iconClass = 'fa-circle';
            } else if (evt.quarterVal === 2) {
                iconClass = 'fa-solid fa-circle';
            }
        }
        
        const iconBox = document.createElement('div');
        iconBox.className = 'timeline-icon-box';
        iconBox.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        card.appendChild(iconBox);
        
        const details = document.createElement('div');
        details.className = 'timeline-details';
        
        const h4 = document.createElement('h4');
        h4.textContent = evt.name;
        details.appendChild(h4);
        
        const meta = document.createElement('div');
        meta.className = 'timeline-meta';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'timeline-date';
        
        const dateStr = evt.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = evt.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        dateSpan.textContent = `${dateStr} at ${timeStr}`;
        meta.appendChild(dateSpan);
        
        const badge = document.createElement('span');
        badge.className = 'timeline-badge';
        let badgeText = 'Event';
        if (evt.category === 'eclipse') badgeText = 'Eclipse';
        else if (evt.category === 'meteor') badgeText = 'Meteor';
        else if (evt.category === 'moon') badgeText = evt.isSuper ? 'Supermoon' : 'Moon Phase';
        badge.textContent = badgeText;
        meta.appendChild(badge);
        
        details.appendChild(meta);
        card.appendChild(details);
        
        const countdown = document.createElement('div');
        countdown.className = 'timeline-countdown';
        
        const timeDiff = evt.date.getTime() - state.today.getTime();
        const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        const hrs = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (days === 0 && hrs === 0) {
            countdown.textContent = 'Happening Now';
        } else if (days === 0) {
            countdown.textContent = `In ${hrs}h`;
        } else if (days < 0) {
            countdown.textContent = 'Passed';
        } else {
            countdown.textContent = `In ${days}d ${hrs}h`;
        }
        card.appendChild(countdown);
        
        card.addEventListener('click', () => {
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
        
        DOM.timelineContainer.appendChild(card);
    });
}

function getMoonPhasesAndSupermoons(startDate, durationMonths = 12) {
    const events = [];
    const endDate = new Date(startDate.getTime() + durationMonths * 30.44 * 24 * 60 * 60 * 1000);
    const Astronomy = window.Astronomy;
    if (!Astronomy) return events;
    
    try {
        let activeTime = new Astronomy.AstroTime(startDate);
        let mq = Astronomy.SearchMoonQuarter(activeTime);
        
        while (mq && mq.time.date.getTime() < endDate.getTime()) {
            const date = mq.time.date;
            let name = '';
            let icon = '';
            let isSuper = false;
            
            if (mq.quarter === 0) {
                name = 'New Moon';
                icon = 'new';
            } else if (mq.quarter === 1) {
                name = 'First Quarter';
                icon = 'first-quarter';
            } else if (mq.quarter === 2) {
                name = 'Full Moon';
                icon = 'full';
                const moonGeo = Astronomy.GeoVector(Astronomy.Body.Moon, mq.time, true);
                const distKm = Math.sqrt(moonGeo.x ** 2 + moonGeo.y ** 2 + moonGeo.z ** 2) * 149597870.7;
                if (distKm < 361000) {
                    name = 'Supermoon';
                    icon = 'supermoon';
                    isSuper = true;
                }
            } else if (mq.quarter === 3) {
                name = 'Last Quarter';
                icon = 'last-quarter';
            }
            
            events.push({
                id: `moon-${mq.quarter}-${date.getTime()}`,
                name: name,
                date: date,
                category: 'moon',
                icon: icon,
                isSuper: isSuper,
                quarterVal: mq.quarter
            });
            
            mq = Astronomy.NextMoonQuarter(mq);
        }
    } catch (e) {
        console.error('Error calculating moon quarters', e);
    }
    return events;
}

function getLunarEclipses(startDate, durationMonths = 12) {
    const events = [];
    const endDate = new Date(startDate.getTime() + durationMonths * 30.44 * 24 * 60 * 60 * 1000);
    const Astronomy = window.Astronomy;
    if (!Astronomy) return events;
    
    try {
        let activeTime = new Astronomy.AstroTime(startDate);
        let eclipse = Astronomy.SearchLunarEclipse(activeTime);
        while (eclipse && eclipse.peak.date.getTime() < endDate.getTime()) {
            const date = eclipse.peak.date;
            
            let kindStr = 'Lunar Eclipse';
            if (eclipse.kind === 0) kindStr = 'Penumbral Lunar Eclipse';
            else if (eclipse.kind === 1) kindStr = 'Partial Lunar Eclipse';
            else if (eclipse.kind === 2) kindStr = 'Total Lunar Eclipse';
            
            events.push({
                id: `lunar-eclipse-${date.getTime()}`,
                name: kindStr,
                date: date,
                category: 'eclipse',
                icon: 'lunar-eclipse',
                kind: eclipse.kind
            });
            
            eclipse = Astronomy.NextLunarEclipse(eclipse.peak);
        }
    } catch (e) {
        console.error('Error searching lunar eclipses', e);
    }
    return events;
}

function getLocalSolarEclipses(startDate, lat, lon, durationMonths = 12) {
    const events = [];
    const endDate = new Date(startDate.getTime() + durationMonths * 30.44 * 24 * 60 * 60 * 1000);
    const Astronomy = window.Astronomy;
    if (!Astronomy) return events;
    
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    try {
        let activeTime = new Astronomy.AstroTime(startDate);
        let eclipse = Astronomy.SearchLocalSolarEclipse(activeTime, observer);
        while (eclipse && eclipse.peak.time.date.getTime() < endDate.getTime()) {
            const date = eclipse.peak.time.date;
            
            if (eclipse.peak.altitude > 0) {
                let kindStr = 'Solar Eclipse';
                if (eclipse.kind === 0 || eclipse.kind === 'Partial') kindStr = 'Partial Solar Eclipse';
                else if (eclipse.kind === 1 || eclipse.kind === 'Annular') kindStr = 'Annular Solar Eclipse';
                else if (eclipse.kind === 2 || eclipse.kind === 'Total') kindStr = 'Total Solar Eclipse';
                
                events.push({
                    id: `solar-eclipse-${date.getTime()}`,
                    name: kindStr,
                    date: date,
                    category: 'eclipse',
                    icon: 'solar-eclipse',
                    kind: eclipse.kind
                });
            }
            
            eclipse = Astronomy.NextLocalSolarEclipse(eclipse.peak.time, observer);
        }
    } catch (e) {
        console.error('Error searching solar eclipses', e);
    }
    return events;
}

function getMeteorShowers(startDate, durationMonths = 12) {
    const events = [];
    const endDate = new Date(startDate.getTime() + durationMonths * 30.44 * 24 * 60 * 60 * 1000);
    
    const showerPeaks = [
        { name: 'Quadrantids', month: 0, day: 4 },
        { name: 'Lyrids', month: 3, day: 22 },
        { name: 'Eta Aquariids', month: 4, day: 6 },
        { name: 'Perseids', month: 7, day: 12 },
        { name: 'Orionids', month: 9, day: 21 },
        { name: 'Leonids', month: 10, day: 17 },
        { name: 'Geminids', month: 11, day: 14 },
        { name: 'Ursids', month: 11, day: 22 }
    ];
    
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
        showerPeaks.forEach(shower => {
            const peakDate = new Date(year, shower.month, shower.day, 22, 0, 0);
            if (peakDate.getTime() >= startDate.getTime() && peakDate.getTime() <= endDate.getTime()) {
                events.push({
                    id: `meteor-${shower.name.toLowerCase()}-${peakDate.getTime()}`,
                    name: `${shower.name} Meteor Shower Peak`,
                    date: peakDate,
                    category: 'meteor',
                    icon: 'meteor'
                });
            }
        });
    }
    return events;
}

// ==========================================================================
// Settings Panel Persistence & Notifications Engine
// ==========================================================================
function saveSettings() {
    const preferences = {
        masterAlerts: DOM.prefMasterAlerts ? DOM.prefMasterAlerts.checked : false,
        catEclipses: DOM.prefCatEclipses ? DOM.prefCatEclipses.checked : true,
        catMeteors: DOM.prefCatMeteors ? DOM.prefCatMeteors.checked : true,
        catMoons: DOM.prefCatMoons ? DOM.prefCatMoons.checked : true
    };
    localStorage.setItem('lumina_notification_settings', JSON.stringify(preferences));
}

function loadSettings() {
    try {
        const stored = localStorage.getItem('lumina_notification_settings');
        if (stored) {
            const preferences = JSON.parse(stored);
            if (DOM.prefMasterAlerts) DOM.prefMasterAlerts.checked = !!preferences.masterAlerts;
            if (DOM.prefCatEclipses) DOM.prefCatEclipses.checked = preferences.catEclipses !== false;
            if (DOM.prefCatMeteors) DOM.prefCatMeteors.checked = preferences.catMeteors !== false;
            if (DOM.prefCatMoons) DOM.prefCatMoons.checked = preferences.catMoons !== false;
        } else {
            if (DOM.prefMasterAlerts) DOM.prefMasterAlerts.checked = false;
            if (DOM.prefCatEclipses) DOM.prefCatEclipses.checked = true;
            if (DOM.prefCatMeteors) DOM.prefCatMeteors.checked = true;
            if (DOM.prefCatMoons) DOM.prefCatMoons.checked = true;
        }
        
        // Restore collapsible timeline state
        const timelineCollapsed = localStorage.getItem('lumina_timeline_collapsed') === 'true';
        const section = document.querySelector('.timeline-section');
        if (section && timelineCollapsed) {
            section.classList.add('collapsed');
        }
    } catch (e) {
        console.error('Error loading settings', e);
    }
}

function checkAndTriggerNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!DOM.prefMasterAlerts || !DOM.prefMasterAlerts.checked) return;
    
    const enabledCategories = {
        eclipse: DOM.prefCatEclipses ? DOM.prefCatEclipses.checked : true,
        meteor: DOM.prefCatMeteors ? DOM.prefCatMeteors.checked : true,
        moon: DOM.prefCatMoons ? DOM.prefCatMoons.checked : true
    };
    
    const events = [
        ...getMoonPhasesAndSupermoons(state.today, 1),
        ...getLunarEclipses(state.today, 1),
        ...getLocalSolarEclipses(state.today, state.location.lat, state.location.lon, 1),
        ...getMeteorShowers(state.today, 1)
    ];
    
    const todayStr = state.today.toDateString();
    const todayEvents = events.filter(evt => {
        if (!enabledCategories[evt.category]) return false;
        return evt.date.toDateString() === todayStr;
    });
    
    if (todayEvents.length === 0) return;
    
    let notified = [];
    try {
        const stored = localStorage.getItem('lumina_notified_events');
        if (stored) notified = JSON.parse(stored);
    } catch (e) {}
    
    todayEvents.forEach(evt => {
        if (notified.includes(evt.id)) return;
        
        const title = `Lumina Event Today!`;
        const options = {
            body: `${evt.name} occurs today at ${evt.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}.`,
            icon: '/icons/icon-192.png'
        };
        new Notification(title, options);
        
        notified.push(evt.id);
    });
    
    if (notified.length > 50) {
        notified = notified.slice(notified.length - 50);
    }
    localStorage.setItem('lumina_notified_events', JSON.stringify(notified));
}
