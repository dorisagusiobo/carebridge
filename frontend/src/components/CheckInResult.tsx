import { missedMeds, urgentFindings, type CheckIn } from "@/lib/checkin";
import type { Action, CarePlan } from "@/lib/types";

// What to do now, decided by the plan's checked actions (instructions plus the
// red-flag rules), never by the model.
const DO_NOW: Record<Action, { text: string; tone: string }> = {
  call_911: { text: "Call 911 now.", tone: "urgent" },
  go_to_er: { text: "Go to the emergency room now.", tone: "er" },
  call_care_team: { text: "Call your doctor or care team today.", tone: "call" },
  not_stated: { text: "Call your care team and ask what to do.", tone: "ask" },
};

interface Props {
  plan: CarePlan;
  checkIn: CheckIn;
  onEdit: () => void;
}

export default function CheckInResult({ plan, checkIn, onEdit }: Props) {
  const findings = urgentFindings(plan, checkIn);
  const missed = missedMeds(checkIn);

  return (
    <div className="checkin-result">
      {findings.map(({ action, signs }) => (
        <div key={action} className={`warning warning-${DO_NOW[action].tone}`} role="alert">
          <h3>{DO_NOW[action].text}</h3>
          <p>You said you have: {signs.map((sign) => sign.sign.toLowerCase()).join(", ")}.</p>
        </div>
      ))}

      {missed.length > 0 && (
        <p className="notice">
          You missed {missed.join(", ")}. Don&apos;t take extra to catch up unless your care team says to. Ask your
          care team or pharmacist what to do.
        </p>
      )}

      {findings.length === 0 && (
        <p className="saved" role="status">
          Saved. Nothing you reported needs a call right now. Check in again tomorrow.
        </p>
      )}

      <button type="button" className="button-secondary" onClick={onEdit}>
        Change today&apos;s answers
      </button>
    </div>
  );
}
