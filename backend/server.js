// server.js — Next.js starter for Windows App Service (IIS + iisnode)
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const dev = false; // production
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js ready on port ${port}`);
  });
});
