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
