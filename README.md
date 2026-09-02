# Earth View Map

IMPORTANT — I need a REAL SATELLITE / TERRAIN BASEMAP.

Do NOT create a map that is merely "similar to" satellite imagery.

Do NOT simulate satellite imagery using CSS, gradients, SVGs, colored polygons, or generated graphics.

I want an ACTUAL INTERACTIVE SATELLITE/TERRAIN MAP as the base layer of my dashboard.

==================================================

REAL BASEMAP REQUIREMENT

==================================================

Use a real online satellite/terrain map tile provider compatible with the mapping library used in this project.

The dashboard map must load REAL geographic imagery/terrain tiles.

I should be able to see actual geographic features such as:

- real green vegetation

- forests

- mountains

- valleys

- deserts

- rivers

- lakes

- coastlines

- real terrain/elevation patterns

- real geographic texture

The map should look like an actual satellite/terrain map that I can zoom into, NOT a custom-designed illustration.

When I zoom into Karnataka, for example, I should see the actual geographic terrain of Karnataka.

When I zoom into Uttarakhand, I should see the actual Himalayan terrain.

==================================================

ABSOLUTELY DO NOT DO THIS

==================================================

DO NOT:

❌ create a white India polygon

❌ create a black/dark India polygon

❌ fill states with colors

❌ use a flat vector basemap

❌ use an SVG/image of India

❌ generate fake terrain with CSS

❌ create a fake satellite effect

❌ use a static screenshot

❌ put a white layer over the satellite imagery

❌ replace the real basemap with colored geographic polygons

The underlying map must ALWAYS remain a real geographic satellite/terrain basemap.

==================================================

DISCATRA LAYERS GO ABOVE THE REAL MAP

==================================================

The architecture should be:

REAL SATELLITE/TERRAIN BASEMAP

        ↓

REAL STATE/DISTRICT BOUNDARIES

        ↓

DISCATRA HAZARD DATA

        ↓

DISASTER HEATMAP

        ↓

RED / ORANGE / YELLOW RISK ZONES

        ↓

RISK MARKERS

The risk visualization must be an overlay.

It must NEVER replace or hide the real basemap.

==================================================

RISK OVERLAY

==================================================

On top of the real satellite/terrain map, later we will display:

🟡 Yellow = lower priority risk

🟠 Orange = high risk

🔴 Red = critical red zone

These colors should appear ONLY where actual/sample disaster-risk data exists.

For example:

If only one small area of Karnataka has high flood risk:

→ Karnataka remains a normal real satellite/terrain map.

→ Only that affected area gets an orange/red heatmap.

DO NOT color the entire Karnataka state.

==================================================

TECHNICAL REQUIREMENT

==================================================

Inspect the existing mapping implementation.

If the project is using MapLibre GL JS, use a proper MapLibre-compatible raster/vector tile source or satellite imagery provider.

The basemap must come from an actual map-tile service.

Do not use a locally generated image as the basemap.

Make the map fully interactive:

- pan

- zoom

- zoom controls

- state search

- state selection

- smooth zoom to state

- district-level zoom

==================================================

IMPORTANT — PROVIDER

==================================================

Do not silently substitute the real satellite map with a fake map if a satellite tile provider requires an API key.

If an API key or provider configuration is required:

1. Tell me exactly which provider you selected.

2. Tell me exactly which API key/environment variable is required.

3. Put the key in an environment variable such as:

VITE_MAP_API_KEY

or the appropriate environment variable for this project.

4. Do not hardcode secret API keys into source code.

If the current provider cannot provide real satellite/terrain imagery, choose an appropriate legitimate provider that can.

==================================================

VISUAL RESULT I WANT

==================================================

When I open the dashboard, the map should immediately look like:

REAL EARTH / REAL GEOGRAPHY

with natural:

GREEN

BROWN

TAN

BLUE

TERRAIN

colors and actual geographic imagery.

Then our DISCATRA disaster-risk visualization appears on top.

The final concept is:

REAL SATELLITE/TERRAIN MAP

+

DISCATRA GIS RISK OVERLAY

NOT:

CUSTOM MAP

+

COLORED STATES

==================================================

DO NOT CHANGE THE REST OF MY DASHBOARD

==================================================

Keep my existing:

- sidebar

- header

- search

- Authority button

- State button

- panels

- dashboard layout

- navigation

Only replace/fix the map's underlying basemap and make sure future risk layers can sit on top of it.

Before finishing, verify that there is NO white land layer or artificial dark land layer covering the real satellite imagery.

The final map must be an actual interactive satellite/terrain basemap.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5448a71a-b8b0-4585-94e0-a12049b4c1c9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
