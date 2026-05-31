export type RoriDirectoryLinkStatus = "configured" | "not_configured" | "closed";

export type RoriDirectorySource = {
  id: string;
  title: string;
  url: string;
  summary: string;
};

export type RoriTelegramRoomRecord = {
  id: string;
  label: string;
  purpose: string;
  keywords: string[];
  linkStatus: RoriDirectoryLinkStatus;
  inviteUrl?: string;
};

export type RoriWorkshopRecord = {
  id: string;
  label: string;
  summary: string;
  timing: string;
  keywords: string[];
  registrationStatus: RoriDirectoryLinkStatus;
  registrationUrl?: string;
};

export const RORI_DIRECTORY_SOURCE: RoriDirectorySource = {
  id: "rori-academy-directory",
  title: "Rori Academy Directory Source Pack",
  url: "sgt-bots://docs/rori-academy-directory-source-pack#academy-directory",
  summary:
    "Admin-maintained Rori directory for Academy workshops, event status, and Telegram room routing. If a live link is not available in the playground, Rori should say so plainly instead of guessing.",
};

export const RORI_TELEGRAM_ROOM_DIRECTORY: RoriTelegramRoomRecord[] = [
  {
    id: "rori-dm",
    label: "Rori DM",
    purpose: "General Academy questions, pricing, enrollment direction, Missions, disclaimers, and first-step guidance through the concierge bot.",
    keywords: [
      "rori",
      "concierge",
      "academy help",
      "pricing",
      "enrollment",
      "missions",
      "general questions",
      "support",
    ],
    linkStatus: "not_configured",
  },
  {
    id: "lobby-dm-to-staff",
    label: "Lobby DM to staff",
    purpose: "Human review for payment problems, upgrade questions, leave-of-absence requests, account-specific issues, conflicts, and most troubleshooting concerns.",
    keywords: [
      "lobby",
      "staff",
      "human admin",
      "payment issue",
      "upgrade",
      "leave of absence",
      "troubleshooting",
      "account issue",
      "access",
      "login",
      "trouble",
      "technical",
      "cannot find",
      "can't find",
      "provider",
      "api key",
      "conflict",
    ],
    linkStatus: "not_configured",
  },
];

export const RORI_WORKSHOP_DIRECTORY: RoriWorkshopRecord[] = [];

export type RoriAcademyDirectory = {
  telegramRooms: RoriTelegramRoomRecord[];
  workshops: RoriWorkshopRecord[];
};

export const FALLBACK_RORI_ACADEMY_DIRECTORY: RoriAcademyDirectory = {
  telegramRooms: RORI_TELEGRAM_ROOM_DIRECTORY,
  workshops: RORI_WORKSHOP_DIRECTORY,
};

function keywordScore(content: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    return content.includes(keyword) ? score + 1 : score;
  }, 0);
}

export function findTelegramRoomRecord(
  content: string,
  rooms: RoriTelegramRoomRecord[] = RORI_TELEGRAM_ROOM_DIRECTORY,
) {
  const scoredRooms = rooms.map((room) => ({
    room,
    score: keywordScore(content, room.keywords),
  })).filter(({ score }) => score > 0);

  scoredRooms.sort((left, right) => right.score - left.score);

  return scoredRooms[0]?.room ?? null;
}

export function formatTelegramRoomList(
  rooms: RoriTelegramRoomRecord[] = RORI_TELEGRAM_ROOM_DIRECTORY,
) {
  return rooms.map((room) => {
    const linkStatus = formatTelegramRoomLinkStatus(room);

    return `${room.label}: ${room.purpose} ${linkStatus}`;
  }).join(" ");
}

export function formatTelegramRoomLinkStatus(room: RoriTelegramRoomRecord) {
  if (room.linkStatus === "configured" && room.inviteUrl) {
    return `Here is the live invite link for ${room.label}: ${room.inviteUrl}`;
  }

  return `I can't open the live invite for ${room.label} in the playground yet, but I can still point you to the right room.`;
}

export function formatWorkshopDirectorySummary(
  workshops: RoriWorkshopRecord[] = RORI_WORKSHOP_DIRECTORY,
) {
  if (workshops.length === 0) {
    return "I don't have a live workshop or event list inside the playground yet. An Academy admin can give you the current schedule and the right registration links.";
  }

  return workshops.map((workshop) => {
    const registration =
      workshop.registrationStatus === "configured" && workshop.registrationUrl
        ? `Registration link: ${workshop.registrationUrl}`
        : workshop.registrationStatus === "closed"
          ? "Registration is closed."
          : "I can't open the registration link in the playground yet, but an Academy admin or Ambassador can share it.";

    return `${workshop.label}: ${workshop.summary} Timing: ${workshop.timing}. ${registration}`;
  }).join(" ");
}
