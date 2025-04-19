import ScraperRegex from "./ScraperRegex.ts";

class ScraperQuery {
  label: string;
  element: string | undefined;
  getContent: boolean;
  withHref: boolean;
  dataProp?: string;
  subQuery?: ScraperQuery[];
  selectItemsAtIndex: number[];
  regex?: ScraperRegex;

  constructor({
    label,
    element,
    getContent = true,
    withHref = false,
    dataProp,
    subQuery,
    selectItemsAtIndex,
    regex,
  }: {
    label: string;
    element?: string;
    getContent?: boolean;
    withHref?: boolean;
    dataProp?: string;
    subQuery?: ScraperQuery[];
    selectItemsAtIndex?: number[];
    regex?: ScraperRegex;
  }) {
    this.label = label;
    this.element = element;
    this.getContent = getContent;
    this.withHref = withHref;
    this.dataProp = dataProp;
    this.subQuery = subQuery;
    this.selectItemsAtIndex = selectItemsAtIndex ?? [];
    this.regex = regex;
  }

  static fromJson(json: Record<string, unknown>): ScraperQuery {
    return new ScraperQuery({
      label: json["label"] as string,
      element: json["element"] as string,
      getContent: json["getContent"] as boolean,
      withHref: json["withHref"] as boolean,
      dataProp: json["dataProp"] as string,
      subQuery: (json["subQuery"] as Array<Record<string, unknown>>)?.map((e) => ScraperQuery.fromJson(e)) ?? [],
      selectItemsAtIndex: (json["selectItemsAtIndex"] as Array<number>) ?? [],
      regex: json["regex"] ? ScraperRegex.fromJson(json["regex"] as Record<string, unknown>) : undefined,
    });
  }

  toJson(): Record<string, unknown> {
    return {
      label: this.label,
      element: this.element,
      getContent: this.getContent,
      withHref: this.withHref,
      dataProp: this.dataProp,
      subQuery: this.subQuery?.map((e) => e.toJson()),
      selectItemsAtIndex: this.selectItemsAtIndex ?? [],
      regex: this.regex ? this.regex.toJson() : undefined,
    };
  }
}

export default ScraperQuery;
