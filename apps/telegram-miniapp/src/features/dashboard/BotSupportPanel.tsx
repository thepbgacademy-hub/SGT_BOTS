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
  const isReportPanel = botId === "document_wizard" || botId === "verifier";
  const showReport = isReportPanel && artifacts.length > 0;
  const isTopSecret = botId === "verifier";

  return (
    <section className="panel artifact-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">
            {showReport
              ? isTopSecret
                ? "Your Report"
                : "Generated Output"
              : isReportPanel
                ? "Instructions"
                : panel.supportLabel}
          </p>
          <h2>
            {showReport
              ? "Report"
              : isReportPanel
                ? isTopSecret
                  ? "Here is the plan:"
                  : "3 Easy Steps:"
                : "Workspace"}
          </h2>
        </div>
      </header>
      {showReport ? null : (
        <div className="support-panel-copy">
          {isReportPanel ? null : (
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
              {showReport ? (
                <p className="artifact-label">
                  {isTopSecret ? "Ready for you" : "Report name"}
                </p>
              ) : null}
              <p className="artifact-title">{artifact.fileName}</p>
              <p className="artifact-meta">
                {showReport
                  ? artifact.status
                  : `${artifact.botName} - ${artifact.status}`}
              </p>
              {showReport ? null : (
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
        isReportPanel ? null : (
          <p className="muted-copy">No saved outputs in this workspace yet.</p>
        )
      )}
    </section>
  );
}
