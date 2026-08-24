# Easyvis

Easyvis is a web app for planning astronomical observations. Pick a target along with a location and date, and Easyvis calculates its visibility throughout the night: altitude, azimuth, apparent magnitude, and a computed visibility score that accounts for sky brightness, moonlight, twilight, and atmospheric extinction. A 3D sky dome lets you see the object's position against the real constellations for that moment, and a timeline lets you scrub through the day to see how visibility changes minute by minute.

## Features

- Visibility scoring based on sky brightness, lunar interference, twilight, and airmass extinction
- Interactive 3D sky view with an accurate constellation map, sun, and moon
- Location-aware sky darkness (SQM) lookup, so visibility estimates reflect real light pollution at the chosen site
- Day/night timeline scrubbing with a visibility chart
- Location picker with an interactive map

## Acknowledgements

Sky darkness (SQM) data is derived from the light pollution atlas created by **David Lorenz** ([djlorenz.github.io/astronomy](https://djlorenz.github.io/astronomy/lp/overlay/dark.html)), based on modeled atmospheric light propagation from VIIRS satellite imagery. Many thanks for making this data publicly available.

## License

This is a personal project, not intended for public distribution or reuse.

## Tech stack

- React + TypeScript
- Three.js for the 3D sky rendering
- [astronomy-engine](https://github.com/cosinekitty/astronomy) for astronomical calculations
- MUI for UI components
- Leaflet for the location picker