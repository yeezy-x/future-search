"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const output_parsers_1 = require("@langchain/core/output_parsers");
const searxng_client_1 = require("../modules/search/searxng.client");
const runnables_1 = require("@langchain/core/runnables");
const prompts_1 = require("@langchain/core/prompts");
const search_normalizer_1 = require("../modules/search/search.normalizer");
const search_deduplicator_1 = require("../modules/search/search.deduplicator");
const search_ranker_1 = require("../modules/search/search.ranker");
const events_1 = __importDefault(require("events"));
const langchain_1 = require("langchain");
const basicSearchRetrieverPrompt = `
  You will be given a conversation below and a follow up question. You need to rephrase the follow-up question if needed so it is a standalone question that can be used by the LLM to search the web for information.
  If it is a writing task or a simple hi, hello rather than a question, you need to return \`not_needed\` as the response.

  Example:
  1. Follow up question: What is the capital of France?
  Rephrased: Capital of france

  2. Follow up question: What is the population of New York City?
  Rephrased: Population of New York City

  3. Follow up question: What is Docker?
  Rephrased: What is Docker

  Conversation:
  {chat_history}

  Follow up question: {query}
  Rephrased question:
`;
const basicWebSearchResponsePrompt = `
  You are futuresearch, an AI model who is expert at searching the web and answering user's queries.

  Generate a response that is informative and relevant to the user's query based on provided context (the context consits of search results containg a brief description of the content of that page).
  You must use this context to answer the user's query in the best way possible. Use an unbaised and journalistic tone in your response. Do not repeat the text.
  You must not tell the user to open any link or visit any website to get the answer. You must provide the answer in the response itself. If the user asks for links you can provide them.
  Your responses should be medium to long in length be informative and relevant to the user's query. You can use markdowns to format your response. You should use bullet points to list the information. Make sure the answer is not short and is informative.
  You have to cite the answer using [number] notation. You must cite the sentences with their relevent context number. You must cite each and every part of the answer so the user can know where the information is coming from.
  Place these citations at the end of that particular sentence. You can cite the same sentence multiple times if it is relevant to the user's query like [number1][number2].
  However you do not need to cite it using the same number. You can use different numbers to cite the same sentence multiple times. The number refers to the number of the search result (passed in the context) used to generate that part of the answer.

  Aything inside the following \`context\` HTML block provided below is for your knowledge returned by the search engine and is not shared by the user. You have to answer question on the basis of it and cite the relevant information from it but you do not have to 
  talk about the context in your response. 

  <context>
  {context}
  </context>

  If you think there's nothing relevant in the search results, you can say that 'Hmm, sorry I could not find any relevant information on this topic. Would you like me to search again or ask something else?'.
  Anything between the \`context\` is retrieved from a search engine and is not a part of the conversation with the user. Today's date is ${new Date().toISOString()}
`;
const handleStream = async (stream, emitter) => {
    for await (const event of stream) {
        if (event.event === "on_chain_end" &&
            event.name === "FinalSourceRetriever") {
            emitter.emit("data", JSON.stringify({ type: "sources", data: event.data.output }));
        }
        if (event.event === "on_chain_stream" &&
            event.name === "FinalResponseGenerator") {
            emitter.emit("data", JSON.stringify({ type: "response", data: event.data.chunk }));
        }
        if (event.event === "on_chain_end" &&
            event.name === "FinalResponseGenerator") {
            emitter.emit("end");
        }
    }
};
const formatChatHistoryAsString = (history) => {
    return history.map((message) => `${message._getType()}: ${message.content}`).join("\n");
};
const strParser = new output_parsers_1.StringOutputParser();
const searchClient = new searxng_client_1.SearxngClient((0, config_1.getSearxngApiEndpoint)());
const createBasicWebSearchRetrieverChain = (llm) => {
    return runnables_1.RunnableSequence.from([
        prompts_1.PromptTemplate.fromTemplate(basicSearchRetrieverPrompt),
        llm,
        strParser,
        runnables_1.RunnableLambda.from(async (input) => {
            if (input == "not_needed") {
                return { query: "", docs: [] };
            }
            const res = await searchClient.search(input, {
                categories: ["general"],
                language: "en",
            });
            // 1. Normalize SearXNG results
            const normalizedResults = (0, search_normalizer_1.normalizeSearchResults)(res.results);
            console.log(`SearXNG results: ${res.results.length}`);
            console.log(`After normalization: ${normalizedResults.length}`);
            // 2. Remove duplicate URLs
            const uniqueResults = (0, search_deduplicator_1.deduplicateSearchResults)(normalizedResults);
            console.log(`After deduplication: ${uniqueResults.length}`);
            const rankedResults = (0, search_ranker_1.rankSearchResults)(uniqueResults, 20);
            console.log(`After ranking: ${rankedResults.length}`);
            // 3. Convert our internal SearchResult
            //    into LangChain Documents
            const documents = rankedResults.map((result) => new langchain_1.Document({
                pageContent: result.content ?? "",
                metadata: {
                    title: result.title,
                    url: result.url,
                    source: result.source,
                    score: result.score,
                    publishedAt: result.publishedAt,
                },
            }));
            return {
                query: input,
                docs: documents,
            };
        })
    ]);
};
const createBasicWebSearchAnsweringChain = (llm, embeddings) => {
    const basicWebSearchRetrieverChain = createBasicWebSearchRetrieverChain(llm);
    const semanticReranking = runnables_1.RunnableLambda.from(async (input) => {
        return {
            query: input.query,
            docs: await (0, search_ranker_1.rerankDocs)({
                query: input.query,
                docs: input.docs,
                embeddings,
                limit: 10,
                threshold: 0.5,
            }),
        };
    });
    const processDocs = runnables_1.RunnableLambda.from(async (docs) => {
        return docs
            .map((doc, index) => {
            return [
                `[${index + 1}]`,
                `Title: ${doc.metadata.title}`,
                `URL: ${doc.metadata.url}`,
                `Content: ${doc.pageContent}`,
            ].join("\n");
        })
            .join("\n\n");
    });
    return runnables_1.RunnableSequence.from([
        runnables_1.RunnableMap.from({
            query: (input) => input.query,
            chat_history: (input) => input.chat_history,
            context: runnables_1.RunnableSequence.from([
                (input) => ({
                    query: input.query,
                    chat_history: formatChatHistoryAsString(input.chat_history),
                }),
                basicWebSearchRetrieverChain,
                semanticReranking,
                processDocs,
            ]),
        }),
        prompts_1.ChatPromptTemplate.fromMessages([
            ["system", basicWebSearchResponsePrompt],
            new prompts_1.MessagesPlaceholder("chat_history"),
            ["user", "{query}"],
        ]),
        llm,
        strParser,
    ]).withConfig({
        runName: "FinalResponseGenerator",
    });
};
const basicWebSearch = (input, llm, embeddings) => {
    const event = new events_1.default();
    try {
        const basicWebSearchAnsweringChain = createBasicWebSearchAnsweringChain(llm, embeddings);
        const stream = basicWebSearchAnsweringChain.streamEvents(input, { version: "v1" });
        handleStream(stream, event);
    }
    catch (err) {
        event.emit("error", JSON.stringify({
            data: `An error has occurred please try again later: ${err}`
        }));
    }
    return event;
};
const handleWebSearch = async (input, llm, embeddings) => {
    //start an event 
    const event = basicWebSearch(input, llm, embeddings);
    return event;
};
exports.default = handleWebSearch;
