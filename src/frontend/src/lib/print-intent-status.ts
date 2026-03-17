import { PrintIntentStatus } from "@/types/operational";
import { StatusTone } from "@/components/ui/StatusBadge";

const knownStatuses: PrintIntentStatus[] = [
  "Pending",
  "ReadyForPrint",
  "SentToClient",
  "UserPrinted",
  "Failed",
  "Cancelled",
];

export function normalizePrintIntentStatus(status: unknown): PrintIntentStatus {
  if (typeof status === "string" && knownStatuses.includes(status as PrintIntentStatus)) {
    return status as PrintIntentStatus;
  }

  return "Pending";
}

export function getPrintIntentStatusLabel(status: PrintIntentStatus): string {
  switch (status) {
    case "ReadyForPrint":
      return "Ready For Print";
    case "SentToClient":
      return "Sent To Client";
    case "UserPrinted":
      return "Printed";
    default:
      return status;
  }
}

export function getPrintIntentStatusTone(status: PrintIntentStatus): StatusTone {
  switch (status) {
    case "Pending":
    case "ReadyForPrint":
      return "warning";
    case "SentToClient":
      return "info";
    case "UserPrinted":
      return "success";
    case "Failed":
    case "Cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export function isOpenPrintIntentStatus(status: PrintIntentStatus): boolean {
  return status === "Pending" || status === "ReadyForPrint" || status === "SentToClient";
}
