# Lumina Project Memory

## [2026-06-22T22:24:00+01:00]
**Status:** Introduced a 500ms delay before the loading splash screen displays (fades in) to prevent flash-of-unstyled-content or brief visual flickers on fast cached loads. Configured CSS animation-delays on child components to match, and updated dismissal timer in JS to 2000ms.
**Files Changed:**
- [style.css](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/style.css)
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Test splash screen rendering behavior on both slow network throttling and fast desktop local reload.

## [2026-06-22T22:21:00+01:00]
**Status:** Implemented a premium, animated loading splash screen with floating logo, pulsing radial brand gradient glow, letter-spaced title, and a smooth loader progress bar. Handles graceful transition fade out and DOM cleanup on initial rendering complete.
**Files Changed:**
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
- [style.css](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/style.css)
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Verify load transition timing and fade animations behavior across varying device network speeds.

## [2026-06-22T22:16:00+01:00]
**Status:** Adjusted vertical positioning of settings button (`more_vert`) from `top: 2rem` to `top: 1.5rem` on desktop, and `top: 1rem` to `top: 0.8rem` on mobile, bringing the icon into visual alignment with the Lumina logo.
**Files Changed:**
- [style.css](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/style.css)
**Next Objectives:**
- Verify vertical alignment visual response on both desktop layout and mobile device sizes.

## [2026-06-22T22:02:00+01:00]
**Status:** Recalibrated phone pitch sensor calculation for AR Camera mode to resolve the floor-pointing camera bug. Updated sensor elevation to map `beta - 90` when camera stream is running, allowing the phone to be tilted forward to face the sky while keeping standard `beta` mapping when camera is disabled.
**Files Changed:**
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Verify alignment response accuracy of the updated pitch formula on device testing.

## [2026-06-22T21:56:00+01:00]
**Status:** Implemented Option 4 (AR alignment guide). Added rear-camera video streams into the compass overlays for immersive overlay target scanning. Integrated manual camera toggles inside overlays, state persistence in `localStorage`, dynamic backdrop styling transitions, and interactive dashed-orange to solid-green alignment reticles.
**Files Changed:**
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
- [style.css](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/style.css)
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Test orientation performance on mobile devices with live camera stream background overlay.

## [2026-06-22T21:52:00+01:00]
**Status:** Repositioned the calendar month picker buttons to sit on the same line as the active month and year text. Modified desktop styling to align controls alongside the section heading and adjusted mobile layout to span full-width for clean spacing.
**Files Changed:**
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
- [style.css](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/style.css)
**Next Objectives:**
- Verify layout alignment of the calendar header on various screen dimensions.

## [2026-06-22T21:44:00+01:00]
**Status:** Implemented PWA notifications and the glassmorphic Celestial Timeline. Resolved solar/lunar eclipse and moon quarter astronomy engines calculations. Added settings drawer alerts category toggles and tab filtering. Repositioned settings icon to `more_vert` (ellipsis-vertical) at the top-right of the app wrapper. Made the Celestial Timeline collapsible with a right-aligned toggle chevron and state persistent in `localStorage`.
**Files Changed:**
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
- [style.css](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/style.css)
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Verify native system notifications checks, responsiveness of the timeline cards, and collapsible state persistence.

## Past Highlights (Compressed)
- Added live observer cone pointing to the Moon in the Orrery space view.
- Centralized Locate guides for Moon & Sun into popover triggers in the nav dock.
- Configured individual safety-oriented compass modal overlays for Moon/Sun tracking.
- Drafted a feature proposal roadmap (`ideas.md`) with five PWA enhancement options.
