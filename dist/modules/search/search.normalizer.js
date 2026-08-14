"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSearchResults = exports.normalizeSearchResult = void 0;
const normalizeSearchResult = (result) => {
    return {
        title: result.title,
        url: result.url,
        content: result.content,
        source: result.engine,
        score: result.score,
        publishedAt: result.publishedDate,
    };
};
exports.normalizeSearchResult = normalizeSearchResult;
const normalizeSearchResults = (results) => {
    return results.map(exports.normalizeSearchResult);
};
exports.normalizeSearchResults = normalizeSearchResults;
