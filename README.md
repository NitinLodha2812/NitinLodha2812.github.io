# Nitin Lodha — portfolio

Static, single page, no build step and no JavaScript libraries.
Live at https://nitinlodha2812.github.io/

## Files

- `index.html` — all content
- `assets/css/style.css` — layout, type, light and dark themes
- `assets/js/main.js` — interactions
- `assets/img/nitin-duo.jpg`, `nitin-color.jpg` — portrait (blue duotone and colour)

## Design

Spruce and marigold: deep spruce fields (`#1D3A33`), soft sage paper
(`#F0F3EE`), green-black ink (`#16302A`), and one warm accent (`#E9B44C`)
used sparingly for the pulse, buttons and "now". Display type is Roboto
Flex; body copy is Newsreader. All colours are CSS variables at the top of
`style.css`.

The motion is one idea used everywhere. A pulse travels through a line of
type and each letter widens as it passes, using Roboto Flex's width axis.
The rest of the line narrows by the same amount, so the line keeps its
length. The hero name follows the cursor and draws its signal on the line
beneath it; section headings pulse once when they arrive; the contact email
answers the cursor and pulses when you copy it.

Other details:

- The hero name and the email are fitted to the container by adjusting the
  width axis, so both lines end flush at every screen size.
- The portrait is an arched spruce duotone with a lens that shows the colour photo
  under the cursor (tap on touch screens).
- A timeline chart shows work and school from 2019 to today; whatever lies
  after today is drawn faint, and a marker sits on the current date.
- A small chart shows papers per year; each bar jumps to that year.
- Projects expand in place.
- `prefers-reduced-motion` turns all of it off, and `prefers-color-scheme: dark`
  switches the paper sections to deep green.

## Run locally

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123.
