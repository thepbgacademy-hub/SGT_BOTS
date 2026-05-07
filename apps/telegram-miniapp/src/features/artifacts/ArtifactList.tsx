export type ArtifactListItem = {
  id: string;
  artifactType: "pdf";
  botName: string;
  fileName: string;
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
          <h2>Artifacts</h2>
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-copy">No artifacts queued yet.</p>
      )}
    </section>
  );
}
