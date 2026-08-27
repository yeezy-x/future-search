"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearxngClient = void 0;
const axios_1 = __importDefault(require("axios"));
class SearxngClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async search(query, options) {
        const searxngURL = this.baseUrl;
        const url = new URL(`${searxngURL}/search?format=json`);
        url.searchParams.set("q", query);
        if (options) {
            Object.keys(options).forEach((key) => {
                const value = options[key];
                if (value === undefined) {
                    return;
                }
                if (Array.isArray(value)) {
                    url.searchParams.append(key, value.join(","));
                    return;
                }
                url.searchParams.append(key, String(value));
            });
        }
        const res = await axios_1.default.get(url.toString());
        if (res.status !== 200) {
            throw new Error(`Failed to search with status ${res.status}`);
        }
        const results = res.data.results;
        const suggestions = res.data.suggestions;
        return { results, suggestions };
    }
}
exports.SearxngClient = SearxngClient;
