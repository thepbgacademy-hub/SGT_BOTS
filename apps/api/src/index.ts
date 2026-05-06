import { buildApp } from "./app";
import { readEnv } from "./config/env";

const env = readEnv();
const app = await buildApp({ env });

await app.listen({
  host: "127.0.0.1",
  port: env.appPort,
});
