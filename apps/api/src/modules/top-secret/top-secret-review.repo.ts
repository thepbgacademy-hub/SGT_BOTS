import crypto from "node:crypto";
import type { AppEnv } from "../../config/env";
import type { TopSecretFinding } from "../../../../../packages/shared/src/contracts/top-secret";
import {
  buildTopSecretKnowledgeSignal,
  type TopSecretRuntimeKnowledgeEntry,
} from "./top-secret-kb.service";

export type TopSecretReviewCandidateStatus = "pending" | "approved" | "rejected";

export type TopSecretSubmissionRow = {
  artifact_id: string;
  claims: string[];
  created_at: string;
  findings: TopSecretFinding[];
  id: string;
  knowledge_signals: Array<ReturnType<typeof buildTopSecretKnowledgeSignal>>;
  session_id: string;
  user_id: string;
};

export type TopSecretReviewCandidateRow = {
  claim: string;
  created_at: string;
  id: string;
  knowledge_signal: ReturnType<typeof buildTopSecretKnowledgeSignal>;
  matched_entry_ids: string[];
  normalized_claim: string;
  status: TopSecretReviewCandidateStatus;
  submission_id: string;
  suggested_status: "matched" | "needs_review";
  updated_at: string;
};

export type TopSecretApprovedKnowledgeEntryRow = {
  common_sense_statement: string;
  created_at: string;
  id: string;
  required_source_hints: string[];
  research_note: string;
  source_candidate_id: string | null;
  status: "approved";
  topic: "reviewed_pattern";
  trigger_phrases: string[];
  updated_at: string;
  version: number;
};

export type TopSecretReviewRepo = {
  listApprovedRuntimeEntries(): Promise<TopSecretRuntimeKnowledgeEntry[]>;
  listReviewCandidates(input?: {
    status?: TopSecretReviewCandidateStatus;
  }): Promise<TopSecretReviewCandidateRow[]>;
  promoteReviewCandidate(input: {
    candidateId: string;
    commonSenseStatement: string;
    requiredSourceHints: string[];
    researchNote: string;
    triggerPhrases: string[];
  }): Promise<TopSecretApprovedKnowledgeEntryRow>;
  recordSubmission(input: {
    artifactId: string;
    claims: string[];
    findings: TopSecretFinding[];
    sessionId: string;
    userId: string;
  }): Promise<TopSecretSubmissionRow>;
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeClaim(value: string) {
  return value.replace(/\s+/gu, " ").trim().toLowerCase();
}

function toRuntimeEntry(
  row: TopSecretApprovedKnowledgeEntryRow,
): TopSecretRuntimeKnowledgeEntry {
  return {
    commonSenseStatement: row.common_sense_statement,
    id: row.id,
    requiredSourceHints: row.required_source_hints,
    researchContextNote: {
      topic: row.topic,
      note: row.research_note,
    },
    status: "approved",
    triggerPhrases: row.trigger_phrases,
    version: row.version,
  };
}

export function createInMemoryTopSecretReviewRepo(): TopSecretReviewRepo & {
  snapshot: () => {
    approvedKnowledgeEntries: TopSecretApprovedKnowledgeEntryRow[];
    reviewCandidates: TopSecretReviewCandidateRow[];
    submissions: TopSecretSubmissionRow[];
  };
} {
  const approvedKnowledgeEntries: TopSecretApprovedKnowledgeEntryRow[] = [];
  const reviewCandidates: TopSecretReviewCandidateRow[] = [];
  const submissions: TopSecretSubmissionRow[] = [];

  return {
    async listApprovedRuntimeEntries() {
      return approvedKnowledgeEntries.map(toRuntimeEntry);
    },
    async listReviewCandidates(input) {
      return reviewCandidates.filter(
        (candidate) => !input?.status || candidate.status === input.status,
      );
    },
    async promoteReviewCandidate(input) {
      const candidate = reviewCandidates.find((row) => row.id === input.candidateId);

      if (!candidate) {
        throw new Error("top secret review candidate not found");
      }

      if (candidate.status !== "pending") {
        throw new Error("top secret review candidate is not pending");
      }

      const timestamp = nowIso();
      candidate.status = "approved";
      candidate.updated_at = timestamp;

      const entry: TopSecretApprovedKnowledgeEntryRow = {
        common_sense_statement: input.commonSenseStatement,
        created_at: timestamp,
        id: createId("tsk"),
        required_source_hints: input.requiredSourceHints,
        research_note: input.researchNote,
        source_candidate_id: candidate.id,
        status: "approved",
        topic: "reviewed_pattern",
        trigger_phrases: input.triggerPhrases,
        updated_at: timestamp,
        version: 1,
      };
      approvedKnowledgeEntries.push(entry);

      return entry;
    },
    async recordSubmission(input) {
      const timestamp = nowIso();
      const runtimeEntries = approvedKnowledgeEntries.map(toRuntimeEntry);
      const knowledgeSignals = input.claims.map((claim) =>
        buildTopSecretKnowledgeSignal(claim, runtimeEntries),
      );
      const submission: TopSecretSubmissionRow = {
        artifact_id: input.artifactId,
        claims: input.claims,
        created_at: timestamp,
        findings: input.findings,
        id: createId("tss"),
        knowledge_signals: knowledgeSignals,
        session_id: input.sessionId,
        user_id: input.userId,
      };
      submissions.push(submission);

      for (const signal of knowledgeSignals) {
        if (signal.suggestedStatus !== "needs_review") {
          continue;
        }

        reviewCandidates.push({
          claim: signal.claim,
          created_at: timestamp,
          id: createId("tsc"),
          knowledge_signal: signal,
          matched_entry_ids: signal.matchedEntryIds,
          normalized_claim: normalizeClaim(signal.claim),
          status: "pending",
          submission_id: submission.id,
          suggested_status: signal.suggestedStatus,
          updated_at: timestamp,
        });
      }

      return submission;
    },
    snapshot() {
      return {
        approvedKnowledgeEntries,
        reviewCandidates,
        submissions,
      };
    },
  };
}

function requireSupabaseEnv(env: AppEnv) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase env is required for top secret review repo");
  }

  return {
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseUrl: env.supabaseUrl,
  };
}

