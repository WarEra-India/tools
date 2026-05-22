import type { DetailViewProps } from "../../registry";
import BabyBoom from "./index";

export default function BirthsDetailAdapter({ country }: DetailViewProps) {
  return <BabyBoom embedded forcedCountries={[country]} />;
}
