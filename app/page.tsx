import Itinerary from "@/components/Itinerary";
import data from "@/data/itinerary.json";
import type { Itinerary as ItineraryData } from "@/lib/types";

export default function Home() {
  return <Itinerary initial={data as ItineraryData} />;
}
