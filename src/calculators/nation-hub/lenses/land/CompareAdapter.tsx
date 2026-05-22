import type { CompareViewProps } from "../../registry";
import LandArea from "./index";

/**
 * Compare-mode wrapper for Land. We hand LandArea the list of selected
 * country codes and it filters the table down to just those rows, hides
 * the global summary cards, and hides the search box.
 */
export default function LandCompareAdapter({ countries }: CompareViewProps) {
  const codes = countries.map((c) => c.code);
  return <LandArea embedded filterCountryCodes={codes} />;
}
