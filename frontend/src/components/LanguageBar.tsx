import { LANGUAGES, type UI } from "@/lib/i18n";

interface Props {
  value: string;
  translating: boolean;
  onChange: (code: string) => void;
  ui: UI;
}

export default function LanguageBar({ value, translating, onChange, ui }: Props) {
  return (
    <div className="language-bar no-print">
      <label htmlFor="language">{ui.language}</label>
      <select id="language" value={value} disabled={translating} onChange={(event) => onChange(event.target.value)}>
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code} lang={option.code}>
            {option.name}
          </option>
        ))}
      </select>
      {translating && (
        <span className="hint" role="status">
          {ui.translating}
        </span>
      )}
    </div>
  );
}
