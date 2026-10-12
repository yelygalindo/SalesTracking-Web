import { useQuery } from "@tanstack/react-query";
import { industryApi } from "../api/industryApi";

/** Industry catalog; it rarely changes, so it is kept for the whole visit. */
export function useIndustries() {
  return useQuery({ queryKey: ["industries"], queryFn: industryApi.list, staleTime: Infinity });
}
