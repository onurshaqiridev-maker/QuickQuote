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
