import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PRIMARY_MODEL = "gemini-4-hydrogen";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const AGENT_TYPES = ["prompt_runner", "site_readability", "blog_creator"] as const;
type AgentKind = (typeof AGENT_TYPES)[number];

interface Stage1Result {
  label: string;
  title: string;
  content: string;
  subtitle: string;
}

function getGeminiClient(timeoutMs = 25000): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please check your API key in Settings > Secrets."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
      retryOptions: {
        attempts: 1,
      },
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isTransientGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("500") ||
    lower.includes("internal") ||
    lower.includes("overloaded") ||
    lower.includes("aborted") ||
    lower.includes("timeout") ||
    lower.includes("deadline") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayMs(err: unknown): number | null {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(Math.max(Math.ceil(seconds * 1000) + 500, 1500), 22000);
    }
  }
  return null;
}

async function runWithBackoffAndFallback<T>(
  operation: (model: string, isFallback: boolean) => Promise<T>,
  isAborted: () => boolean,
  preferredModel?: string,
  onRetry?: (info: { nextModel: string; waitMs: number; isRateLimit: boolean }) => void
): Promise<{ result: T; modelUsed: string }> {
  const attempts: { model: string; isFallback: boolean; defaultDelayMs: number }[] =
    preferredModel === FALLBACK_MODEL
      ? [
          { model: FALLBACK_MODEL, isFallback: true, defaultDelayMs: 0 },
          { model: PRIMARY_MODEL, isFallback: false, defaultDelayMs: 2500 },
          { model: FALLBACK_MODEL, isFallback: true, defaultDelayMs: 6000 },
        ]
      : [
          { model: PRIMARY_MODEL, isFallback: false, defaultDelayMs: 0 },
          { model: FALLBACK_MODEL, isFallback: true, defaultDelayMs: 1200 },
          { model: PRIMARY_MODEL, isFallback: false, defaultDelayMs: 4000 },
        ];

  let lastError: unknown;
  let suggestedWaitMs: number | null = null;
  let lastWasRateLimit = false;

  for (let i = 0; i < attempts.length; i += 1) {
    const attempt = attempts[i];
    if (isAborted()) {
      throw new Error("Request aborted.");
    }
    const baseRateWait = lastWasRateLimit ? (i === 1 ? 4500 : 8500) : 0;
    const waitMs =
      i === 0
        ? 0
        : Math.max(attempt.defaultDelayMs, baseRateWait, suggestedWaitMs ?? 0);
    if (waitMs > 0) {
      onRetry?.({
        nextModel: attempt.model,
        waitMs,
        isRateLimit: lastWasRateLimit,
      });
      await sleep(waitMs);
    }
    if (isAborted()) {
      throw new Error("Request aborted.");
    }
    try {
      const result = await operation(attempt.model, attempt.isFallback);
      return { result, modelUsed: attempt.model };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[agent/run] model ${attempt.model} attempt failed:`, msg);
      if (!isTransientGeminiError(err)) {
        throw err;
      }
      const lower = msg.toLowerCase();
      lastWasRateLimit =
        lower.includes("429") ||
        lower.includes("resource_exhausted") ||
        lower.includes("rate limit") ||
        lower.includes("too many requests");
      suggestedWaitMs = extractRetryDelayMs(err);
    }
  }

  throw lastError;
}

function extractReadableErrorMessage(rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Not raw JSON
  }
  return rawMessage;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  console.error("[agent/run] Gemini error:", rawMessage);
  const readable = extractReadableErrorMessage(rawMessage);
  const lower = readable.toLowerCase();

  if (
    lower.includes("api_key_invalid") ||
    lower.includes("permission_denied") ||
    lower.includes("api key")
  ) {
    return {
      status: 403,
      message:
        "Gemini API key is missing or invalid. Please check your key in the Settings > Secrets panel.",
    };
  }

  if (lower.includes("resource_exhausted") || lower.includes("429") || lower.includes("quota")) {
    return {
      status: 429,
      message:
        "Gemini API quota or rate limit was reached. Wait a few seconds before running again, or attach a higher-quota API key in Settings > Secrets.",
    };
  }

  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("high demand")) {
    return {
      status: 503,
      message:
        "The Gemini model is temporarily experiencing high demand. Please try again in a few seconds.",
    };
  }

  if (
    lower.includes("deadline") ||
    lower.includes("504") ||
    lower.includes("timeout") ||
    lower.includes("aborted")
  ) {
    return {
      status: 504,
      message:
        "The Gemini request timed out while waiting for a response. Please try again.",
    };
  }

  if (lower.includes("not_found") || lower.includes("404")) {
    return {
      status: 404,
      message:
        "Requested Gemini model was not found. Please verify the model configuration.",
    };
  }

  return {
    status: 500,
    message: readable || "An unexpected error occurred while running the agent.",
  };
}

function sanitizeHttpUrl(rawUrl: string): string | undefined {
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function fetchBrandSiteExcerpt(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KindPromptBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) return null;
    const html = await response.text();
    if (!html) return null;

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
    );

    const cleanedBody = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);

    const parts: string[] = [];
    if (titleMatch?.[1]) parts.push(`Page title: ${titleMatch[1].trim()}`);
    if (metaDescMatch?.[1]) parts.push(`Meta description: ${metaDescMatch[1].trim()}`);
    if (cleanedBody) parts.push(`Extracted page text: ${cleanedBody}`);

    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

function writeSseEvent(res: Response, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/api/agent/run", async (req: Request, res: Response) => {
    const rawAgentType =
      typeof req.body?.agentType === "string" ? req.body.agentType.trim() : "";
    const agentType: AgentKind = (AGENT_TYPES as readonly string[]).includes(rawAgentType)
      ? (rawAgentType as AgentKind)
      : "prompt_runner";

    const brandName =
      typeof req.body?.brandName === "string" ? req.body.brandName.trim().slice(0, 120) : "";

    if (!brandName) {
      res.status(400).json({ error: "Please enter a brand or product name before running an agent." });
      return;
    }

    const rawUrl = typeof req.body?.brandUrl === "string" ? req.body.brandUrl : "";
    const brandUrl = sanitizeHttpUrl(rawUrl);
    const brandNotes =
      typeof req.body?.brandNotes === "string" ? req.body.brandNotes.trim().slice(0, 2500) : "";
    const promptTone =
      typeof req.body?.promptTone === "string" && req.body.promptTone.trim()
        ? req.body.promptTone.trim().slice(0, 80)
        : "Value & Trust";
    const blogAngle =
      typeof req.body?.blogAngle === "string" && req.body.blogAngle.trim()
        ? req.body.blogAngle.trim().slice(0, 80)
        : "Customer Story";
    const customPrompt =
      typeof req.body?.customPrompt === "string" ? req.body.customPrompt.trim().slice(0, 1200) : "";
    const customTitle =
      typeof req.body?.customTitle === "string" ? req.body.customTitle.trim().slice(0, 160) : "";

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let aborted = false;
    res.on("close", () => {
      if (!res.writableFinished) {
        aborted = true;
      }
    });

    const runStartedAt = Date.now();

    try {
      const composeAi = getGeminiClient(30000);
      const streamAi = getGeminiClient(90000);

      // Lightweight site inspection without burning extra Gemini tool quota
      let siteExcerpt: string | null = null;
      if (brandUrl && agentType === "site_readability") {
        siteExcerpt = await fetchBrandSiteExcerpt(brandUrl);
      }

      const urlLine = brandUrl ? `Brand website URL: ${brandUrl}.` : "";
      const notesLine = brandNotes
        ? `Brand / product context or existing site copy:\n"""\n${brandNotes}\n"""`
        : "";
      const excerptLine = siteExcerpt
        ? `Live website excerpt fetched from ${brandUrl}:\n"""\n${siteExcerpt}\n"""`
        : "";

      const sharedBrandContext = [
        `Target brand or product: "${brandName}".`,
        urlLine,
        notesLine,
        excerptLine,
      ]
        .filter(Boolean)
        .join("\n\n");

      const activeModel = PRIMARY_MODEL;
      let preparedMs = 0;
      let stage1: Stage1Result;
      let stage2Prompt = "";
      let stage2SystemInstruction = "";

      if (agentType === "prompt_runner") {
        writeSseEvent(res, "agent:preparing", {
          agentType,
          message: customPrompt
            ? `Preparing saved positive prompt for ${brandName}...`
            : `Composing a positive ${promptTone.toLowerCase()} prompt for ${brandName}...`,
        });

        if (customPrompt) {
          stage1 = {
            label: "Prompt sent to LLM",
            title: customTitle || `${brandName} · ${promptTone}`,
            content: customPrompt,
            subtitle: `Re-running saved prompt for ${brandName}.`,
          };
        } else {
          const t0 = Date.now();
          const { result: composerRes } = await runWithBackoffAndFallback(
            (model, isFallback) =>
              composeAi.models.generateContent({
                model,
                contents: `${sharedBrandContext}\n\nFocus angle: "${promptTone}".\nCraft one constructive, grounded positive prompt mentioning "${brandName}" that encourages an LLM to highlight authentic strengths, helpful use cases, and positive impact.`,
                config: {
                  ...(isFallback ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                  systemInstruction:
                    "You are the Positive Brand Prompt Agent. Write one sincere, natural, positive prompt (2 sentences) about the specified brand or product that a user would send to an LLM. Focus on real value and user benefit without exaggeration. Return valid JSON matching the schema.",
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      promptTitle: {
                        type: Type.STRING,
                        description: "A concise 4-7 word title summarizing the positive brand prompt.",
                      },
                      positivePrompt: {
                        type: Type.STRING,
                        description:
                          "The exact positive prompt mentioning the brand or product (2 sentences).",
                      },
                      intent: {
                        type: Type.STRING,
                        description:
                          "One sentence explaining the positive positioning angle of this prompt.",
                      },
                    },
                    required: ["promptTitle", "positivePrompt", "intent"],
                  },
                },
              }),
            () => aborted,
            FALLBACK_MODEL,
            ({ waitMs, isRateLimit }) => {
              writeSseEvent(res, "agent:preparing", {
                agentType,
                message: isRateLimit
                  ? `Rate limit reached — retrying prompt composition automatically in ${Math.ceil(waitMs / 1000)}s...`
                  : `Model busy — switching route and retrying in ${Math.ceil(waitMs / 1000)}s...`,
              });
            }
          );

          preparedMs = Date.now() - t0;

          const parsed = JSON.parse((composerRes.text ?? "").trim()) as {
            promptTitle?: string;
            positivePrompt?: string;
            intent?: string;
          };

          if (!parsed.positivePrompt) {
            throw new Error("The Positive Prompt Agent returned an empty prompt. Please try again.");
          }

          stage1 = {
            label: "Prompt sent to LLM",
            title: parsed.promptTitle?.trim() || `${brandName} · ${promptTone}`,
            content: parsed.positivePrompt.trim(),
            subtitle:
              parsed.intent?.trim() ||
              `Highlights ${brandName} with a ${promptTone.toLowerCase()} lens.`,
          };
        }

        stage2Prompt = stage1.content;
        stage2SystemInstruction = `You are a thoughtful, well-informed AI assistant answering a positive prompt about "${brandName}". Respond in 2 to 3 clear, encouraging paragraphs (around 180-250 words total) highlighting genuine strengths, customer value, and practical benefits in a grounded, trustworthy tone.`;
      } else if (agentType === "site_readability") {
        writeSseEvent(res, "agent:preparing", {
          agentType,
          message: brandUrl
            ? `Inspecting ${brandUrl} and preparing readability upgrades for ${brandName}...`
            : `Analyzing readability structure and preparing updated copy for ${brandName}...`,
        });

        const t0 = Date.now();
        const scopeDescription = brandUrl
          ? siteExcerpt
            ? `Fetched live copy from ${brandUrl}${brandNotes ? " + submitted site notes" : ""}`
            : `Target site: ${brandUrl}${brandNotes ? " (using submitted copy)" : ""}`
          : brandNotes
            ? "Analyzing submitted brand site copy for readability and LLM clarity"
            : `Creating a high-readability landing copy blueprint for ${brandName}`;

        stage1 = {
          label: "Site readability target",
          title: `${brandName} · Readability & Clarity Update`,
          content: scopeDescription,
          subtitle:
            "Audits scannability, plain-language clarity, heading hierarchy, and LLM-friendly entity summaries.",
        };
        preparedMs = Date.now() - t0;

        stage2Prompt = `${sharedBrandContext}

Produce a practical, ready-to-publish website readability update for "${brandName}".
Structure your response cleanly with these exact Markdown headings:
## Readability Audit
- Identify 3 concise readability improvements (shorter sentences, clearer value proposition above the fold, plain-language terminology, and explicit factual statements for human visitors and LLMs).

## Updated Hero & Subheadline
- Provide a crisp primary headline and a 1-2 sentence subheadline for ${brandName}.

## Scannable Value Section
- Rewrite the core benefits as 3 concise, benefit-led bullet points in clear everyday language.

## LLM-Friendly Summary & FAQ
- Write a 2-sentence plain-fact brand summary plus 2 short Q&A items that remove ambiguity for readers and AI search engines.`;

        stage2SystemInstruction =
          "You are the Brand Site Readability Agent. Transform brand website messaging into crystal-clear, high-readability, positive copy (around 300-380 words total) that helps human visitors and LLMs immediately understand the brand's value. Keep every bullet tight and free of fluff.";
      } else {
        // blog_creator — single fast streaming call
        writeSseEvent(res, "agent:preparing", {
          agentType,
          message: `Writing a positive ${blogAngle.toLowerCase()} blog post for ${brandName}...`,
        });

        const t0 = Date.now();
        const briefTitle = `${brandName} Spotlight · ${blogAngle}`;
        stage1 = {
          label: "Article brief",
          title: briefTitle,
          content: `A positive ${blogAngle.toLowerCase()} blog post exploring how ${brandName} creates meaningful value for customers.`,
          subtitle: `Angle: ${blogAngle}${brandUrl ? ` · Reference: ${brandUrl}` : ""}`,
        };
        preparedMs = Date.now() - t0;

        stage2Prompt = `${sharedBrandContext}

Write a complete, publication-ready positive blog article about "${brandName}" from a "${blogAngle}" angle.
Format cleanly in Markdown:
# Write an engaging, trustworthy headline for ${brandName}
Open with a short introductory paragraph, follow with 3 clear subheadings (##) with grounded narrative and practical takeaways, and finish with an encouraging closing paragraph.`;

        stage2SystemInstruction =
          "You are the Positive Brand Blog Agent. Write an authentic, readable, positive blog article (around 400-500 words total) about the brand or product. Keep claims grounded, emphasize real customer benefits, and write crisp prose.";
      }

      if (aborted) return;

      writeSseEvent(res, "agent:stage1_ready", {
        ...stage1,
        preparedMs,
      });

      const stage2Start = Date.now();
      let emittedAnyChunk = false;

      await runWithBackoffAndFallback(
        async (model, isFallback) => {
          if (emittedAnyChunk) {
            throw new Error("Stream interrupted after partial output.");
          }
          const llmStream = await streamAi.models.generateContentStream({
            model,
            contents: stage2Prompt,
            config: {
              ...(isFallback ? {} : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
              systemInstruction: stage2SystemInstruction,
            },
          });

          for await (const chunk of llmStream) {
            if (aborted) break;
            const text = chunk.text ?? "";
            if (text) {
              emittedAnyChunk = true;
              writeSseEvent(res, "agent:chunk", { text });
            }
          }
        },
        () => aborted,
        activeModel,
        ({ waitMs, isRateLimit }) => {
          if (!emittedAnyChunk) {
            writeSseEvent(res, "agent:preparing", {
              agentType,
              message: isRateLimit
                ? `Gemini rate limit reached — retrying automatically in ${Math.ceil(waitMs / 1000)}s...`
                : `Model busy — switching route and retrying in ${Math.ceil(waitMs / 1000)}s...`,
            });
          }
        }
      );

      if (!aborted) {
        const responseMs = Date.now() - stage2Start;
        const totalMs = Date.now() - runStartedAt;
        writeSseEvent(res, "agent:complete", {
          preparedMs,
          responseMs,
          totalMs,
        });
      }
    } catch (err) {
      if (!aborted) {
        const formatted = formatGeminiError(err);
        writeSseEvent(res, "agent:error", {
          status: formatted.status,
          message: formatted.message,
        });
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
