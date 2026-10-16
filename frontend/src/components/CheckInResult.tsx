import { missedMeds, urgentFindings, type CheckIn } from "@/lib/checkin";
import { EN, fill, type UI } from "@/lib/i18n";
import { ACTION_TONE, doNow } from "@/lib/labels";
import type { CarePlan } from "@/lib/types";

// What to do now comes from the plan's checked actions (instructions plus the
// red-flag rules), never from the model.

interface Props {
  plan: CarePlan;
  checkIn: CheckIn;
  onEdit: () => void;
  ui?: UI;
}

export default function CheckInResult({ plan, checkIn, onEdit, ui = EN }: Props) {
  const findings = urgentFindings(plan, checkIn);
  const missed = missedMeds(checkIn);

  return (
    <div className="checkin-result">
      {findings.map(({ action, signs }) => (
        <div key={action} className={`warning warning-${ACTION_TONE[action]}`} role="alert">
          <h3>{doNow(action, ui)}</h3>
          <p>{fill(ui.youHave, { signs: signs.map((sign) => sign.sign.toLowerCase()).join(", ") })}</p>
        </div>
      ))}

      {missed.length > 0 && <p className="notice">{fill(ui.missedNotice, { meds: missed.join(", ") })}</p>}

      {findings.length === 0 && (
        <p className="saved" role="status">
          {ui.savedOk}
        </p>
      )}

      <button type="button" className="button-secondary" onClick={onEdit}>
        {ui.changeAnswers}
      </button>
    </div>
  );
}
