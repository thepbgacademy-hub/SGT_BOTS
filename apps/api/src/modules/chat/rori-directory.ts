export type RoriDirectoryLinkStatus = "configured" | "not_configured";

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
    "Admin-maintained Rori directory for Academy workshops, event status, and Telegram room routing. Missing links must be named as not configured instead of guessed.",
};

export const RORI_TELEGRAM_ROOM_DIRECTORY: RoriTelegramRoomRecord[] = [
  {
    id: "enrollment-help",
    label: "Enrollment Help",
    purpose: "Questions about joining the PBG Academy, membership access, and first steps.",
    keywords: ["enroll", "enrollment", "join", "membership", "academy", "sign up", "signup"],
    linkStatus: "not_configured",
  },
  {
    id: "workshop-updates",
    label: "Workshop Updates",
    purpose: "Announcements, schedules, and next steps for PBG Academy workshops and events.",
    keywords: ["workshop", "event", "class", "schedule", "register", "registration"],
    linkStatus: "not_configured",
  },
  {
    id: "technical-access-help",
    label: "Technical Access Help",
    purpose: "Telegram access, room navigation, login trouble, provider keys, and app issues.",
    keywords: [
      "access",
      "login",
      "trouble",
      "technical",
      "provider",
      "api key",
      "cannot find",
      "can't find",
    ],
    linkStatus: "not_configured",
  },
  {
    id: "tool-support",
    label: "Tool Support",
    purpose: "Help choosing or using Playground tools such as Cursive, Top Secret, Condor, and ShAzZaM.",
    keywords: ["tool", "support", "cursive", "top secret", "condor", "shazzam", "bot", "playground"],
    linkStatus: "not_configured",
  },
];

export const RORI_WORKSHOP_DIRECTORY: RoriWorkshopRecord[] = [];

function keywordScore(content: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    return content.includes(keyword) ? score + 1 : score;
  }, 0);
}

export function findTelegramRoomRecord(content: string) {
  const scoredRooms = RORI_TELEGRAM_ROOM_DIRECTORY.map((room) => ({
    room,
    score: keywordScore(content, room.keywords),
  })).filter(({ score }) => score > 0);

  scoredRooms.sort((left, right) => right.score - left.score);

  return scoredRooms[0]?.room ?? null;
}

export function formatTelegramRoomList() {
  return RORI_TELEGRAM_ROOM_DIRECTORY.map((room) => {
    return `${room.label}: ${room.purpose}`;
  }).join(" ");
}

export function formatTelegramRoomLinkStatus(room: RoriTelegramRoomRecord) {
  if (room.linkStatus === "configured" && room.inviteUrl) {
    return `Use the configured invite link for ${room.label}: ${room.inviteUrl}`;
  }

  return `The live invite link is not configured for ${room.label} yet.`;
}

export function formatWorkshopDirectorySummary() {
  if (RORI_WORKSHOP_DIRECTORY.length === 0) {
    return "No upcoming PBG Academy workshops or events are configured in this playground build. Please ask an Academy admin for the current schedule or registration path.";
  }

  return RORI_WORKSHOP_DIRECTORY.map((workshop) => {
    const registration =
      workshop.registrationStatus === "configured" && workshop.registrationUrl
        ? `Registration: ${workshop.registrationUrl}`
        : "Registration link is not configured yet.";

    return `${workshop.label}: ${workshop.summary} Timing: ${workshop.timing}. ${registration}`;
  }).join(" ");
}
