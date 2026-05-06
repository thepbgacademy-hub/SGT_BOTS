import { listBotCatalog } from "../../../../../packages/shared/src/bots/manifests";

export function createBotService() {
  return {
    listCatalog() {
      return listBotCatalog();
    },
  };
}
