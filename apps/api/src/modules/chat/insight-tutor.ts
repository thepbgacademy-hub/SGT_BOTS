import type { BotPromptConfig } from "../bots/bot-prompt-config.repo";

type InsightCitation = {
  sourceId: "knowledge_base";
  title: string;
  url: string;
};

type InsightReply = {
  boundaryType?: "off_topic";
  output: string;
  citations: InsightCitation[];
};

type InsightLesson = {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  summary: string;
  simpleSummary: string;
  quizQuestion: string;
};

const INSIGHT_SOURCE: InsightCitation = {
  sourceId: "knowledge_base",
  title: "Insight Approved Academy Lessons",
  url: "sgt-bots://docs/insight/approved-academy-lessons",
};

const INSIGHT_APPROVED_LESSONS: InsightLesson[] = [
  {
    id: "missions",
    title: "Missions",
    url: "sgt-bots://docs/insight/approved-academy-lessons#missions",
    keywords: ["mission", "missions", "course", "courses"],
    summary:
      "Missions are structured learning paths where Cadets study Academy topics through source-based education, tools, discussion, and comprehension checks.",
    simpleSummary:
      "In simpler words, Missions are the Academy's structured learning courses. They help Cadets study one topic at a time, work through the material, and check whether the idea is making sense.",
    quizQuestion:
      "Quick check: in the Academy, what is a Mission meant to help a Cadet do?",
  },
  {
    id: "academy-credits",
    title: "PBG Credits",
    url: "sgt-bots://docs/insight/approved-academy-lessons#pbg-credits",
    keywords: ["credit", "credits", "pbg credits", "tool use", "paid levels"],
    summary:
      "PBG credits are Academy tool-use credits tied to supported playground or Academy tools. Paid levels may include credits, while Free/Public learners may need separate credit packs.",
    simpleSummary:
      "In simpler words, PBG credits are what help Cadets use certain Academy tools. Paid levels may include them, and Free/Public learners may need to buy credit packs separately.",
    quizQuestion:
      "Quick check: what do PBG credits help Cadets use inside the Academy tool system?",
  },
  {
    id: "academy-overview",
    title: "PBG Academy Overview",
    url: "sgt-bots://docs/insight/approved-academy-lessons#academy-overview",
    keywords: ["academy overview", "pbg academy", "pbg overview"],
    summary:
      "PBG Academy is the learning home base where Cadets study Academy material, use tools, and get directed to the right support rooms or next steps.",
    simpleSummary:
      "In simpler words, PBG Academy is the main place Cadets go to learn, use tools, and find the right next step.",
    quizQuestion:
      "Quick check: what is the main role of PBG Academy for Cadets?",
  },
];

function normalize(value: string) {
  return value.toLowerCase();
}

function findLesson(content: string) {
  const normalizedContent = normalize(content);

  return INSIGHT_APPROVED_LESSONS.find((lesson) =>
    lesson.keywords.some((keyword) => normalizedContent.includes(keyword)),
  ) ?? null;
}

function wantsSimpler(content: string) {
  return /\b(simpler|plain language|simplify|explain simply|like i'm new|like i am new)\b/i.test(
    content,
  );
}

function wantsQuiz(content: string) {
  return /\b(quiz|test me|quick check|practice question)\b/i.test(content);
}

function wantsUnsupportedExample(content: string) {
  return /\b(made[- ]?up|invent|not found in the lesson|unsupported example)\b/i.test(
    content,
  );
}

function wantsSourceBypass(content: string) {
  return /\b(without|no|don't|do not|ignore)\b.{0,32}\b(sources?|citations?|approved lessons?|approved material|lesson material)\b|\bfrom memory only\b|\bjust use (your )?(memory|training)\b/i.test(
    content,
  );
}

function applyTutorTone(output: string, promptConfig?: BotPromptConfig | null) {
  if (!promptConfig) {
    return output;
  }

  const toneText = [
    promptConfig.personaPrompt,
    ...promptConfig.toneRules,
  ].join(" ");

  if (/\bwarm\b|\bteacher\b|\btutor\b/i.test(toneText)) {
    return output.replace(/^Insight can explain/u, "I can explain");
  }

  return output;
}

export function buildInsightTutorReply(
  content: string,
  options: {
    promptConfig?: BotPromptConfig | null;
  } = {},
): InsightReply {
  if (wantsSourceBypass(content)) {
    return {
      boundaryType: "off_topic",
      output:
        "Insight can only tutor from approved Academy lessons in the playground. I can't explain a topic without approved sources, but I can use the approved lesson material when you ask about Missions, PBG credits, or the Academy overview.",
      citations: [INSIGHT_SOURCE],
    };
  }

  if (wantsUnsupportedExample(content)) {
    return {
      boundaryType: "off_topic",
      output:
        "I can't make up examples that are not in an approved Academy lesson. I can still use approved Academy lesson material to explain the idea or ask a practice question.",
      citations: [INSIGHT_SOURCE],
    };
  }

  const lesson = findLesson(content);

  if (!lesson) {
    return {
      boundaryType: "off_topic",
      output:
        options.promptConfig?.offTopicPolicy?.trim() ||
        "Insight can only tutor from approved Academy lessons in the playground. Ask about Missions, PBG credits, or the Academy overview and I can walk through it one clear step at a time.",
      citations: [INSIGHT_SOURCE],
    };
  }

  if (wantsQuiz(content)) {
    return {
      output: lesson.quizQuestion,
      citations: [{ ...INSIGHT_SOURCE, url: lesson.url }],
    };
  }

  const output = wantsSimpler(content)
    ? lesson.simpleSummary
    : `Insight can explain ${lesson.title} from the approved lesson material. ${lesson.summary}`;

  return {
    output: applyTutorTone(output, options.promptConfig),
    citations: [{ ...INSIGHT_SOURCE, url: lesson.url }],
  };
}
