import type { ArtifactListItem } from "../artifacts/ArtifactList";
import { getBotWorkspacePanel } from "./bot-workspace-panels";
import type { PlaygroundMenuBotId } from "./menu-config";

type BotSupportPanelProps = {
  artifacts: ArtifactListItem[];
  botId: PlaygroundMenuBotId;
};

export function BotSupportPanel({
  artifacts,
  botId,
}: BotSupportPanelProps) {
  const panel = getBotWorkspacePanel(botId);
  const isCursiveReportPanel = botId === "document_wizard";
  const showCursiveReport = isCursiveReportPanel && artifacts.length > 0;

  return (
    <section className="panel artifact-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">
            {showCursiveReport
              ? "Generated Output"
              : isCursiveReportPanel
                ? "Instructions"
                : panel.supportLabel}
          </p>
          <h2>
            {showCursiveReport
              ? "Report"
              : isCursiveReportPanel
                ? "3 Easy Steps:"
                : "Workspace"}
          </h2>
        </div>
      </header>
      {showCursiveReport ? null : (
        <div className="support-panel-copy">
          {isCursiveReportPanel ? null : (
            <p className="support-panel-title">{panel.supportTitle}</p>
          )}
          <ul className="support-panel-list">
            {panel.supportItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {artifacts.length ? (
        <ul className="artifact-list">
          {artifacts.map((artifact) => (
            <li className="artifact-card" key={artifact.id}>
              {showCursiveReport ? (
                <p className="artifact-label">Report name</p>
              ) : null}
              <p className="artifact-title">{artifact.fileName}</p>
              <p className="artifact-meta">
                {showCursiveReport
                  ? artifact.status
                  : `${artifact.botName} - ${artifact.status}`}
              </p>
              {showCursiveReport ? null : (
                <p className="artifact-source">Source: {artifact.originalFilename}</p>
              )}
              {artifact.failureReason ? (
                <p className="alert-banner">{artifact.failureReason}</p>
              ) : null}
              {artifact.downloadUrl ? (
                <p className="artifact-actions">
                  <a
                    className="secondary-button artifact-download-button"
                    href={artifact.downloadUrl}
                  >
                    Download PDF
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        isCursiveReportPanel ? null : (
          <p className="muted-copy">No saved outputs in this workspace yet.</p>
        )
      )}
    </section>
  );
}
