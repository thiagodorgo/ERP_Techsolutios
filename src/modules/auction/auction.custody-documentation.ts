export type CustodyDocumentationInput = {
  readonly inspectionComplete: boolean;
  readonly yardAssigned: boolean;
  readonly removalPosted: boolean;
};

export function custodyDocumentationGap(input: CustodyDocumentationInput): string | undefined {
  if (!input.inspectionComplete) return "auction_custody_inspection_incomplete";
  if (!input.yardAssigned) return "auction_custody_yard_missing";
  if (!input.removalPosted) return "auction_custody_removal_charge_missing";
  return undefined;
}
