import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";

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
