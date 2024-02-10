import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";
import https from "https";
import http from "http";
import { env } from "./env";

const app = express();

app.disable("x-powered-by");
app.set("etag", false);

app.use((req, res, next) => {
  const pattern = new RegExp(
    `(?:^(.*\.)?${env.host.replace(
      /\./g,
      "\\."
    )}$|^http\\:\\/\\/localhost\\:3000$)`
  );

  if (req.method == "OPTIONS") {
    if (allowedOrigins.includes(req.headers.origin))
      res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", env.headers);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    res.status(200).json({});
    return;
  }

  if (req.protocol === "http" || !pattern.test(req.hostname)) {
    res.redirect(`https://${env.host}${req.originalUrl}`);
  } else {
    res.header(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );

    if (pattern.test(req.headers.origin || "")) {
      if (allowedOrigins.includes(req.headers.origin))
        res.header("Access-Control-Allow-Origin", req.headers.origin);
      res.header("Access-Control-Allow-Headers", env.headers);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, PATCH, DELETE"
      );
      res.header("Access-Control-Allow-Credentials", "true");
    }
    next();
  }
});

const binds = JSON.parse(fs.readFileSync("src/bind.json").toString());
const allowedOrigins = JSON.parse(
  fs.readFileSync("src/allowedOrigins.json").toString()
);

const getPort = (host: string | undefined) => {
  let port;
  if (host === env.host) {
    port = binds["index"];
  } else {
    const splittedHostname = host?.split(".");

    if (splittedHostname && splittedHostname.length > 0) {
      port = binds[splittedHostname[0]];
    }
  }
  return port;
};
const proxy = createProxyMiddleware({
  changeOrigin: false,
  timeout: 6000,
  proxyTimeout: 6000,
  router: (req) => {
    const port = getPort(req.headers.host);
    return `http://127.0.0.1:${port}`;
  },
  onError: (err) => {
    console.error(err);
  },
});
const wsProxy = createProxyMiddleware({
  ws: true,
  changeOrigin: false,
  timeout: 3 * 60 * 1000,
  proxyTimeout: 3 * 60 * 1000,
  router: (req) => {
    const port = getPort(req.headers.host);
    return `ws://127.0.0.1:${port}${req.url}`;
  },
  onError: (err) => {
    console.error(err);
  },
});

app.use(proxy);

const httpServer = http.createServer(app);
const httpsServer = https.createServer(
  {
    key: fs.readFileSync(env.keypath).toString(),
    cert: fs.readFileSync(env.certpath).toString(),
  },
  app
);
const wsProxyRouter = wsProxy.upgrade;
if (!wsProxyRouter) {
  throw new Error("wsProxyRouter is undefined.");
}
httpServer.on("upgrade", wsProxyRouter);
httpsServer.on("upgrade", wsProxyRouter);

httpServer.on("error", (err) => {
  console.log("HTTP error", err);
});
httpsServer.on("error", (err) => {
  console.log("HTTPS error", err);
});

httpServer.listen(80, () => {
  console.log("Running gateway on port 80");
});
httpsServer.listen(443, () => {
  console.log("Running gateway on port 443");
});
