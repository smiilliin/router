import express from "express";
import httpproxy from "http-proxy";
import fs from "fs";
import dotenv from "dotenv";
import https from "https";
import http from "http";

dotenv.config();

const app = express();

const httpProxy = httpproxy.createProxyServer();

const error500 = (res: express.Response) => {
  return () => {
    res.status(500).send(fs.readFileSync("src/error500.html").toString());
  };
};
const error404 = (res: express.Response) => {
  return () => {
    res.status(404).send(fs.readFileSync("src/error404.html").toString());
  };
};

const bind = (name: string, port: number) => {
  app.use(`/${name}`, (req, res) => {
    httpProxy.web(req, res, { target: `http://localhost:${port}` }, error500(res));
  });
};
const bindIndex = (port: number) => {
  app.get(`/`, (req, res) => {
    httpProxy.web(req, res, { target: `http://localhost:${port}` }, error500(res));
  });
};

const binds = JSON.parse(fs.readFileSync("src/bind.json").toString());

Object.keys(binds).forEach((name: string) => {
  const port = binds[name] as number;

  console.log(`${name} ${port}`);
  if (name !== "index") {
    bind(name, port);
  } else {
    bindIndex(port);
  }
});

app.get("*", (req, res) => {
  error404(res)();
});

if (process.env["TYPE"] == "https") {
  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(process.env["KEY_PATH"] as string).toString(),
      cert: fs.readFileSync(process.env["CERT_PATH"] as string).toString(),
    },
    app
  );

  httpsServer.listen(443, () => {
    console.log("Running gateway on port 443");
  });
} else if (process.env["TYPE"] == "http") {
  const httpServer = http.createServer(app);
  httpServer.listen(80, () => {
    console.log("Running gateway on port 80");
  });
}
