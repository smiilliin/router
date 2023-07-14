import express from "express";
import httpproxy from "http-proxy";
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
  if (req.protocol === "http" || !req.hostname?.endsWith(env.host)) {
    res.redirect(`https://${env.host}${req.originalUrl}`);
  } else {
    res.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    next();
  }
});

const binds = JSON.parse(fs.readFileSync("src/bind.json").toString());

const httpProxy = httpproxy.createProxyServer({ changeOrigin: true });

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

app.use((req, res) => {
  const port = getPort(req.headers.host);
  if (port) return httpProxy.web(req, res, { target: `http://127.0.0.1:${port}` }, proxyError(res));

  res.status(404).end();
});

const httpsServer = https
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

const wss = new WebSocket.Server({ server: httpsServer });

wss.on("connection", async (ws, req) => {
  const port = getPort(req.headers.host);

  const wsProxy = new WebSocket(`ws://127.0.0.1:${port}${req.url}`);

  try {
    await new Promise<void>((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error("timeout"));
      }, 5000);

      wsProxy.once("open", () => {
        clearTimeout(connectTimeout);
        resolve();
      });
      wsProxy.once("error", (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(error);
    ws.close();
    return;
  }

  ws.on("message", (message) => {
    wsProxy.send(message, { binary: false });
  });
  wsProxy.on("message", (message) => {
    ws.send(message, { binary: false });
  });

  ws.on("error", (error: Error) => {
    console.error(error);
    wsProxy.close();
    ws.close();
  });
  wsProxy.on("error", (error: Error) => {
    console.error(error);
    wsProxy.close();
    ws.close();
  });
  wsProxy.on("close", () => {
    ws.close();
  });
  ws.on("close", () => {
    wsProxy.close();
  });
});

http.createServer(app).listen(80, () => {
  console.log("Running gateway on port 80");
});
