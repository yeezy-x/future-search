"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limitDocs = exports.rankSearchResults = void 0;
const rankSearchResults = (results, limit) => {
    return [...results]
        .sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        return scoreB - scoreA;
    })
        .slice(0, limit);
};
exports.rankSearchResults = rankSearchResults;
const limitDocs = (docs, limit = 10) => docs.slice(0, limit);
exports.limitDocs = limitDocs;
