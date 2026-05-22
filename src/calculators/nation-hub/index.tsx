import { useSearchParams } from "react-router-dom";
import { isResultsRoute } from "./state";
import NationHubLanding from "./landing";
import NationHubResults from "./results";

/**
 * Single entry point for /nation-hub.
 *
 * Branches on URL: if ?c=... is present we show the results screen, otherwise
 * the landing screen. Keeping it one route means App.tsx needs no changes.
 */
export default function NationHub() {
  const [searchParams] = useSearchParams();
  return isResultsRoute(searchParams) ? <NationHubResults /> : <NationHubLanding />;
}
