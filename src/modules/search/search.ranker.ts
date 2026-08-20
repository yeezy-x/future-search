import { BaseMessage, Document } from "langchain";
import { SearchResult } from "./search.types";
import { Embeddings } from "@langchain/core/embeddings";
import cosineSimilarity from "compute-cosine-similarity";
import { dot } from "mathjs";
import { getSimilarityMeasure } from "../../config";

const computeSimilarity = (x: number[], y: number[]): number => {
  const similarityMeasure = getSimilarityMeasure();

  if (similarityMeasure === "cosine") {
    return cosineSimilarity(x, y) as number;
  }

  if (similarityMeasure === "dot") {
    return dot(x, y);
  }

  throw new Error(`Invalid similarity measure: ${similarityMeasure}`);
};

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

const embedDocumentsInBatches = async (
  documents: string[],
  embeddings: Embeddings,
  batchSize = 10
): Promise<number[][]> => {
  const allEmbeddings: number[][] = [];

  for (let start = 0; start < documents.length; start += batchSize) {
    const batch = documents.slice(start, start + batchSize);

    try {
      const batchEmbeddings = await embeddings.embedDocuments(batch);
      allEmbeddings.push(...batchEmbeddings);
    } catch (error) {
      for (let i = 0; i < batch.length; i++) {
        const document = batch[i];

        try {
          const singleEmbedding = await embeddings.embedDocuments([document]);
          allEmbeddings.push(singleEmbedding[0]);
        } catch (singleError) {
          throw singleError;
        }
      }
    }
  }

  return allEmbeddings;
};

export const rerankDocs = async ({
  query,
  docs,
  embeddings,
  limit = 10,
  threshold = 0.5,
}: {
  query: string;
  docs: Document[];
  embeddings: Embeddings;
  limit?: number;
  threshold?: number;
}): Promise<Document[]> => {
  if (docs.length === 0) {
    return [];
  }

  const docsWithContent = docs.filter(
    (doc) =>
      typeof doc.pageContent === "string" && doc.pageContent.trim().length > 0
  );

  if (docsWithContent.length === 0) {
    return [];
  }

  const documentTexts = docsWithContent.map((doc) => doc.pageContent);

  const documentEmbeddings = await embedDocumentsInBatches(
    documentTexts,
    embeddings,
    10
  );

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