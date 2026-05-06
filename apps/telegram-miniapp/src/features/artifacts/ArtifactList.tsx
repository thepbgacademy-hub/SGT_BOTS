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
    <section>
      <h2>Artifacts</h2>
      {artifacts.length ? (
        <ul>
          {artifacts.map((artifact) => (
            <li key={artifact.id}>
              <p>{artifact.fileName}</p>
              <p>
                {artifact.botName} - {artifact.status}
              </p>
              <p>Source: {artifact.originalFilename}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No artifacts queued yet.</p>
      )}
    </section>
  );
}
