import { Hourglass } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "@/lib/i18n/dateTime";
import { trialDaysLeft, trialDaysLeftLabel } from "../services/trialDays";

export function TrialBanner({ trialEndsAtUtc }: { trialEndsAtUtc: string }) {
  const days = trialDaysLeft(trialEndsAtUtc);
  return (
    <div className={`trial-banner${days <= 3 ? " ending" : ""}`} role="status">
      <Hourglass aria-hidden="true" />
      <p>
        <strong>{trialDaysLeftLabel(days)}</strong>{" "}
        <span>Termina el {formatDate(trialEndsAtUtc)}.</span>
      </p>
      <Link to="/support">Quiero continuar</Link>
    </div>
  );
}
