import { FETCH_TIMEOUT_MS, MAX_HTML_BYTES, USER_AGENT } from "./constants";

export class PageFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "PageFetchError";
  }
}

export async function fetchPage(url: string): Promise<{
  html: string;
  finalUrl: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },

    });

    if (!response.ok) {
      throw new PageFetchError(
        `HTTP ${response.status}`,
        url,
        response.status,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new PageFetchError(`Non-HTML content: ${contentType}`, url);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new PageFetchError("Empty response body", url);
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_HTML_BYTES) {
        throw new PageFetchError("Response exceeds size limit", url);
      }
      chunks.push(value);
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      concatUint8(chunks),
    );

    return {
      html,
      finalUrl: response.url || url,
    };
  } catch (error) {
    if (error instanceof PageFetchError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new PageFetchError(`Timeout after ${FETCH_TIMEOUT_MS}ms`, url);
    }
    throw new PageFetchError(
      error instanceof Error ? error.message : "Fetch failed",
      url,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function concatUint8(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
