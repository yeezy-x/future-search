import { normalize } from "@langchain/core/utils/math";
import { SearchResult } from "./search.types";

const normalizeUrl=(url:string):string=>{
    try{
        const parsed=new URL(url)
        parsed.hash=""
        const trackingParams = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "gclid",
            "fbclid",
        ];
        trackingParams.forEach((param)=>{
            parsed.searchParams.delete(param);
        });
        return parsed.toString().replace(/\/$/,"");
    }catch(error){
        console.error(`Error normalizing URL: ${url}`,error)
        return url
    }
}

export const deduplicateSearchResults=(
    results:SearchResult[]
):SearchResult[]=>{
    const seen=new Set<string>();
    return results.filter((result)=>{
        const normalizedUrl=normalizeUrl(result.url);
        if(seen.has(normalizedUrl)) return false;
        seen.add(normalizedUrl);
        return true;
    })
}