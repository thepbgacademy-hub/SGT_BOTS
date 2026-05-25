type VanishInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isVanishing?: boolean;
  placeholder?: string;
  vanishingText?: string;
};

export function VanishInput({
  value,
  onChange,
  disabled = false,
  isVanishing = false,
  placeholder = "Ask a question or describe the letter you need help with...",
  vanishingText = "",
}: VanishInputProps) {
  return (
    <div className={`vanish-input-shell${isVanishing ? " is-vanishing" : ""}`}>
      <input
        aria-label="Chat input"
        className="vanish-input-field"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {isVanishing && vanishingText ? (
        <span aria-hidden="true" className="vanish-input-ghost">
          {vanishingText}
        </span>
      ) : null}
      <span aria-hidden="true" className="vanish-input-accent" />
    </div>
  );
}
