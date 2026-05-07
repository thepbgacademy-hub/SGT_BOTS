import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import {
  buildMenuItems,
  type PlaygroundMenuBotId,
} from "./menu-config";

type MainMenuProps = {
  bots: BotCatalogEntry[];
  onSelect: (botId: PlaygroundMenuBotId) => void;
  preferredName: string;
};

export function MainMenu({
  bots,
  onSelect,
  preferredName,
}: MainMenuProps) {
  const menuItems = buildMenuItems(bots);

  return (
    <section className="main-menu-shell panel">
      <div className="main-menu-hero">
        <div>
          <p className="eyebrow">Bot Launch Menu</p>
          <h2>{preferredName}, choose a specialist</h2>
          <p className="panel-description">
            Tap a hex to launch that assistant inside the secure playground
            workspace.
          </p>
        </div>
      </div>
      <div className="menu-artboard">
        <img
          alt="Playground bot selection menu"
          className="menu-artboard-image"
          src="/images/main-menu.png"
        />
        {menuItems.map((item) => (
          <button
            className={`hex-menu-button hex-menu-button--${item.position}`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="hex-menu-button__name">{item.displayName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
