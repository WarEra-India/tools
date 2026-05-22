import type { DetailViewProps } from "../../registry";
import LandArea from "./index";

export default function LandDetailAdapter({ country }: DetailViewProps) {
  return <LandArea embedded highlightCountryCode={country.code} />;
}
