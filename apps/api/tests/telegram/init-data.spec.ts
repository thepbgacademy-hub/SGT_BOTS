import { describe, expect, it } from "vitest";
import {
  validateTelegramInitData,
  validateTelegramInitDataWithTokens,
} from "../../src/modules/telegram/init-data";
import {
  createSignedTelegramInitData,
  TEST_TELEGRAM_BOT_TOKEN,
} from "../../../../packages/shared/src/testing/telegram-fixtures";

const OTHER_BOT_TOKEN = "999999:some-other-bot-token";

describe("validateTelegramInitData auth_date skew", () => {
  it("accepts data slightly ahead of the server clock within tolerance", () => {
    const initData = createSignedTelegramInitData({
      authDate: String(Math.floor(Date.now() / 1000) + 30),
    });

    expect(() =>
      validateTelegramInitData(initData, TEST_TELEGRAM_BOT_TOKEN),
    ).not.toThrow();
  });

  it("rejects data dated too far in the future as future-dated, not stale", () => {
    const initData = createSignedTelegramInitData({
      authDate: String(Math.floor(Date.now() / 1000) + 120),
    });

    expect(() =>
      validateTelegramInitData(initData, TEST_TELEGRAM_BOT_TOKEN),
    ).toThrow("future-dated telegram init data");
  });

  it("still rejects old data as stale", () => {
    const initData = createSignedTelegramInitData({
      authDate: String(Math.floor(Date.now() / 1000) - 600),
    });

    expect(() =>
      validateTelegramInitData(initData, TEST_TELEGRAM_BOT_TOKEN),
    ).toThrow("stale telegram init data");
  });
});

describe("validateTelegramInitDataWithTokens age-error preservation", () => {
  it("surfaces future-dated telegram init data across multi-token retry instead of a generic invalid error", () => {
    const initData = createSignedTelegramInitData({
      authDate: String(Math.floor(Date.now() / 1000) + 120),
      botToken: TEST_TELEGRAM_BOT_TOKEN,
    });

    expect(() =>
      validateTelegramInitDataWithTokens(initData, [
        OTHER_BOT_TOKEN,
        TEST_TELEGRAM_BOT_TOKEN,
      ]),
    ).toThrow("future-dated telegram init data");
  });

  it("still surfaces stale telegram init data across multi-token retry", () => {
    const initData = createSignedTelegramInitData({
      authDate: String(Math.floor(Date.now() / 1000) - 600),
      botToken: TEST_TELEGRAM_BOT_TOKEN,
    });

    expect(() =>
      validateTelegramInitDataWithTokens(initData, [
        OTHER_BOT_TOKEN,
        TEST_TELEGRAM_BOT_TOKEN,
      ]),
    ).toThrow("stale telegram init data");
  });

  it("falls back to a generic invalid error when no candidate token's signature matches", () => {
    const initData = createSignedTelegramInitData({
      botToken: TEST_TELEGRAM_BOT_TOKEN,
    });

    expect(() =>
      validateTelegramInitDataWithTokens(initData, [OTHER_BOT_TOKEN]),
    ).toThrow("invalid telegram init data");
  });
});
