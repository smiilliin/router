import express from "express";
import httpproxy from "http-proxy";
import fs from "fs";
import https from "https";
import http from "http";
import rateLmiit from "express-rate-limit";
import { env } from "./env";

const app = express();

app.disable("x-powered-by");

app.use(
  rateLmiit({
    windowMs: 1 * 30 * 1000,
    max: 10,
    standardHeaders: false,
    legacyHeaders: false,
  })
);

app.use((req, res, next) => {
  if (req.protocol === "http" || !req.hostname.endsWith(env.host)) {
    res.redirect(`https://${env.host}${req.originalUrl}`);
  } else {
    res.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    next();
  }
});

const binds = JSON.parse(fs.readFileSync("src/bind.json").toString());

const httpProxy = httpproxy.createProxyServer();

const proxyError = (res: express.Response) => {
  return (error: Error) => {
    console.error(error);
    res.status(500).end();
  };
};

app.use((req, res) => {
  let port;
  if (req.hostname === env.host) {
    port = binds["index"];
    return httpProxy.web(req, res, { target: `http://127.0.0.1:${port}`, changeOrigin: true }, proxyError(res));
  }
  port = binds[req.hostname.split(".")[0]];

  if (port) {
    return httpProxy.web(req, res, { target: `http://127.0.0.1:${port}`, changeOrigin: true }, proxyError(res));
  }

  res.status(404).end();
});

https
  .createServer(
    {
      key: fs.readFileSync(env.keypath).toString(),
      cert: fs.readFileSync(env.certpath).toString(),
    },
    app
  )
  .listen(443, () => {
    console.log("Running gateway on port 443");
  });
http.createServer(app).listen(80, () => {
  console.log("Running gateway on port 80");
});
