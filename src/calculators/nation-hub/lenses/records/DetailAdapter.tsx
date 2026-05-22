import type { DetailViewProps } from "../../registry";
import NationalRecords from "./index";

export default function RecordsDetailAdapter({ country }: DetailViewProps) {
  return <NationalRecords embedded forcedCountryId={country._id} />;
}
