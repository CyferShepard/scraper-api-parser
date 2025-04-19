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

enum BodyType {
  JSON = "JSON",
  FORM_DATA = "FORM_DATA",
}

class ScraperPayload {
  url: string;
  type: HTTPMethod;
  body: Record<string, unknown>;
  bodyType: BodyType;
  query: ScraperQuery[];

  constructor({
    url,
    type = HTTPMethod.GET,
    body = {},
    bodyType = BodyType.JSON,
    query,
  }: {
    url: string;
    type?: HTTPMethod;
    body?: Record<string, unknown>;
    bodyType?: BodyType;
    query: ScraperQuery[];
  }) {
    this.url = url;
    this.type = type;
    this.body = body;
    this.bodyType = bodyType;
    this.query = query;
  }

  toJson(): Record<string, unknown> {
    return {
      url: this.url,
      type: this.type,
      body: this.body,
      bodyType: this.bodyType,
      query: this.query.map((e) => e.toJson()),
    };
  }

  static fromJson(json: Record<string, unknown>): ScraperPayload {
    return new ScraperPayload({
      url: json["url"] as string,
      type: (json["type"] as HTTPMethod) || HTTPMethod.GET,
      body: json["body"] as Record<string, unknown>,
      bodyType: (json["bodyType"] as BodyType) || BodyType.JSON,
      query: (json["query"] as Array<Record<string, unknown>>)?.map((e) => ScraperQuery.fromJson(e)),
    });
  }
}

export { ScraperPayload, HTTPMethod, BodyType };
