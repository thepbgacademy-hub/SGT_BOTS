import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";

type BotRailProps = {
  bots: BotCatalogEntry[];
  selectedBotId: string | null;
  onSelect: (botId: BotCatalogEntry["id"]) => void;
};

export function BotRail({ bots, selectedBotId, onSelect }: BotRailProps) {
  return (
    <aside className="panel bot-rail">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Bot Rail</p>
          <h2>Bots</h2>
        </div>
      </header>
      <ul className="bot-list">
        {bots.map((bot) => (
          <li key={bot.id}>
            <button
              aria-pressed={selectedBotId === bot.id}
              className={selectedBotId === bot.id ? "bot-card is-active" : "bot-card"}
              onClick={() => onSelect(bot.id)}
              type="button"
            >
              <span className="bot-card-title">{bot.name}</span>
              <span className="bot-card-copy">{bot.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
