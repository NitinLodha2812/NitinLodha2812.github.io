# Nitin Lodha - Portfolio

A modern, animated single page portfolio for Nitin Lodha, AI Engineer and builder.

## What is inside

- `index.html` - all content and structure
- `assets/css/style.css` - full design system, light and dark themes, responsive layout
- `assets/js/main.js` - all interactions (no external libraries)
- `assets/img/` - portrait images

## Features

- Light and dark mode with a circular reveal transition, remembers your choice
- Animated particle constellation background that reacts to the cursor
- Custom cursor, magnetic buttons, and subtle 3D tilt on cards
- Scroll reveal animations, animated counters, and a typed hero role
- Sections: Hero, About, Experience, Ventures (entrepreneurship), Projects, Skills, Research, Education, Contact
- Fully responsive with a dedicated mobile menu
- Respects `prefers-reduced-motion` and `prefers-color-scheme`

## Run it locally

```bash
cd site
python3 -m http.server 8123
```

Then open http://localhost:8123 in a browser.

## Deploy

This is a static site. It can be served from any static host or from GitHub Pages
by placing these files at the root of the `NitinLodha2812.github.io` repository.
