import ScraperQuery from "./ScraperQuery.ts";

enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

class ScraperPayload {
  type: HTTPMethod;
  body: Record<string, unknown>;
  url: string;
  query: ScraperQuery[];

  constructor({
    url,
    type = HTTPMethod.GET,
    body = {},
    query,
  }: {
    url: string;
    type?: HTTPMethod;
    body?: Record<string, unknown>;
    query: ScraperQuery[];
  }) {
    this.url = url;
    this.type = type;
    this.body = body;
    this.query = query;
  }

  toJson(): Record<string, unknown> {
    return {
      url: this.url,
      type: this.type,
      body: this.body,
      query: this.query.map((e) => e.toJson()),
    };
  }

  static fromJson(json: Record<string, unknown>): ScraperPayload {
    return new ScraperPayload({
      url: json["url"] as string,
      type: (json["type"] as HTTPMethod) || HTTPMethod.GET,
      body: json["body"] as Record<string, unknown>,
      query: (json["query"] as Array<Record<string, unknown>>)?.map((e) => ScraperQuery.fromJson(e)),
    });
  }
}

export { ScraperPayload, HTTPMethod };
