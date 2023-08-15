import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import fs from "fs";
import https from "https";
import http from "http";
// import rateLmiit from "express-rate-limit";
import { env } from "./env";
import WebSocket from "ws";

const app = express();

app.disable("x-powered-by");

// app.use(
//   rateLmiit({
//     windowMs: 1 * 30 * 1000,
//     max: 120,
//     standardHeaders: false,
//     legacyHeaders: false,
//   })
// );

app.use((req, res, next) => {
  const pattern = new RegExp(`^(.*\.)?${env.host.replace(/\./g, "\\.")}$`);

  if (req.method == "OPTIONS") {
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

const proxyError = (res: express.Response) => {
  return (error: Error) => {
    console.error(error);
    res.status(500).end();
  };
};
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
  ws: true,
  changeOrigin: true,
  router: (req) => {
    const port = getPort(req.headers.host);
    return `http://127.0.0.1:${port}`;
  },
});
const wsProxy = createProxyMiddleware({
  ws: true,
  changeOrigin: true,
  router: (req) => {
    const port = getPort(req.headers.host);
    return `ws://127.0.0.1:${port}${req.url}`;
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

httpServer.listen(80, () => {
  console.log("Running gateway on port 80");
});
httpsServer.listen(443, () => {
  console.log("Running gateway on port 443");
});
