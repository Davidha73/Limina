# Lumina - Future Feature Roadmap & Suggestions

This document serves as a detailed reference guide for potential premium features that could be added to Lumina in the future to enhance its utility, styling, and interactivity.

---

## 1. Stargazing Condition & Night Sky Quality Index
Provide users with real-time stargazing recommendations based on moon phase brightness, local weather conditions, and astronomical variables.

### Key Details
* **Mechanics:** 
  * Calculates sky darkness by checking the active Moon phase illumination (lower illumination yields a darker sky).
  * Combines data with local meteorological stats (cloud cover, relative humidity, and atmospheric pressure) fetched from a free weather api (e.g., Open-Meteo or OpenWeatherMap).
  * Integrates civil, nautical, and astronomical twilight calculations to identify the absolute dark window.
* **Visuals & UI:**
  * A glassmorphic dashboard panel displaying a circular gauge ranging from "Poor" to "Excellent".
  * Subgrid detailing specific stargazing metrics (e.g., Moon Glare level, Atmospheric Clarity, Dew Point risk).
  * Glowing color cues (e.g., neon green for perfect conditions, deep violet for poor conditions).

---

## 2. Time-Travel & Simulation Speed Controls for the Orrery
Enable users to witness solar system orbital relationships over days, months, or years in fast-forward simulation modes.

### Key Details
* **Mechanics:**
  * Add a simulation clock that can be decoupled from the real-world date.
  * Integrate controls to play, pause, rewind, and fast-forward the solar system simulation.
  * Implement speed multiplier steps (e.g., 1 day/sec, 30 days/sec, 1 year/sec) to visualize planetary alignments and transits.
* **Visuals & UI:**
  * Sleek media-style control panel (rewind, play/pause, fast-forward icons) positioned directly below the Orrery canvas.
  * A digital simulation timestamp display showing the virtual speed and current simulated date.
  * Orbital trajectory markers that dynamically glow as planets approach conjunctions.

---

## 3. PWA Push Notifications & Celestial Timeline
Alert users to major upcoming celestial events so they never miss a Supermoon, eclipse, or meteor shower.

### Key Details
* **Mechanics:**
  * Leverage the high-precision Astronomy Engine (already imported in the app) to forward-solve for events inside a 1-year window relative to the user's active coordinates.
  * Schedule local notifications via the Service Worker push registration API.
* **Visuals & UI:**
  * A timeline feed card showing upcoming events sorted chronologically (e.g., "Perseids Meteor Shower Peak", "Annular Solar Eclipse").
  * Miniature countdown badges on each timeline item (e.g., "In 3 days", "Tonight").
  * In-app toggle buttons inside the Settings drawer to selectively subscribe to eclipses, meteor showers, or lunar phases.

---

## 4. Camera-Stream Sky Finder (AR Alignment Guide)
Turn the phone locator overlays into an interactive augmented reality guide by superimposing target alignments over a live camera feed.

### Key Details
* **Mechanics:**
  * Request browser media permissions (`navigator.mediaDevices.getUserMedia`) to capture a stream of the user's rear-facing camera.
  * Project the camera stream as the live background of the compass overlay modal (`#compass-overlay-moon` and `#compass-overlay-sun`).
* **Visuals & UI:**
  * The digital compass dial and alignment target are rendered as glowing, semitransparent layers on top of the physical camera stream.
  * Interactive reticles that change from dashed orange to solid green with haptic feedback (vibration) when aligned with the celestial object.

---

## 5. Solar & Lunar Eclipse Simulator
An eclipse visualizer that predicts and simulates exactly how an eclipse looks from the user's current longitude and latitude coordinates.

### Key Details
* **Mechanics:**
  * Solve for the path of totality/obscuration using Astronomy Engine.
  * Calculate the maximum coverage percentage and exact local timing (start, peak, end).
  * Draw a 2D canvas animation that simulates the moon silhouette passing over the sun's corona (solar) or Earth's shadow covering the moon (lunar).
* **Visuals & UI:**
  * An interactive slider enabling the user to scrub frame-by-frame through the eclipse timeline.
  * Safety warnings that pulse red when simulating a solar eclipse, advising on protective eyewear.
