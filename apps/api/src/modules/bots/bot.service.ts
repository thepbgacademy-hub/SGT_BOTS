import {
  getBotManifest,
  type BotCatalogEntry,
} from "../../../../../packages/shared/src/bots/manifests";
import type { BotRegistryRepo } from "./bot-registry.repo";

export function isStructuredBot(botId: string) {
  return getBotManifest(botId)?.capabilities.structured_form ?? false;
}

export function createBotService(input: { registryRepo: BotRegistryRepo }) {
  return {
    async listCatalog(): Promise<BotCatalogEntry[]> {
      const rows = await input.registryRepo.listVisibleBots();

      return rows.flatMap((row) => {
        const manifest = getBotManifest(row.botId);

        if (!manifest || !manifest.active || !row.visible || row.runtimeStatus !== "active") {
          return [];
        }

        return [
          {
            id: manifest.id,
            name: row.displayName,
            description: row.tagline,
            menuPosition: row.menuPosition,
            capabilities: manifest.capabilities,
            sourceBinding: manifest.sourceBinding,
          },
        ];
      });
    },
  };
}
