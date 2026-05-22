import type { DetailViewProps } from "../../registry";
import NationPower from "./index";

export default function PowerDetailAdapter({ country }: DetailViewProps) {
  return <NationPower embedded forcedCountryId={country._id} />;
}
