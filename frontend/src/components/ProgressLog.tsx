import { formatDate, medsToCheck, type CheckIn } from "@/lib/checkin";
import { EN, fill, type UI } from "@/lib/i18n";
import type { CarePlan } from "@/lib/types";

interface Props {
  plan: CarePlan;
  checkIns: CheckIn[];
  ui?: UI;
  /** BCP 47 tag for formatting dates. */
  locale?: string;
}

export default function ProgressLog({ plan, checkIns, ui = EN, locale }: Props) {
  if (checkIns.length === 0) {
    return <p className="hint">{ui.noCheckins}</p>;
  }

  const total = medsToCheck(plan).length;

  return (
    <ol className="log">
      {checkIns.map((checkIn) => {
        const taken = Object.values(checkIn.meds).filter((status) => status === "taken").length;
        const symptoms = checkIn.symptoms.map((index) => plan.warning_signs[index]?.sign).filter(Boolean);
        return (
          <li key={checkIn.date} className="log-day">
            <h3>{formatDate(checkIn.date, locale)}</h3>
            <dl>
              {total > 0 && (
                <div>
                  <dt>{ui.logMedicines}</dt>
                  <dd>{fill(ui.logTaken, { taken, total })}</dd>
                </div>
              )}
              <div>
                <dt>{ui.logWarnings}</dt>
                <dd className={symptoms.length ? "log-symptoms" : undefined}>
                  {symptoms.length ? symptoms.join(", ") : ui.logNone}
                </dd>
              </div>
              {plan.self_care.length > 0 && (
                <div>
                  <dt>{ui.logSelfCare}</dt>
                  <dd>{fill(ui.logDone, { done: checkIn.done.length, total: plan.self_care.length })}</dd>
                </div>
              )}
              {checkIn.note && (
                <div>
                  <dt>{ui.logNote}</dt>
                  <dd>{checkIn.note}</dd>
                </div>
              )}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
