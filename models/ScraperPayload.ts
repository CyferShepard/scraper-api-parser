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
  body: Record<string, unknown> | FormData;
  bodyType: BodyType;
  waitForPageLoad: boolean;
  waitForElement: string | null;
  query: ScraperQuery[];

  constructor({
    url,
    type = HTTPMethod.GET,
    body = {},
    bodyType = BodyType.JSON,
    waitForPageLoad = false,
    waitForElement,
    query,
  }: {
    url: string;
    type?: HTTPMethod;
    body?: Record<string, unknown> | FormData;
    bodyType?: BodyType;
    waitForPageLoad?: boolean;
    waitForElement?: string | null;
    query: ScraperQuery[];
  }) {
    this.url = url;
    this.type = type;
    this.body = body;
    this.bodyType = bodyType;
    this.waitForPageLoad = waitForPageLoad;
    this.waitForElement = waitForElement || null;
    this.query = query;
  }

  toJson(): Record<string, unknown> {
    return {
      url: this.url,
      type: this.type,
      body: new URLSearchParams(this.body as Record<string, string>).toString(),
      bodyType: this.bodyType,
      waitForPageLoad: this.waitForPageLoad,
      waitForElement: this.waitForElement || null,
      query: this.query.map((e) => e.toJson()),
    };
  }

  static fromJson(json: Record<string, unknown>): ScraperPayload {
    let body: Record<string, unknown> | FormData = {};

    if (typeof json["body"] === "string") {
      if (json["bodyType"] === BodyType.FORM_DATA) {
        // Convert URL-encoded string back to FormData
        const formData = new FormData();
        const params = new URLSearchParams(json["body"]);
        for (const [key, value] of params.entries()) {
          formData.append(key, value);
        }
        body = formData;
      }
    } else {
      body = json["body"] as Record<string, unknown>;
    }

    return new ScraperPayload({
      url: json["url"] as string,
      type: (json["type"] as HTTPMethod) || HTTPMethod.GET,
      body: body,
      bodyType: (json["bodyType"] as BodyType) || BodyType.JSON,
      waitForPageLoad: (json["waitForPageLoad"] as boolean) || false,
      waitForElement: (json["waitForElement"] as string) || null,
      query: (json["query"] as Array<Record<string, unknown>>)?.map((e) => ScraperQuery.fromJson(e)),
    });
  }
}

export { ScraperPayload, HTTPMethod, BodyType };
