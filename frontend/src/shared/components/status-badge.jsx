import { Badge } from "@/components/ui/badge";

export function StatusBadge({ online, text }) {
  return <Badge variant={online ? "success" : "danger"}>{text || (online ? "Онлайн" : "Офлайн")}</Badge>;
}
