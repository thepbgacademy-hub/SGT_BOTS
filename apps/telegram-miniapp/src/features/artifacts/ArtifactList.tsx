export type ArtifactListItem = {
  id: string;
  artifactType: "pdf";
  botId?: string;
  botName: string;
  createdAt?: string;
  downloadUrl?: string | null;
  fileName: string;
  failureReason?: string | null;
  generatedAt?: string;
  status: "queued" | "ready" | "failed";
  originalFilename: string;
};

type ArtifactListProps = {
  artifacts: ArtifactListItem[];
};

export function ArtifactList({ artifacts }: ArtifactListProps) {
  return (
    <section className="panel artifact-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Output</p>
          <h2>Reports</h2>
        </div>
      </header>
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
        <p className="muted-copy">No reports queued yet.</p>
      )}
    </section>
  );
}
