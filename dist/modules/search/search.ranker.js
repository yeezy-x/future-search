"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rerankDocs = exports.rankSearchResults = void 0;
const compute_cosine_similarity_1 = __importDefault(require("compute-cosine-similarity"));
const mathjs_1 = require("mathjs");
const config_1 = require("../../config");
const computeSimilarity = (x, y) => {
    const similarityMeasure = (0, config_1.getSimilarityMeasure)();
    if (similarityMeasure === "cosine") {
        return (0, compute_cosine_similarity_1.default)(x, y);
    }
    if (similarityMeasure === "dot") {
        return (0, mathjs_1.dot)(x, y);
    }
    throw new Error(`Invalid similarity measure: ${similarityMeasure}`);
};
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
const embedDocumentsInBatches = async (documents, embeddings, batchSize = 10) => {
    const allEmbeddings = [];
    for (let start = 0; start < documents.length; start += batchSize) {
        const batch = documents.slice(start, start + batchSize);
        try {
            const batchEmbeddings = await embeddings.embedDocuments(batch);
            allEmbeddings.push(...batchEmbeddings);
        }
        catch (error) {
            for (let i = 0; i < batch.length; i++) {
                const document = batch[i];
                try {
                    const singleEmbedding = await embeddings.embedDocuments([document]);
                    allEmbeddings.push(singleEmbedding[0]);
                }
                catch (singleError) {
                    throw singleError;
                }
            }
        }
    }
    return allEmbeddings;
};
const rerankDocs = async ({ query, docs, embeddings, limit = 10, threshold = 0.5, }) => {
    if (docs.length === 0) {
        return [];
    }
    const docsWithContent = docs.filter((doc) => typeof doc.pageContent === "string" && doc.pageContent.trim().length > 0);
    if (docsWithContent.length === 0) {
        return [];
    }
    const documentTexts = docsWithContent.map((doc) => doc.pageContent);
    const documentEmbeddings = await embedDocumentsInBatches(documentTexts, embeddings, 10);
    const queryEmbedding = await embeddings.embedQuery(query);
    const similarities = documentEmbeddings.map((documentEmbedding, index) => ({
        index,
        similarity: computeSimilarity(queryEmbedding, documentEmbedding),
    }));
    const ranked = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .filter((item) => item.similarity >= threshold)
        .slice(0, limit);
    return ranked.map((item) => docsWithContent[item.index]);
};
exports.rerankDocs = rerankDocs;
