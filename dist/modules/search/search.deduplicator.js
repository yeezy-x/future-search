"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicateSearchResults = void 0;
const normalizeUrl = (url) => {
    try {
        const parsed = new URL(url);
        parsed.hash = "";
        const trackingParams = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "gclid",
            "fbclid",
        ];
        trackingParams.forEach((param) => {
            parsed.searchParams.delete(param);
        });
        return parsed.toString().replace(/\/$/, "");
    }
    catch (error) {
        console.error(`Error normalizing URL: ${url}`, error);
        return url;
    }
};
const deduplicateSearchResults = (results) => {
    const seen = new Set();
    return results.filter((result) => {
        const normalizedUrl = normalizeUrl(result.url);
        if (seen.has(normalizedUrl))
            return false;
        seen.add(normalizedUrl);
        return true;
    });
};
exports.deduplicateSearchResults = deduplicateSearchResults;
