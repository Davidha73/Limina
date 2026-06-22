## [2026-06-22T20:50:00+01:00]
**Status:** Made the Sun safety warning dynamically visible in the compass finder. Coded checks inside `handleOrientation()` so that it only renders when the Sun is above the horizon ($Alt > 0^\circ$) and the user points their phone within $30^\circ$ of the Sun's real-time Azimuth.
**Files Changed:**
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Test absolute sensor accuracy and verify warning behavior when pointing near/away from the Sun's azimuth.

## [2026-06-22T20:45:00+01:00]
**Status:** Added the "Find in Sky" button to the Sun Azimuth card. Extended `startCompass()` and `handleOrientation()` in `app.js` to dynamically support a `targetMode` ('moon' or 'sun'), enabling targeting and guides for the Sun.
**Files Changed:**
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
- [app.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/app.js)
**Next Objectives:**
- Verify that both Sun and Moon azimuth guides trigger correctly and align with their respective altitude/azimuth stats.
