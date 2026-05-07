import type {
  BotCatalogEntry,
  BotId,
  BotMenuPosition,
} from "../../../../../packages/shared/src/bots/manifests";

export type PlaygroundMenuBotId = BotId;

export type PlaygroundMenuItem = {
  description: string;
  displayName: string;
  id: PlaygroundMenuBotId;
  position: BotMenuPosition;
};

const POSITION_ORDER: readonly BotMenuPosition[] = [
  "top-left",
  "middle-left",
  "bottom-left",
  "top-right",
  "middle-right",
  "bottom-right",
];

export function buildMenuItems(bots: BotCatalogEntry[]): PlaygroundMenuItem[] {
  return [...bots]
    .sort(
      (left, right) =>
        POSITION_ORDER.indexOf(left.menuPosition) -
        POSITION_ORDER.indexOf(right.menuPosition),
    )
    .map((bot) => ({
      id: bot.id,
      displayName: bot.name,
      description: bot.description,
      position: bot.menuPosition,
    }));
}

export function getMenuItem(
  bots: BotCatalogEntry[],
  menuBotId: PlaygroundMenuBotId | null,
) {
  return buildMenuItems(bots).find((item) => item.id === menuBotId) ?? null;
}
