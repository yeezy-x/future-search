"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rerankDocs = exports.rankSearchResults = void 0;
const compute_cosine_similarity_1 = __importDefault(require("compute-cosine-similarity"));
const mathjs_1 = require("mathjs");
const config_1 = require("../../config");
const formatChatHistoryAsString = (history) => {
    return history
        .map((message) => `${message._getType()}: ${message.content}`)
        .join("\n");
};
const computeSimilarity = (x, y) => {
    const similarityMeasure = (0, config_1.getSimilarityMeasure)();
    if (similarityMeasure === "cosine") {
        return (0, compute_cosine_similarity_1.default)(x, y);
    }
    else if (similarityMeasure === "dot") {
        return (0, mathjs_1.dot)(x, y);
    }
    throw new Error(`Invalid similarity measure: ${similarityMeasure}`);
};
/**
 * Ranking V1
 *
 * Uses the score provided by SearXNG.
 *
 * Example:
 *
 * 0.9
 * 0.7
 * 0.4
 * 0.1
 */
const rankSearchResults = (results, limit) => {
    return [...results]
        .sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        return scoreB - scoreA;
    }).slice(0, limit);
};
exports.rankSearchResults = rankSearchResults;
/**
 * Ranking V2
 *
 * Uses embeddings to measure semantic similarity
 * between the user's query and each document.
 */
const rerankDocs = async ({ query, docs, embeddings, limit = 10, threshold = 0.5, }) => {
    if (docs.length === 0) {
        return [];
    }
    const docsWithContent = docs.filter((doc) => typeof doc.pageContent === "string" &&
        doc.pageContent.trim().length > 0);
    if (docsWithContent.length === 0) {
        return [];
    }
    console.log(`Embedding ${docsWithContent.length} documents...`);
    const [documentEmbeddings, queryEmbedding,] = await Promise.all([
        embeddings.embedDocuments(docsWithContent.map((doc) => doc.pageContent)),
        embeddings.embedQuery(query),
    ]);
    const similarities = documentEmbeddings.map((documentEmbedding, index) => ({
        index,
        similarity: computeSimilarity(queryEmbedding, documentEmbedding),
    }));
    const ranked = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .filter((item) => item.similarity >= threshold)
        .slice(0, limit);
    console.log(`Documents after semantic reranking: ${ranked.length}`);
    return ranked.map((item) => docsWithContent[item.index]);
};
exports.rerankDocs = rerankDocs;
