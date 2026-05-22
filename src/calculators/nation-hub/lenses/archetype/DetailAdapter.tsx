import type { DetailViewProps } from "../../registry";
import ArchetypeAnalysis from "./index";

export default function ArchetypeDetailAdapter({ country }: DetailViewProps) {
  return <ArchetypeAnalysis embedded forcedCountryId={country._id} />;
}
