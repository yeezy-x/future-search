import {SearchResult,SearxngSearchResult} from "./search.types";
  
export const normalizeSearchResult = (
    result: SearxngSearchResult
): SearchResult => {
    return {
        title: result.title,
        url: result.url,
        content: result.content,
        source: result.engine,
        score: result.score,
        publishedAt: result.publishedDate,
    };
};

export const normalizeSearchResults = (
    results: SearxngSearchResult[]
): SearchResult[] => {
    return results.map(normalizeSearchResult);
};