import { buildApp } from "./app";
import { readEnv } from "./config/env";

const env = readEnv();
const app = await buildApp({ env });

await app.listen({
  host: "0.0.0.0",
  port: env.appPort,
});
