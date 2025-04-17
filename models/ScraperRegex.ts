class ScraperRegex {
  regex?: RegExp;
  process?: (match: RegExpMatchArray | null) => unknown;

  constructor(options: { regex?: RegExp; process?: (match: RegExpMatchArray | null) => unknown }) {
    this.regex = options.regex;
    this.process = options.process;
  }

  static fromJson(json: Record<string, unknown>): ScraperRegex {
    return new ScraperRegex({
      regex: json["regex"] ? new RegExp(json["regex"] as string) : undefined,
      process: json["process"] ? eval(json["process"] as string) : undefined,
    });
  }

  toJson(): Record<string, unknown> {
    return {
      regex: this.regex?.source,
      process: this.process?.toString(),
    };
  }
}

export default ScraperRegex;
