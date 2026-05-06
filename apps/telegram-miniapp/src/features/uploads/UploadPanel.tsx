import { useRef, type ChangeEvent } from "react";

type UploadPanelProps = {
  disabled?: boolean;
  file: File | null;
  onFileSelect: (file: File | null) => void;
};

export function UploadPanel({
  disabled = false,
  file,
  onFileSelect,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFileSelect(event.target.files?.[0] ?? null);
  }

  return (
    <section>
      <p>
        <button
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Upload PDF
        </button>
      </p>
      <input
        accept="application/pdf,.pdf"
        disabled={disabled}
        onChange={handleChange}
        ref={inputRef}
        style={{ display: "none" }}
        type="file"
      />
      <p>{file ? `Selected file: ${file.name}` : "No PDF selected yet."}</p>
    </section>
  );
}
