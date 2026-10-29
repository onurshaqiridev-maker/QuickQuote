# Learning Notes

A short note after every task: what changed, why, and what I learned.

## Task 1: Project setup

**What changed**
- `package.json`: the project's "ID card". It has the name, the `npm start` command, and the list of packages the project needs.
- Installed **Express**, the package that turns Node.js into a web server. It's listed under `dependencies` in `package.json`.
- `.gitignore`: tells Git which files **not** to save. `node_modules/` is huge and can be recreated with `npm install`. `data/requests.json` will hold customer data, so it never goes on GitHub.
- Folders for the website files: `public/css/`, `public/js/`, and `data/`.
- `README.md` (the front page of the repo) and this file.

**Why**
A clear structure from day one means every later task knows exactly where its code goes:
`public/` is what the browser sees, and `server.js` (Task 2) is the backend.

**What I learned**
- `npm install express` downloads Express into `node_modules/` and records it in `package.json`. Anyone can then run `npm install` to get the same packages.
- `package-lock.json` records the exact versions installed, so everyone gets the same setup. It *is* committed.
- Git can't save empty folders, so each empty folder gets a tiny `.gitkeep` file as a placeholder.

## Task 2: First server

**What changed**
- `server.js`: the backend. It's 3 parts:
  1. `require('express')` loads Express.
  2. `app.use(express.static('public'))` sends any file in `public/` to the browser.
     Visiting `/` shows `public/index.html` automatically.
  3. `app.listen(PORT, ...)` starts the server and waits for requests.
- `public/index.html`: a tiny page that says "Hello QuickQuote" (the real page comes in Task 3).

**Why**
A website with a backend needs a program that is always running and answering requests.
That program is the server. For now it only hands out files, and later tasks add API routes
that calculate prices and save requests.

**What I learned**
- **Server vs. browser:** the browser *asks* (a "request"), the server *answers* (a "response").
  `curl -i localhost:3000` showed `HTTP/1.1 200 OK`, where 200 means "everything worked".
- **`express.static`:** you don't write a route for each HTML/CSS/JS file. Express serves the whole folder.
- **Why `process.env.PORT || 3000`:** hosting services like Render choose the port and pass it in
  the `PORT` environment variable. `||` means "if PORT isn't set, use 3000". I tested both:
  `npm start` ran on 3000, and `PORT=4000 node server.js` ran on 4000.
- **`npm start`** runs the `start` script from `package.json` (`node server.js`). `Ctrl + C` stops it.

## Task 3: Page structure

**What changed**
- `public/index.html` now has the real page layout, built from **semantic** HTML tags:
  - `<header>`: the logo and the `<nav>` menu (Home, Get a quote, Contact)
  - `<main>`: the main content, with two `<section>`s:
    - the **hero** (big headline, short pitch, and a "Get my quote" button)
    - the **calculator** area (`id="calculator"`, still empty; the form arrives in Task 6)
  - `<footer>`: contact details and copyright (`id="contact"`)
- The `<title>` is now "QuickQuote | Sparkle Home Cleaning", the text shown in the browser tab.

**Why**
Structure first, style later. When the HTML is clean and meaningful, the CSS (Task 4) and
JavaScript (Task 6+) have clear places to attach to.

**What I learned**
- **Semantic tags** (`header`, `nav`, `main`, `section`, `footer`) describe *what* each part is.
  Screen readers and search engines understand the page better than with plain `<div>`s.
- **In-page links:** `<a href="#calculator">` jumps to the element with `id="calculator"`.
  No JavaScript needed. Tested: clicking "Get my quote" changed the address to `#calculator`.
- **The viewport meta tag** (`width=device-width`) stops phones from showing a tiny zoomed-out page.
  It's the first step to a responsive site.
- **`class` vs `id`:** an `id` is unique (one per page, used for jump links); a `class` can repeat
  (like `container`, which CSS will use in Task 4).
- I didn't link the CSS/JS files yet: linking files that don't exist causes "404 Not Found" errors in the console.

## Task 4: Base CSS

**What changed**
- New file `public/css/style.css`, linked from `index.html` with `<link rel="stylesheet" href="css/style.css">`.
- The file has 8 numbered parts: variables, reset, base text, layout (`.container` + `.button`),
  header, hero, sections, footer.
- Brand look: teal (a "fresh and clean" color), a light teal hero, a dark teal footer.

**Why**
Task 3 gave the page structure. CSS makes it look like a real business site.
Putting the colors and spacing in **variables** means the look can be changed in one place later.

**What I learned**
- **CSS variables:** `--color-primary: #0f766e;` defines it once, and `var(--color-primary)` uses it anywhere.
- **Reset + `box-sizing: border-box`:** browsers add their own margins. Removing them makes every
  browser start the same. `border-box` means padding doesn't make boxes wider than I set.
- **`.container`:** `max-width` + `margin: 0 auto` centres the content and stops lines getting
  too long on big screens. Its `padding` keeps text off the screen edge on phones.
- **Flexbox in the header:** `display: flex` puts the logo and menu in one row.
  `justify-content: space-between` pushes them to opposite sides, and `flex-wrap: wrap` lets the menu
  drop under the logo on narrow phones.
- **`clamp()`** for the headline: the font size grows with the screen width but stays between
  a minimum and maximum.