async function insertRow<TInput, TRow>(input: {
  env: AppEnv;
  payload: TInput;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${input.table}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      prefer: "return=representation",
    },
    body: JSON.stringify(input.payload),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase insert failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return ((await response.json()) as TRow[])[0];
}

async function selectRows<TRow>(input: {
  env: AppEnv;
  query: string;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${input.table}${input.query}`, {
    method: "GET",
    headers: {
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase select failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as TRow[];
}

async function updateRows<TInput>(input: {
  env: AppEnv;
  payload: TInput;
  query: string;
  table: string;
}) {
  const env = requireSupabaseEnv(input.env);
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${input.table}${input.query}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      prefer: "return=representation",
    },
    body: JSON.stringify(input.payload),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase update failed for ${input.table}: ${response.status} ${await response.text()}`,
    );
  }
}

export function createSupabaseTopSecretReviewRepo(env: AppEnv): TopSecretReviewRepo {
  return {
    async listApprovedRuntimeEntries() {
      const rows = await selectRows<TopSecretApprovedKnowledgeEntryRow>({
        env,
        query: "?status=eq.approved&select=*",
        table: "top_secret_approved_knowledge_entries",
      });

      return rows.map(toRuntimeEntry);
    },
    async listReviewCandidates(input) {
      const query = input?.status
        ? `?status=eq.${encodeURIComponent(input.status)}&select=*&order=created_at.desc`
        : "?select=*&order=created_at.desc";

      return selectRows<TopSecretReviewCandidateRow>({
        env,
        query,
        table: "top_secret_review_candidates",
      });
    },
    async promoteReviewCandidate(input) {
      const [candidate] = await selectRows<TopSecretReviewCandidateRow>({
        env,
        query: `?id=eq.${encodeURIComponent(input.candidateId)}&select=*`,
        table: "top_secret_review_candidates",
      });

      if (!candidate) {
        throw new Error("top secret review candidate not found");
      }

      if (candidate.status !== "pending") {
        throw new Error("top secret review candidate is not pending");
      }

      const [existingEntry] = await selectRows<TopSecretApprovedKnowledgeEntryRow>({
        env,
        query: `?source_candidate_id=eq.${encodeURIComponent(input.candidateId)}&select=*`,
        table: "top_secret_approved_knowledge_entries",
      });

      if (existingEntry) {
        throw new Error("top secret review candidate is not pending");
      }

      await updateRows({
        env,
        payload: {
          status: "approved",
          updated_at: nowIso(),
        },
        query: `?id=eq.${encodeURIComponent(input.candidateId)}`,
        table: "top_secret_review_candidates",
      });

      return insertRow<
        Omit<TopSecretApprovedKnowledgeEntryRow, "id">,
        TopSecretApprovedKnowledgeEntryRow
      >({
        env,
        payload: {
          common_sense_statement: input.commonSenseStatement,
          created_at: nowIso(),
          required_source_hints: input.requiredSourceHints,
          research_note: input.researchNote,
          source_candidate_id: candidate.id,
          status: "approved",
          topic: "reviewed_pattern",
          trigger_phrases: input.triggerPhrases,
          updated_at: nowIso(),
          version: 1,
        },
        table: "top_secret_approved_knowledge_entries",
      });
    },
    async recordSubmission(input) {
      const runtimeEntries = await this.listApprovedRuntimeEntries();
      const knowledgeSignals = input.claims.map((claim) =>
        buildTopSecretKnowledgeSignal(claim, runtimeEntries),
      );
      const submission = await insertRow<
        Omit<TopSecretSubmissionRow, "id">,
        TopSecretSubmissionRow
      >({
        env,
        payload: {
          artifact_id: input.artifactId,
          claims: input.claims,
          created_at: nowIso(),
          findings: input.findings,
          knowledge_signals: knowledgeSignals,
          session_id: input.sessionId,
          user_id: input.userId,
        },
        table: "top_secret_submissions",
      });

      for (const signal of knowledgeSignals) {
        if (signal.suggestedStatus !== "needs_review") {
          continue;
        }

        await insertRow<Omit<TopSecretReviewCandidateRow, "id">, TopSecretReviewCandidateRow>({
          env,
          payload: {
            claim: signal.claim,
            created_at: nowIso(),
            knowledge_signal: signal,
            matched_entry_ids: signal.matchedEntryIds,
            normalized_claim: normalizeClaim(signal.claim),
            status: "pending",
            submission_id: submission.id,
            suggested_status: signal.suggestedStatus,
            updated_at: nowIso(),
          },
          table: "top_secret_review_candidates",
        });
      }

      return submission;
    },
  };
}
