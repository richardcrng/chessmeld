import { z } from "zod";

// ——— Primitives ———
const TimestampMs = z.number().int().min(0);
const ColorSquare = z.string().regex(/^[a-h][1-8]$/);
const Arrow = z.tuple([ColorSquare, ColorSquare]);

// ——— Events ———
const EventBase = z.object({
  t: TimestampMs,
  type: z.string(),
});

const MoveEvent = EventBase.extend({
  type: z.literal("move"),
  san: z.string().min(1),
  comment: z.string().optional(),
});

const AnnotateEvent = EventBase.extend({
  type: z.literal("annotate"),
  arrows: z.array(Arrow).optional(),
  circles: z.array(ColorSquare).optional(),
  note: z.string().optional(),
});

const TextEvent = EventBase.extend({
  type: z.literal("text"),
  text: z.string().min(1),
});

const PausePointEvent = EventBase.extend({
  type: z.literal("pausepoint"),
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  prompt: z.string().optional(),
});

const BranchStartEvent = EventBase.extend({
  type: z.literal("branch.start"),
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  label: z.string().optional(),
});

const BranchEndEvent = EventBase.extend({
  type: z.literal("branch.end"),
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
});

const NavigationEvent = EventBase.extend({
  type: z.literal("navigate"),
  action: z.enum(["click", "back", "forward", "jump"]),
  targetMoveIndex: z.number().int().min(-1),
  sourceMoveIndex: z.number().int().min(-1).optional(),
  comment: z.string().optional(),
});

const Event = z.discriminatedUnion("type", [
  MoveEvent,
  AnnotateEvent,
  TextEvent,
  PausePointEvent,
  BranchStartEvent,
  BranchEndEvent,
  NavigationEvent,
]);

const EventList = z.array(Event);

// ——— Precomputed eval ———
const PrecomputedEval = z.object({
  fen: z.string().min(1),
  depth: z.number().int().min(1),
  cp: z.number().int().optional(),
  mate: z.number().int().optional(),
  best: z.array(z.string().min(1)).max(5).optional(),
}).refine((x) => x.cp !== undefined || x.mate !== undefined, {
  message: "Precomputed eval requires cp or mate.",
  path: ["cp"], // anchor somewhere reasonable
});

// ——— CMF ———
export const ChessmeldMeldSchema = z.object({
  schema: z.literal("cmf.v0.0.1"),
  meta: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    author: z.string().min(1),
    createdAt: z.string().datetime(), // ISO 8601
    startingFen: z.string().min(1),
    audioUrl: z.string().url().optional(),
    transcriptUrl: z.string().url().optional(),
    durationMs: z.number().int().min(0),
    tags: z.array(z.string().min(1)).optional(),
    engineHints: z.boolean().optional(),
  }),
  tracks: z.object({
    mainline: EventList,
    branches: z.record(
      z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
      EventList
    ).optional(),
  }),
  overlays: z.object({
    legend: z.string().optional(),
  }).optional(),
  precomputed: z.array(PrecomputedEval).optional(),
});

export type ChessmeldMeld = z.infer<typeof ChessmeldMeldSchema>;

// Convenience function with nice error output
export function parseMeld(input: unknown): { ok: true; data: ChessmeldMeld } | { ok: false; errors: string[] } {
  const res = ChessmeldMeldSchema.safeParse(input);
  if (res.success) return { ok: true, data: res.data };
  const errors = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  return { ok: false, errors };
}