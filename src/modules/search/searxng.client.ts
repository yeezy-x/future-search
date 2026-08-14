import axios from "axios";
import { getSearxngApiEndpoint } from "../../config";
import { SearxngSearchOptions, SearxngSearchResult } from "./search.types";

export class SearxngClient {
  constructor(private readonly baseUrl: string) {}      

  async search(query:string,options:SearxngSearchOptions){
    const searxngURL=getSearxngApiEndpoint()
    const url = new URL(`${searxngURL}/search?format=json`);
    url.searchParams.set("q", query);
    if (options) {
      Object.keys(options).forEach((key) => {
        const value = options[key as keyof SearxngSearchOptions];
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
    const res = await axios.get(url.toString());
    if(res.status !== 200){
      throw new Error(`Failed to search with status ${res.status}`);
    }
    const results: SearxngSearchResult[] = res.data.results;
    const suggestions: string[] = res.data.suggestions;
    return { results, suggestions };
  }
}