import express from "express";
import httpproxy from "http-proxy";
import fs from "fs";
import dotenv from "dotenv";
import https from "https";
import http from "http";
import rateLmiit from "express-rate-limit";

dotenv.config();

const app = express();

app.use(
  rateLmiit({
    windowMs: 1 * 30 * 1000,
    max: 10,
    standardHeaders: false,
    legacyHeaders: false,
  })
);

app.use((req, res, next) => {
  const splittedHost = req.hostname.split(".");
  const splittedHostLength = splittedHost.length;

  if (
    req.protocol === "http" ||
    splittedHostLength < 2 ||
    `${splittedHost[splittedHostLength - 2]}.${splittedHost[splittedHostLength - 1]}` !== process.env["HOST"]
  ) {
    res.redirect(`https://${process.env["HOST"]}${req.originalUrl}`);
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
  const splittedHost: Array<string> = req.hostname.split(".");

  let port;
  if (splittedHost.length < 3) {
    port = binds["index"];
    return httpProxy.web(req, res, { target: `http://localhost:${port}`, changeOrigin: true }, proxyError(res));
  }
  port = binds[splittedHost[0]];

  if (port) {
    return httpProxy.web(req, res, { target: `http://localhost:${port}`, changeOrigin: true }, proxyError(res));
  }

  res.status(404).end();
});

https
  .createServer(
    {
      key: fs.readFileSync(process.env["KEY_PATH"] as string).toString(),
      cert: fs.readFileSync(process.env["CERT_PATH"] as string).toString(),
    },
    app
  )
  .listen(443, () => {
    console.log("Running gateway on port 443");
  });
http.createServer(app).listen(80, () => {
  console.log("Running gateway on port 80");
});
