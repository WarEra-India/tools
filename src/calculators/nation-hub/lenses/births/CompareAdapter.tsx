import type { CompareViewProps } from "../../registry";
import BabyBoom from "./index";

/**
 * Compare-mode wrapper for Births. The underlying BabyBoom component is
 * natively multi-country — we just pass the whole selected set and let it
 * render N series on the area chart with N stat cards underneath.
 */
export default function BirthsCompareAdapter({ countries }: CompareViewProps) {
  return <BabyBoom embedded forcedCountries={countries} />;
}
