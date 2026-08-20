import { YoutubeTranscript } from "youtube-transcript";

const extractYoutubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("youtube.com")) {
      return parsedUrl.searchParams.get("v");
    }
    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
};

export const fetchYoutubeTranscript = async (
  url: string
): Promise<string | null> => {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    console.log("[TRANSCRIPT] Could not extract video ID");
    return null;
  }
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const text = transcript
      .map((item) => item.text)
      .join(" ")
      .trim();
    return text || null;
  } catch (error) {
    console.error(
      "[TRANSCRIPT] Failed:",
      error
    );
    return null;
  }
};