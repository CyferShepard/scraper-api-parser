import { DOMParser, Document, Element } from "./deps.ts";
import { ScraperPayload, ScraperQuery, ScraperResponse } from "./models/index.ts";
export { ScraperPayload, ScraperResponse, ScraperQuery, ScraperRegex, HTTPMethod, BodyType } from "./models/index.ts";
import fetch from "./classes/fetch.ts";

export async function parseQuery(
  payload: ScraperPayload,
  parsedResponse?: Document,
  parentElement?: Element,
): Promise<ScraperResponse | Record<string, unknown> | null> {
  const response = parsedResponse ?? (await fetchHtml(payload));

  if (response && !(response instanceof Document) && typeof response === "object") {
    console.log("Response is a JSON object, parsing...");
    return parseJsonResponse(response as Record<string, unknown>, payload);
  }

  if (response) {
    const results: Record<string, unknown> = {};

    for (const query of payload.query) {
      if (query.element == undefined || query.element === "") continue; // Skip if the element is empty

      let elements: Element[] = Array.from(response.querySelectorAll(query.element)) as Element[];
      if (query.subElements && query.subElements.length > 0) {
        for (const subElement of query.subElements) {
          elements = elements.flatMap((element) => {
            if (element.tagName === "TEMPLATE") {
              // Create a temporary document from the template's inner HTML so its kids become queryable
              const tempDoc = new DOMParser().parseFromString(element.innerHTML, "text/html")!;
              return Array.from(tempDoc.querySelectorAll(subElement)) as Element[];
            }

            // Otherwise, query it normally
            return Array.from(element.querySelectorAll(subElement)) as Element[];
          });
        }
      }
      if (elements.length === 0 && parentElement != null) {
        elements = [parentElement];
      }
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
            const useParent = subQuery.element == "use-parent";

            const subResponse = await parseQuery(subPayload, elementDocument, useParent ? element : undefined);
            if (subResponse && typeof subResponse === "object" && !(subResponse instanceof ScraperResponse)) {
              if (Array.isArray(subResponse)) {
                for (const res of subResponse) {
                  addResult(subQueryResult, subQuery, res[subQuery.label]);
                }
              } else {
                addResult(subQueryResult, subQuery, subResponse[subQuery.label]);
              }
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
      }

      if (Object.keys(result).length > 0) {
        const newValue = result[query.label];
        if (results[query.label]) {
          if (Array.isArray(results[query.label]) && Array.isArray(newValue)) {
            // Concatenate arrays
            results[query.label] = (results[query.label] as unknown[]).concat(newValue);
          } else if (Array.isArray(results[query.label])) {
            // Push single value to array
            (results[query.label] as unknown[]).push(newValue);
          } else if (Array.isArray(newValue)) {
            // Merge single value and array
            results[query.label] = [results[query.label], ...newValue];
          } else {
            // Both are single values, make array
            results[query.label] = [results[query.label], newValue];
          }
        } else {
          results[query.label] = newValue;
        }
      }

      if (query.finalTransformProcess != undefined) {
        transformResult(results, query, results[query.label]);
      }
    }
    if (parsedResponse) {
      return results;
    }

    let fresults: Record<string, unknown>[] = [results];
    return new ScraperResponse({ url: payload.url, results: fresults });
  } else {
    return null;
  }
}

function parseJsonResponse(json: Record<string, unknown>, payload: ScraperPayload): ScraperResponse | null {
  let results: Record<string, unknown>[] = [];

  for (const query of payload.query) {
    // Helper to support dot notation for nested fields
    const getValueByPath = (obj: any, path: string): any => {
      return path.split(".").reduce((acc, part) => {
        if (Array.isArray(acc)) {
          // Map over each item in the array and get the next part
          return acc.map((item) => item && item[part]).filter((v) => v !== undefined);
        }
        return acc && acc[part];
      }, obj);
    };

    const value = query.element ? getValueByPath(json, query.element) : json;

    // If value is an array and subQuery is present, map each item
    if (Array.isArray(value) && query.subQuery && query.subQuery.length > 0) {
      const group: Record<string, unknown>[] = [];
      for (const item of value) {
        const entry: Record<string, unknown> = {};
        for (const subQuery of query.subQuery) {
          if (!subQuery.element) continue; // Skip if no label
          const subValue = subQuery.element ? getValueByPath(item, subQuery.element) : item;
          addResult(entry, subQuery, subValue);
          // entry[subQuery.label] = subValue;
        }
        group.push(entry);
      }
      results.push({ [query.label]: group });
    } else if (Array.isArray(value)) {
      // If no subQuery, just map values directly
      const entry: Record<string, unknown> = {};
      addResult(entry, query, value);
      results.push(entry);
    } else if (query.subQuery && query.subQuery.length > 0 && value && typeof value === "object") {
      // Single object with subqueries
      const entry: Record<string, unknown> = {};
      for (const subQuery of query.subQuery) {
        const subValue = subQuery.element ? getValueByPath(value, subQuery.element) : value;
        addResult(entry, subQuery, subValue);
        // entry[subQuery.label] = subValue;
      }
      results.push({ [query.label]: entry });
    } else if (value !== undefined) {
      // Single value
      const entry: Record<string, unknown> = {};
      addResult(entry, query, value);
      results.push(entry);
      // results.push({ [query.label]: value });
    }
  }

  if (results.length > 1) {
    const merged: Record<string, unknown> = {};
    for (const obj of results) {
      for (const key in obj) {
        merged[key] = obj[key];
      }
    }
    results = [merged];
  }

  return new ScraperResponse({ url: payload.url, results });
}

function addResult(result: Record<string, unknown>, query: ScraperQuery, value: unknown): Record<string, unknown> {
  if (value == null || value === "") {
    return result;
  }
  if (query.transformProcess != undefined && typeof value != "object") {
    value = query.transformProcess(value as string);
  }

  if (result[query.label] && Array.isArray(result[query.label])) {
    if (Array.isArray(value)) {
      (result[query.label] as unknown[]).concat(value);
    } else {
      (result[query.label] as unknown[]).push(value);
    }
  } else if (result[query.label]) {
    if (Array.isArray(value)) {
      result[query.label] = (result[query.label] as unknown[]).concat(value);
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

function transformResult(result: Record<string, unknown>, query: ScraperQuery, value: unknown): Record<string, unknown> {
  if (value == null || value === "") {
    return result;
  }
  if (query.finalTransformProcess != undefined) {
    value = query.finalTransformProcess(value as any);
  }
  result[query.label] = value;
  return result;
}

async function fetchHtml(payload: ScraperPayload): Promise<Document | Record<string, unknown> | null> {
  console.log(`Fetching HTML from: ${payload.url}`);
  const response = await fetch.fetch(payload);

  if (!response.ok) {
    console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    return null;
  }
  const content = await response.text();
  try {
    return JSON.parse(content);
  } catch {
    return new DOMParser().parseFromString(content, "text/html");
  }
}

export function configureAstralBrowser(ws: string, token: string) {
  fetch.setWs(ws);
  fetch.setToken(token);
}
