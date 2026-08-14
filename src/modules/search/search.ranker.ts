import { BaseMessage, Document } from "langchain";
import { SearchResult } from "./search.types";
import { Embeddings } from "@langchain/core/embeddings";
import cosineSimilarity from "compute-cosine-similarity";
import {dot} from "mathjs"
import { getSimilarityMeasure } from "../../config";

const formatChatHistoryAsString = (history: BaseMessage[]) => {
    return history
    .map((message) => `${message._getType()}: ${message.content}`)
    .join("\n");
};

const computeSimilarity = (x: number[], y: number[]): number => {
    const similarityMeasure = getSimilarityMeasure();
    if (similarityMeasure === "cosine") {
      return cosineSimilarity(x, y) as number;
    } else if (similarityMeasure === "dot") {
      return dot(x, y);
    }
    throw new Error( `Invalid similarity measure: ${similarityMeasure}`);
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
export const rankSearchResults=(
    results:SearchResult[],
    limit:number
):SearchResult[]=>{
    return [...results]
    .sort((a,b)=>{
        const scoreA=a.score ?? 0;
        const scoreB=b.score ?? 0;
        return scoreB-scoreA;
    }).slice(0,limit);
}

/**
 * Ranking V2
 *
 * Uses embeddings to measure semantic similarity
 * between the user's query and each document.
 */
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
        typeof doc.pageContent === "string" &&
        doc.pageContent.trim().length > 0
    );
  
    if (docsWithContent.length === 0) {
      return [];
    }
  
    console.log(
      `Embedding ${docsWithContent.length} documents...`
    );
  
    const [
      documentEmbeddings,
      queryEmbedding,
    ] = await Promise.all([
      embeddings.embedDocuments(
        docsWithContent.map(
          (doc) => doc.pageContent
        )
      ),
      embeddings.embedQuery(query),
    ]);
  
    const similarities = documentEmbeddings.map(
      (documentEmbedding, index) => ({
        index,
        similarity: computeSimilarity(
          queryEmbedding,
          documentEmbedding
        ),
      })
    );
  
    const ranked = similarities
      .sort(
        (a, b) =>
          b.similarity - a.similarity
      )
      .filter(
        (item) =>
          item.similarity >= threshold
      )
      .slice(0, limit);
  
    console.log(
      `Documents after semantic reranking: ${ranked.length}`
    );
  
    return ranked.map(
      (item) => docsWithContent[item.index]
    );
};