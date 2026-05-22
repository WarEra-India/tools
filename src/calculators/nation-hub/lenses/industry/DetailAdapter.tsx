import type { DetailViewProps } from "../../registry";
import GlobalCompanyAnalyzer from "./index";

export default function IndustryDetailAdapter(_: DetailViewProps) {
  // Industry shows the full global atlas — no per-country highlight, per spec.
  return <GlobalCompanyAnalyzer embedded />;
}
