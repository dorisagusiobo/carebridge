import { formatDate, medsToCheck, type CheckIn } from "@/lib/checkin";
import type { CarePlan } from "@/lib/types";

interface Props {
  plan: CarePlan;
  checkIns: CheckIn[];
}

export default function ProgressLog({ plan, checkIns }: Props) {
  if (checkIns.length === 0) {
    return <p className="hint">No check-ins yet. Your daily check-ins will show up here.</p>;
  }

  const total = medsToCheck(plan).length;

  return (
    <ol className="log">
      {checkIns.map((checkIn) => {
        const taken = Object.values(checkIn.meds).filter((status) => status === "taken").length;
        return (
          <li key={checkIn.date} className="log-day">
            <h3>{formatDate(checkIn.date)}</h3>
            <dl>
              {total > 0 && (
                <div>
                  <dt>Medicines</dt>
                  <dd>
                    {taken} of {total} taken
                  </dd>
                </div>
              )}
              <div>
                <dt>Warning signs</dt>
                <dd className={checkIn.symptoms.length ? "log-symptoms" : undefined}>
                  {checkIn.symptoms.length ? checkIn.symptoms.join(", ") : "None"}
                </dd>
              </div>
              {plan.self_care.length > 0 && (
                <div>
                  <dt>Self-care</dt>
                  <dd>
                    {checkIn.done.length} of {plan.self_care.length} done
                  </dd>
                </div>
              )}
              {checkIn.note && (
                <div>
                  <dt>Note</dt>
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
