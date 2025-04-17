import { DOMParser, Document } from "./deps.ts";
import { ScraperPayload, ScraperResponse } from "./models/index.ts";
export { ScraperPayload, ScraperResponse, ScraperQuery, ScraperRegex } from "./models/index.ts";

export async function parseQuery(payload: ScraperPayload, parsedResponse?: Document): Promise<ScraperResponse | null> {
  const response = parsedResponse ?? (await fetchHtml(payload.url));

  if (response) {
    let results: Record<string, unknown>[] = [];

    for (const query of payload.query) {
      if (query.element === "") continue; // Skip if the element is empty
      const elements = response.querySelectorAll(query.element);
      const result: Record<string, unknown> = {};

      // If an selectItemsAtIndex is specified, only process the element at that selectItemsAtIndex
      const elementsToProcess =
        query.selectItemsAtIndex && query.selectItemsAtIndex.length > 0
          ? query.selectItemsAtIndex.map((index) => elements[index]).filter((element) => element !== undefined)
          : elements;

      for (const element of elementsToProcess) {
        if (!element) continue; // Skip if the element doesn't exist (e.g., invalid selectItemsAtIndex)

        if (query.subQuery && query.subQuery.length > 0) {
          const subQueryResult: Record<string, unknown> = {};
          const elementDocument = new DOMParser().parseFromString(element.outerHTML, "text/html")!;
          for (const subQuery of query.subQuery) {
            const subPayload = new ScraperPayload({
              url: payload.url,
              query: [subQuery],
            });
            const subResponse = await parseQuery(subPayload, elementDocument);
            if (subResponse && subResponse.results.length > 0) {
              addResult(subQueryResult, subQuery.label, subResponse.results[0][subQuery.label]);
            }
          }
          if (Object.keys(subQueryResult).length > 0) {
            addResult(result, query.label, subQueryResult);
          }
        } else {
          if (query.withHref) {
            addResult(result, query.label, element.getAttribute("href") || element.getAttribute("src"));
          } else if (query.dataProp) {
            addResult(result, query.label, element.getAttribute(query.dataProp) || element.getAttribute("src"));
          } else {
            addResult(result, query.label, element.textContent?.replace(/\s+/g, " ").trim());
          }
        }

        if (query.regex != null) {
          const regex = query.regex.regex;
          const regexMatch = regex ? result[query.label]?.toString().match(regex) : null;
          if (regexMatch) {
            const processedValue = query.regex.process ? query.regex.process(regexMatch) : regexMatch[0];

            replaceResult(result, query.label, processedValue);
          }
        }
        if (Object.keys(result).length > 0) {
          results.push(result);
        }
      }
    }

    if (!parsedResponse) {
      // Flatten the results if parsedResponse is null
      results = [mergeResults(results)];
    }

    return new ScraperResponse({ url: payload.url, results });
  } else {
    return null;
  }
}

function addResult(result: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  if (value == null || value === "") {
    return result;
  }
  if (result[key]) {
    if (Array.isArray(result[key])) {
      (result[key] as unknown[]).push(value);
    } else {
      result[key] = [result[key], value];
    }
  } else {
    result[key] = value;
  }
  return result;
}

function replaceResult(result: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  if (value == null || value === "") {
    return result;
  }
  result[key] = value;
  return result;
}

function mergeResults(results: Record<string, unknown>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const result of results) {
    const key = Object.keys(result)[0];
    merged[key] = result[key];
  }

  return merged;
}

async function fetchHtml(url: string): Promise<Document | null> {
  console.log(`Fetching HTML from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    return null;
  }
  const content = await response.text();
  return new DOMParser().parseFromString(content, "text/html");
}
