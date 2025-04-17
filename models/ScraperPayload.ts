import ScraperQuery from "./ScraperQuery.ts";

class ScraperPayload {
  url: string;
  query: ScraperQuery[];

  constructor({ url, query }: { url: string; query: ScraperQuery[] }) {
    this.url = url;
    this.query = query;
  }

  toJson(): Record<string, unknown> {
    return {
      url: this.url,
      query: this.query.map((e) => e.toJson()),
    };
  }

  static fromJson(json: Record<string, unknown>): ScraperPayload {
    return new ScraperPayload({
      url: json["url"] as string,
      query: (json["query"] as Array<Record<string, unknown>>)?.map((e) => ScraperQuery.fromJson(e)),
    });
  }
}

export default ScraperPayload;
