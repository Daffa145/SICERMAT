// CERMAT Dedicated Standalone Server (Production)
// Pure Node HTTP server - robust, persistent, zero terminal dependency

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");

const dev = false;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

console.log(`[${new Date().toISOString()}] Initializing CERMAT server on port ${port}...`);

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    server.once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    });

    server.listen(port, hostname, () => {
      console.log(`[${new Date().toISOString()}] CERMAT Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to prepare Next.js app:", err);
    process.exit(1);
  });
