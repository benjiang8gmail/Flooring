# Plank & Pattern Flooring website

A fast, static website for a hard flooring business in greater Melbourne. It sells **installation** (timber, hybrid, laminate, vinyl plank, herringbone) and **supply of flooring materials** (supply only, supply & install, or install only).

No build step, no framework: plain HTML, CSS and a single JavaScript file.

## Pages

| File | What it's for |
| --- | --- |
| `index.html` | Home: hero with an interactive floor preview, buying options, floor types, process, subfloor checks, service areas, FAQ |
| `installation.html` | Installation methods table, subfloor prep, removal & finishing, stairs, apartments/builders/landlords |
| `supply.html` | Product range, Australian hardwood hardness chart, accessories, order-quantity calculator, trade accounts |
| `service-areas.html` | Suburb checker and suburb lists for every Melbourne region plus Geelong, Peninsula, Yarra Valley, Macedon Ranges |
| `quote.html` | Quote request form with a live indicative price guide |
| `thanks.html` | Shown after the form is submitted without JavaScript |
| `404.html` | Not-found page |

Supporting files: `assets/css/styles.css`, `assets/js/main.js`, `assets/img/` (favicon and social share image), `robots.txt`, `sitemap.xml`, `netlify.toml`.

## Features

- **Floor preview**: floors are drawn in the browser to scale (board widths and lengths in millimetres), so there are no stock photos to license. Visitors can switch between engineered oak, spotted gum, herringbone, hybrid and blackbutt.
- **Price guide** on the quote page that updates as the visitor fills in floor type, area, service and extras.
- **Order quantity calculator** on the supply page (area + cutting allowance → boxes).
- **Suburb checker** on the service areas page.
- Mobile call / quote bar, light and dark themes, keyboard accessible, `prefers-reduced-motion` respected.
- SEO basics: page titles and descriptions, canonical URLs, Open Graph image, `LocalBusiness` structured data, sitemap.

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

**Netlify (recommended).** Connect this repository or drag the folder into Netlify. The quote form is already set up for Netlify Forms (`data-netlify="true"`), so submissions appear in the Netlify dashboard and can be emailed to you. In Netlify, make sure form detection is enabled under *Forms*.

**Other hosts (GitHub Pages, Cloudflare Pages, cPanel).** Netlify Forms won't work there. Create a form at a service such as Formspree and add its URL to the form in `quote.html`:

```html
<form ... data-quote-form data-endpoint="https://formspree.io/f/your-id">
```

The script posts to that endpoint instead.

## Before you launch: replace the placeholders

The business details are placeholders. Use find-and-replace across all `.html` files (the header and footer are repeated in each page).

| Placeholder | Where |
| --- | --- |
| Business name `Plank & Pattern Flooring` | All pages, `README`, structured data in `index.html` |
| Phone `0491 570 156` / `tel:+61491570156` | All pages and `assets/js/main.js`. This is a number ACMA reserves for fictional use, so it won't reach anyone. |
| Email `quotes@plankandpattern.com.au` | Footer, `quote.html`, `assets/js/main.js` |
| Domain `https://www.plankandpattern.com.au` | `<link rel="canonical">` and `og:` tags in every page, `sitemap.xml`, `robots.txt`, structured data |
| `ABN 00 000 000 000` | Footer of every page |
| Showroom `Moorabbin VIC 3189` and opening hours | Footer, `quote.html`, `supply.html`, `service-areas.html`, structured data |

### Check the claims and prices

These are written as sensible defaults for a Melbourne flooring business. Confirm each one is true for you, or edit it:

- **Prices**: the `RATES` and `EXTRAS` tables at the top of `assets/js/main.js` drive the price guide. The first FAQ answer in `index.html` quotes the same ranges.
- "Fully insured", "workmanship warranty", "we'll call you within one business day" (form success message and `thanks.html`).
- "No travel charge" for metro regions and "travel charge may apply" for outer areas (`service-areas.html`).
- Trade account terms ("30-day account terms") in `supply.html`.
- The suburb lists in `service-areas.html`: add or remove suburbs freely; the suburb checker reads them from the page.
- Add genuine customer reviews (for example, from your Google Business Profile) once you have them.

## Editing tips

- Colours and fonts are design tokens at the top of `assets/css/styles.css` (`--accent`, `--timber`, `--ink`, and so on), with a matching dark-theme block.
- Floor looks and the specs shown under the hero floor picker are in the `FLOORS` object in `assets/js/main.js`.
- Any `<canvas data-floor="spotted-gum" data-span="1500">` draws a floor sample; `data-span` is how many millimetres of floor the canvas shows across.
