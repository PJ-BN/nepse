const http = require("http");
const { execFile } = require("child_process");

const PORT = process.env.AGY_BRIDGE_PORT || 4141;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && req.url === "/prompt") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const { prompt } = JSON.parse(body);
        if (!prompt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Missing prompt" }));
        }

        execFile(
          "agy",
          ["--dangerously-skip-permissions", `--print=${prompt}`],
          { timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: error.message, stderr }));
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ output: stdout }));
          }
        );
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON format" }));
      }
    });
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", engine: "agy" }));
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`AGY Bridge listening on http://0.0.0.0:${PORT}`);
});
