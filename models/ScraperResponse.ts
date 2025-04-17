class ScraperResponse {
  url: string;
  results: Record<string, unknown>[];

  constructor({ url, results }: { url: string; results: Record<string, unknown>[] }) {
    this.url = url;
    this.results = results;
  }

  static fromJson(json: Record<string, unknown>): ScraperResponse {
    return new ScraperResponse({
      url: json["url"] as string,
      results: json["results"] as Record<string, unknown>[],
    });
  }

  toJson(): Record<string, unknown> {
    return {
      url: this.url,
      results: this.results,
    };
  }
}

export default ScraperResponse;
