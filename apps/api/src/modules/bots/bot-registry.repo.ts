import type { AppEnv } from "../../config/env";
import {
  BOT_MANIFESTS,
  type BotId,
  type BotMenuPosition,
} from "../../../../../packages/shared/src/bots/manifests";

type SupabaseMenuPosition =
  | "top_left"
  | "middle_left"
  | "bottom_left"
  | "top_right"
  | "middle_right"
  | "bottom_right";

export type BotRegistryRow = {
  botId: BotId;
  displayName: string;
  tagline: string;
  menuPosition: BotMenuPosition;
  runtimeStatus: "active" | "coming_soon" | "disabled";
  visible: boolean;
};

export type BotRegistryRepo = {
  listVisibleBots(): Promise<BotRegistryRow[]>;
};

function toBotMenuPosition(position: SupabaseMenuPosition): BotMenuPosition {
  return position.replace("_", "-") as BotMenuPosition;
}

function buildManifestRegistryRows(): BotRegistryRow[] {
  return BOT_MANIFESTS.filter((bot) => bot.active).map((bot) => ({
    botId: bot.id,
    displayName: bot.name,
    tagline: bot.description,
    menuPosition: bot.menuPosition,
    runtimeStatus: "active",
    visible: true,
  }));
}

export function createInMemoryBotRegistryRepo(): BotRegistryRepo {
  const rows = buildManifestRegistryRows();

  return {
    async listVisibleBots() {
      return rows;
    },
  };
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for the bot registry repo");
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
  };
}

type SupabaseBotRegistryRow = {
  bot_id: BotId;
  display_name: string;
  tagline: string;
  menu_position: SupabaseMenuPosition;
  runtime_status: "active" | "coming_soon" | "disabled";
  visible: boolean;
};

export function createSupabaseBotRegistryRepo(env: AppEnv): BotRegistryRepo {
  return {
    async listVisibleBots() {
      const supabaseEnv = requireSupabaseEnv(env);
      const response = await fetch(
        `${supabaseEnv.supabaseUrl}/rest/v1/playground_bot_registry?select=bot_id,display_name,tagline,menu_position,runtime_status,visible&visible=is.true&runtime_status=eq.active&order=launch_order.asc`,
        {
          method: "GET",
          headers: {
            apikey: supabaseEnv.supabaseServiceRoleKey,
            authorization: `Bearer ${supabaseEnv.supabaseServiceRoleKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Supabase select failed for playground_bot_registry: ${response.status} ${await response.text()}`,
        );
      }

      const rows = (await response.json()) as SupabaseBotRegistryRow[];

      return rows.map((row) => ({
        botId: row.bot_id,
        displayName: row.display_name,
        tagline: row.tagline,
        menuPosition: toBotMenuPosition(row.menu_position),
        runtimeStatus: row.runtime_status,
        visible: row.visible,
      }));
    },
  };
}
