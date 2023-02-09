import dotenv from "dotenv";

dotenv.config();

const env = {
  certpath: process.env.CERT_PATH as string,
  keypath: process.env.KEY_PATH as string,
  host: process.env.HOST as string,
};

new Map(Object.entries(env)).forEach((value, key) => {
  if (!value) {
    throw new Error(`${key} not defined`);
  }
});

export { env };
