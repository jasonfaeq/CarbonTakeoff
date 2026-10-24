import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { createAnthropicProvider, DEFAULT_MODEL } from "./anthropic";
import { extractionInputSchema, LlmError, RECORD_TOOL_NAME, validateExtractedLines } from "./types";

const request = {
  pages: [{ page: 3, text: "620 m3 of C30/37 concrete" }],
  catalogue: [{ id: "concrete-c30-37", name: "Ready-mix concrete C30/37", unit: "kg CO2e/m3" }],
};

const toolInput = {
  lines: [
    {
      material: "Concrete",
      description: "Slab concrete C30/37",
      quantity: 620,
      unit: "m3",
      page: 3,
      source_snippet: "620 m3 of C30/37 concrete",
      confidence: 0.95,
      suggested_factor_id: "concrete-c30-37",
      kg_per_unit: null,
      unit_price_eur: null,
      section: "Foundation",
    },
  ],
};

function fakeClient(response: Partial<Anthropic.Message>) {
  const create = vi.fn().mockResolvedValue({ stop_reason: "tool_use", content: [], ...response });
  return { client: { messages: { create } } as unknown as Pick<Anthropic, "messages">, create };
}

const toolUse = [{ type: "tool_use", id: "1", name: RECORD_TOOL_NAME, input: toolInput }] as Anthropic.Message["content"];

describe("Anthropic provider", () => {
  it("defaults to a small, fast model", () => {
    expect(DEFAULT_MODEL).toBe("claude-haiku-5-5");
  });

  it("sends one strict tool, catalogue-limited ids and only the selected pages", async () => {
    const { client, create } = fakeClient({ content: toolUse });
    const result = await createAnthropicProvider(client, "test-model").extract(request);
    expect(result.lines[0]).toMatchObject({ quantity: 620, section: "Foundation" });
    const body = create.mock.calls[0][0];
    expect(body.model).toBe("test-model");
    expect(body.tools[0].strict).toBe(true);
    expect(body.tools[0].input_schema.properties.lines.items.properties.suggested_factor_id.anyOf[0].enum).toEqual(["concrete-c30-37"]);
    expect(body.messages[0].content).toContain('<page number="3">');
  });

  it("refuses a truncated response rather than return part of a list", async () => {
    const { client } = fakeClient({ stop_reason: "max_tokens", content: toolUse });
    await expect(createAnthropicProvider(client, "m").extract(request)).rejects.toBeInstanceOf(LlmError);
  });

  it("handles a refusal and a response with no tool call", async () => {
    const refusal = fakeClient({ stop_reason: "refusal" });
    await expect(createAnthropicProvider(refusal.client, "m").extract(request)).rejects.toBeInstanceOf(LlmError);
    const none = fakeClient({ stop_reason: "end_turn", content: [] });
    await expect(createAnthropicProvider(none.client, "m").extract(request)).rejects.toThrow(/No tool call/);
  });
});

describe("tool input validation", () => {
  const ids = new Set(["rebar"]);

  it("drops a factor id that is not in the catalogue", () => {
    const [line] = validateExtractedLines({ lines: [{ ...toolInput.lines[0], suggested_factor_id: "made-up" }] }, ids);
    expect(line.suggested_factor_id).toBeNull();
  });

  it("skips malformed rows and rejects a malformed body", () => {
    expect(validateExtractedLines({ lines: [{ description: 1 }] }, ids)).toEqual([]);
    expect(() => validateExtractedLines({ nope: true }, ids)).toThrow(LlmError);
  });

  it("marks every field required, as strict tools need", () => {
    const items = extractionInputSchema(["a"]).properties.lines.items;
    expect([...items.required].sort()).toEqual(Object.keys(items.properties).sort());
  });
});
