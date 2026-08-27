import { Document } from "langchain";
import { SearchResult } from "./search.types";

export const rankSearchResults = (
  results: SearchResult[],
  limit: number
): SearchResult[] => {
  return [...results]
    .sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      return scoreB - scoreA;
    })
    .slice(0, limit);
};

export const limitDocs = (docs: Document[], limit = 10): Document[] =>
  docs.slice(0, limit);
