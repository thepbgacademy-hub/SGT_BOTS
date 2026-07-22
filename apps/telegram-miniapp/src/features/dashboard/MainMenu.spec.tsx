import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { MainMenu } from "./MainMenu";

const BOTS = [
  {
    id: "document_wizard",
    name: "Cursive",
    description: "Turns notes and source files into polished structured outputs.",
    menuPosition: "top-left",
    capabilities: {
      chat: true,
      citations: false,
      html_report: true,
      pdf_upload: true,
      rag_query: false,
      structured_form: true,
    },
  },
  {
    id: "concierge_general_academy_KB",
    name: "Rori",
    description: "Routes knowledge-base questions across the academy domain.",
    menuPosition: "middle-right",
    capabilities: {
      chat: true,
      citations: true,
      html_report: false,
      pdf_upload: false,
      rag_query: true,
      structured_form: false,
    },
  },
] as unknown as BotCatalogEntry[];

describe("MainMenu", () => {
  it("shows each bot's description before selection, reachable without hovering", () => {
    const markup = renderToStaticMarkup(
      createElement(MainMenu, {
        bots: BOTS,
        onSelect: () => undefined,
        preferredName: "Ada",
      }),
    );

    expect(markup).toContain("menu-specialist-guide");
    expect(markup).toContain(
      "Turns notes and source files into polished structured outputs.",
    );
    expect(markup).toContain(
      "Routes knowledge-base questions across the academy domain.",
    );
  });

  it("includes the description in each hex button's accessible name", () => {
    const markup = renderToStaticMarkup(
      createElement(MainMenu, {
        bots: BOTS,
        onSelect: () => undefined,
        preferredName: "Ada",
      }),
    );

    expect(markup).toContain(
      'aria-label="Open Cursive: Turns notes and source files into polished structured outputs."',
    );
  });
});
