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

  return (
    <section className="panel artifact-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">{panel.supportLabel}</p>
          <h2>Workspace</h2>
        </div>
      </header>
      <div className="support-panel-copy">
        <p className="support-panel-title">{panel.supportTitle}</p>
        <ul className="support-panel-list">
          {panel.supportItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {artifacts.length ? (
        <ul className="artifact-list">
          {artifacts.map((artifact) => (
            <li className="artifact-card" key={artifact.id}>
              <p className="artifact-title">{artifact.fileName}</p>
              <p className="artifact-meta">
                {artifact.botName} - {artifact.status}
              </p>
              <p className="artifact-source">Source: {artifact.originalFilename}</p>
              {artifact.failureReason ? (
                <p className="alert-banner">{artifact.failureReason}</p>
              ) : null}
              {artifact.downloadUrl ? (
                <p className="artifact-actions">
                  <a className="secondary-button" href={artifact.downloadUrl}>
                    Download PDF
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-copy">No saved outputs in this workspace yet.</p>
      )}
    </section>
  );
}
