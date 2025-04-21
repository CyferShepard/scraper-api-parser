import { launch } from "https://deno.land/x/astral/mod.ts";
import { ScraperPayload } from "../models/ScraperPayload.ts";

class Fetch {
  static async fetch(payload: ScraperPayload): Promise<Response> {
    if (payload.waitFor && payload.waitFor.trim() !== "") {
      // Use Puppeteer if waitFor is set
      return await this.fetchWithPuppeteer(payload);
    } else {
      // Use Deno's native fetch otherwise
      return await this.fetchWithNative(payload);
    }
  }

  private static async fetchWithPuppeteer(payload: ScraperPayload): Promise<Response> {
    const browser = await launch();

    const page = await browser.newPage();

    try {
      // Navigate to the URL
      await page.goto(payload.url, { waitUntil: "networkidle2" });
      const body = await page.content(); // Get the response from Puppeteer
      if (!body) {
        console.error(`Failed to load page: ${payload.url}`);
        await browser.close();
        return new Response(null, { status: 500 });
      }

      // Wait for the specified element
      await page.waitForSelector(payload.waitFor, { timeout: 10000 });

      const response = new Response(body, {
        status: 200, // Astral doesn't provide HTTP status, so assume 200
        statusText: "OK",
        headers: new Headers(), // Astral doesn't provide headers, so leave empty
      });

      await browser.close();
      return response;
    } catch (error) {
      console.error(`Error fetching URL with Puppeteer: ${error}`);
      await browser.close();
      return new Response(null, { status: 500 });
    }
  }

  private static async fetchWithNative(payload: ScraperPayload): Promise<Response> {
    let response;
    let headers: HeadersInit = {};
    let body: string | null = null;
    switch (payload.bodyType) {
      case "FORM_DATA":
        headers = {
          "Content-Type": "application/x-www-form-urlencoded",
        };
        body = new URLSearchParams(payload.body as Record<string, string>).toString(); // Assuming the first query contains the data to be sent
        break;
      case "JSON":
        headers = {
          "Content-Type": "application/json",
        };
        body = JSON.stringify(payload.body); // Assuming the first query contains the data to be sent
        break;
      default:
        headers = {};
    }
    switch (payload.type) {
      case "POST":
        response = await fetch(payload.url, {
          method: "POST",
          headers: headers,
          body: body, // Assuming the first query contains the data to be sent
        });
        break;
      default:
        response = await fetch(payload.url);
        break;
    }

    return response;
  }
}

export default Fetch;
