import { NETWORK_ORDER } from "@/lib/chains";

const network = { type: "string", enum: NETWORK_ORDER, description: "Where the money lands. Defaults to base." };
const expiresInHours = { type: "integer", enum: [24, 72, 168, 720], description: "How long they have to claim before the sender can take it back." };

/**
 * OpenAI-style tool definitions for the Agent API (any function-calling model accepts this shape).
 * Each tool maps to one endpoint; the model's arguments are the JSON body.
 */
const TOOLS = [
  {
    type: "function",
    function: {
      name: "plot_twist_create_gift",
      description: "Prepare a USDC gift link for one person (POST /api/v1/gifts). Nothing is paid until the user approves it at the returned approveUrl with their Kite passkey — give them that link.",
      parameters: {
        type: "object",
        properties: {
          brief: { type: "string", description: "One sentence: who it's for, the occasion, roughly how much. SERV designs the rest." },
          recipientName: { type: "string" }, occasion: { type: "string" }, amount: { type: "number", description: "US dollars, 5–500." },
          note: { type: "string", description: "Card message, up to 160 characters." }, network, expiresInHours,
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plot_twist_create_drop",
      description: "Prepare a Drop: pay a list of people with one approval, each with their own link and note (POST /api/v1/drops). The user approves it at the returned approveUrl with their Kite passkey.",
      parameters: {
        type: "object",
        properties: {
          brief: { type: "string", description: "What it's for and anything to mention about each person. SERV writes the notes." },
          title: { type: "string" },
          recipients: {
            type: "array",
            items: { type: "object", properties: { name: { type: "string" }, amount: { type: "number", description: "US dollars, 1–500." }, contact: { type: "string" }, note: { type: "string" } }, required: ["name", "amount"] },
          },
          network, expiresInHours,
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plot_twist_get_status",
      description: "Check a prepared gift or Drop (GET /api/v1/gifts/{id} or /api/v1/drops/{id}): pending_approval, awaiting_payment, live with the link(s), claimed.",
      parameters: { type: "object", properties: { kind: { type: "string", enum: ["gift", "drop"] }, id: { type: "string" } }, required: ["kind", "id"] },
    },
  },
];

export function GET() {
  return Response.json({ tools: TOOLS });
}
