import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll } from "vitest";

let artifactRootDir: string | undefined;

beforeAll(() => {
  artifactRootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sgt-bots-runtime-artifacts-"),
  );
  process.env.RUNTIME_ARTIFACTS_ROOT = artifactRootDir;
});

afterAll(() => {
  delete process.env.RUNTIME_ARTIFACTS_ROOT;

  if (artifactRootDir) {
    fs.rmSync(artifactRootDir, { recursive: true, force: true });
  }
});
