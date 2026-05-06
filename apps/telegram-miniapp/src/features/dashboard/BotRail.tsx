type BotCatalogEntry = {
  id: "document_wizard" | "kb_concierge";
  name: string;
  description: string;
  capabilities: {
    chat: boolean;
    citations: boolean;
    html_report: boolean;
    pdf_upload: boolean;
    rag_query: boolean;
    structured_form: boolean;
  };
  sourceBinding: "none" | "knowledge_base";
};

type BotRailProps = {
  bots: BotCatalogEntry[];
  selectedBotId: string | null;
  onSelect: (botId: BotCatalogEntry["id"]) => void;
};

export function BotRail({ bots, selectedBotId, onSelect }: BotRailProps) {
  return (
    <aside>
      <h2>Bots</h2>
      <ul>
        {bots.map((bot) => (
          <li key={bot.id}>
            <button
              aria-pressed={selectedBotId === bot.id}
              onClick={() => onSelect(bot.id)}
              type="button"
            >
              {bot.name}
            </button>
            <p>{bot.description}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