- **`scroll-behavior: smooth`** makes the "Get my quote" jump glide instead of snapping.
- Tested at 375px, 768px and 1280px: no sideways scrolling, no console errors, and the CSS file loads (200 OK).

## Task 5: API: price list

**What changed**
- New file `prices.js`: the whole price list in one object called `PRICES`:
  - 3 services, each with a `basePrice` and a `pricePerRoom` (for example, Standard clean: €40 + €15 per room)
  - 4 frequencies with a discount (Weekly = `0.15` = 15% off)
  - 4 extras with a fixed price (for example, Inside oven: €25)
  - room limits (1 to 10) and the currency (EUR)
- `server.js` has its **first API route**: `GET /api/services` sends `PRICES` back as JSON.

**Why**
The prices belong on the **server**, not in the browser. In Task 6 the form builds itself from
this data, and in Task 8 the server calculates the price from the same list, so there is only
ever one copy of each price.

**What I learned**
- **API = a menu for programs.** A web page is for people. An API route answers with **data** (JSON) that
  JavaScript can read. Open http://localhost:3000/api/services in the browser to see it.
- **JSON** looks like a JavaScript object, but it's text that can travel over the internet.
  `res.json(PRICES)` turns the object into JSON and sets `Content-Type: application/json`.
- **`module.exports` and `require()`** split code into files: `prices.js` exports `PRICES`,
  and `server.js` imports it with `const { PRICES } = require('./prices');`.
- **GET** means "give me data". A route only answers the method it was made for. Tested:
  `GET /api/services` gives 200 OK with JSON, `POST /api/services` gives 404, an unknown `/api/nope` gives 404,
  and the homepage still works.
- Storing a discount as `0.15` instead of `15` makes the maths simple later: `price × 0.15` = the discount.

## Task 6: Calculator form

**What changed**
- `public/index.html`: the calculator now has a real `<form>` with:
  - a dropdown (`<select>`) for the type of cleaning
  - a number box for rooms (1–10)
  - radio buttons for "How often?" and checkboxes for extras, each group inside a `<fieldset>` with a `<legend>` title
  - a "Calculate price" button and an empty "Your estimate" box (the price arrives in Task 9)
- New file `public/js/script.js` (linked with `<script src="js/script.js" defer>`):
  1. `fetch('/api/services')` asks the server for the price list.
  2. `buildForm()` loops over the data and creates the options, radios and checkboxes.
  3. If the server can't be reached, it shows "Sorry, we could not load our prices."

**Why**
The HTML contains **no prices at all**. Everything shown comes from `prices.js` on the server.
If a price changes, the form updates by itself.

**What I learned**
- **`fetch()` + `async/await`:** `await fetch(url)` waits for the server's answer, and
  `await response.json()` turns the JSON text into a JavaScript object.
- **`try { } catch { }`:** if anything fails (no internet, server down), the `catch` part runs
  instead of the page breaking. Tested by blocking the request: the friendly message appeared.
- **Creating HTML with JavaScript:** `document.createElement('option')`, set `.value` and
  `.textContent`, then `appendChild()` puts it on the page. `forEach` repeats this for every item.
- **Radio vs. checkbox:** radios with the same `name` let you pick only one; checkboxes let you pick many.
- **Label wrapping:** putting the `<input>` inside its `<label>` means clicking the text ticks the box.
  This makes bigger tap targets on phones.
- **`event.preventDefault()`** stops a form from reloading the page when you submit it.
- **`defer`** on the script tag waits until the HTML is loaded, so `getElementById` finds the elements.
- **`Intl.NumberFormat`** formats money properly: `40` becomes `€40.00`.

## Task 7: Form styling + responsive layout

**What changed**
- `public/css/style.css` got a big new part for the calculator:
  - The form is a white **card**, and the result is a light-teal card with a teal border.
  - Inputs are full width with 16px text and big padding, so they're easy to tap on a phone.
  - Each radio/checkbox is a small clickable card that turns teal when it's chosen.
  - The button fills the card, and every input shows a thick teal **focus outline** when you use the Tab key.
- `public/index.html`: a new `<div class="calculator-layout">` wraps the form and the result.
- `public/js/script.js`: shorter price labels ("€40 + €15/room") so they fit on phone screens.

**Why**
Most visitors use a phone. A form that is comfortable to tap and easy to read on a small screen,
and still uses the space well on a laptop, feels professional.

**What I learned**
- **Mobile first:** write the phone layout as the normal CSS, then add `@media (min-width: …)` rules
  for bigger screens. Phones get simple one-column CSS; bigger screens get the extras.
- **CSS Grid:** `display: grid` + `grid-template-columns: 3fr 2fr` puts the form (3 parts) and the
  result (2 parts) side by side. Without columns, grid simply stacks things.
- **Breakpoints:** at 480px the choices move into 2 columns, and at 768px the form and result sit side by side.
  Tested at 375px (stacked), 768px and 1280px (side by side), with no sideways scrolling at any width.
- **`:has()`:** `.choice:has(input:checked)` styles the card when the box *inside* it is ticked.
- **`:focus-visible`** shows the outline for keyboard users without showing it on every mouse click.
- **`position: sticky`** keeps the result card in view while you scroll down the form (wide screens).
- **`font-size: 1rem` on inputs:** iPhones zoom in on inputs with text smaller than 16px.
- **`accent-color`** recolors the browser's own checkboxes and radios with a single line.
