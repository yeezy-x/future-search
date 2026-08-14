"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const output_parsers_1 = require("@langchain/core/output_parsers");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
const config_1 = require("../config");
const searxng_client_1 = require("../modules/search/searxng.client");
const imageSearchChainPrompt = `
You will be given a conversation below and a follow up 
question. You need to rephrase the follow-up question so
it is a standalone question that can be used by the LLM 
to search the web for images.
You need to make sure the rephrased question agrees with 
the conversation and is relevant to the conversation.
Example:
1. Follow up question: What is a cat?
Rephrased: A cat
2. Follow up question: What is a car? How does it works?
Rephrased: Car working
3. Follow up question: How does an AC work?
Rephrased: AC working
Conversation:
{chat_history}
Follow up question: {query}
Rephrased question:
`;
const formatChatHistoryAsString = (history) => {
    return history
        .map((message) => `${message._getType()}: ${message.content}`)
        .join("\n");
};
const strParser = new output_parsers_1.StringOutputParser();
const searxngClient = new searxng_client_1.SearxngClient((0, config_1.getSearxngApiEndpoint)());
const createImageSearchChain = (llm) => {
    return runnables_1.RunnableSequence.from([
        runnables_1.RunnableMap.from({
            chat_history: (input) => {
                return formatChatHistoryAsString(input.chat_history);
            },
            query: (input) => {
                return input.query;
            }
        }),
        prompts_1.PromptTemplate.fromTemplate(imageSearchChainPrompt),
        llm,
        strParser,
        runnables_1.RunnableLambda.from(async (input) => {
            console.log("\n========== IMAGE SEARCH ==========");
            console.log("Rewritten query:", input);
            const res = await searxngClient.search(input, {
                categories: ["images"],
                engines: ["bing images", "google images"]
            });
            console.log("SearXNG results:", res.results.length);
            console.log("SearXNG results:", res.results);
            const images = [];
            res.results.forEach((result) => {
                if (result.img_src && result.url && result.title) {
                    images.push({
                        img_src: result.img_src,
                        url: result.url,
                        title: result.title,
                    });
                }
            });
            console.log("Valid images:", images);
            return images.slice(0, 10);
        })
    ]);
};
const handleImageSearch = (input, llm) => {
    const imageSearchChain = createImageSearchChain(llm);
    console.log("imageSearchChain:", imageSearchChain);
    return imageSearchChain.invoke(input);
};
exports.default = handleImageSearch;
