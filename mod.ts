import { DOMParser, Document } from "./deps.ts";
import { ScraperPayload, ScraperQuery, ScraperResponse } from "./models/index.ts";
export { ScraperPayload, ScraperResponse, ScraperQuery, ScraperRegex, HTTPMethod, BodyType } from "./models/index.ts";
import fetch from "./classes/fetch.ts";

export async function parseQuery(payload: ScraperPayload, parsedResponse?: Document): Promise<ScraperResponse | null> {
  const response = parsedResponse ?? (await fetchHtml(payload));

  if (response) {
    let results: Record<string, unknown>[] = [];

    for (const query of payload.query) {
      if (query.element == undefined || query.element === "") continue; // Skip if the element is empty
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
          const elementDocument = new DOMParser().parseFromString(element.innerHTML, "text/html")!;
          for (const subQuery of query.subQuery) {
            const subPayload = new ScraperPayload({
              url: payload.url,
              query: [subQuery],
            });
            const subResponse = await parseQuery(subPayload, elementDocument);
            if (subResponse && subResponse.results.length > 0) {
              addResult(subQueryResult, subQuery, subResponse.results[0][subQuery.label]);
            }
          }
          if (Object.keys(subQueryResult).length > 0) {
            addResult(result, query, subQueryResult);
          }
        } else {
          if (query.withHref) {
            addResult(result, query, element.getAttribute("href") || element.getAttribute("src"));
          } else if (query.dataProp) {
            addResult(result, query, element.getAttribute(query.dataProp) || element.getAttribute("src"));
          } else if (query.getContent) {
            addResult(result, query, element.textContent?.replace(/\s+/g, " ").trim());
          } else {
            addResult(result, query, element.innerHTML);
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
    // if (!Array.isArray(results)) {
    //   results = [results];
    // }

    return new ScraperResponse({ url: payload.url, results });
  } else {
    return null;
  }
}

function addResult(result: Record<string, unknown>, query: ScraperQuery, value: unknown): Record<string, unknown> {
  if (value == null || value === "") {
    return result;
  }
  if (query.transformProcess != undefined) {
    value = query.transformProcess(value as string);
  }
  if (result[query.label]) {
    if (Array.isArray(result[query.label])) {
      (result[query.label] as unknown[]).push(value);
    } else {
      result[query.label] = [result[query.label], value];
    }
  } else {
    result[query.label] = value;
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

async function fetchHtml(payload: ScraperPayload): Promise<Document | null> {
  console.log(`Fetching HTML from: ${payload.url}`);
  const response = await fetch.fetch(payload);

  if (!response.ok) {
    console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    return null;
  }
  const content = await response.text();
  return new DOMParser().parseFromString(content, "text/html");
}

export function configureAstralBrowser(ws: string, token: string) {
  fetch.setWs(ws);
  fetch.setToken(token);
}
