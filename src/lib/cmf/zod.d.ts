import { z } from "zod";
export declare const ChessmeldMeldSchema: z.ZodObject<{
    schema: z.ZodLiteral<"cmf.v0.0.1">;
    meta: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        author: z.ZodString;
        createdAt: z.ZodString;
        startingFen: z.ZodString;
        audioUrl: z.ZodOptional<z.ZodString>;
        transcriptUrl: z.ZodOptional<z.ZodString>;
        durationMs: z.ZodNumber;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        engineHints: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        author: string;
        createdAt: string;
        startingFen: string;
        durationMs: number;
        audioUrl?: string | undefined;
        transcriptUrl?: string | undefined;
        tags?: string[] | undefined;
        engineHints?: boolean | undefined;
    }, {
        id: string;
        title: string;
        author: string;
        createdAt: string;
        startingFen: string;
        durationMs: number;
        audioUrl?: string | undefined;
        transcriptUrl?: string | undefined;
        tags?: string[] | undefined;
        engineHints?: boolean | undefined;
    }>;
    tracks: z.ZodObject<{
        mainline: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"move">;
            san: z.ZodString;
            comment: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        }, {
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"annotate">;
            arrows: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodString], null>, "many">>;
            circles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            note: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        }, {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "text";
            text: string;
        }, {
            t: number;
            type: "text";
            text: string;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"pausepoint">;
            id: z.ZodString;
            prompt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        }, {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"branch.start">;
            id: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        }, {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"branch.end">;
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            t: number;
            type: "branch.end";
        }, {
            id: string;
            t: number;
            type: "branch.end";
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"navigate">;
            action: z.ZodEnum<["click", "back", "forward", "jump"]>;
            targetMoveIndex: z.ZodNumber;
            sourceMoveIndex: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        }, {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        }>]>, "many">;
        branches: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"move">;
            san: z.ZodString;
            comment: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        }, {
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"annotate">;
            arrows: z.ZodOptional<z.ZodArray<z.ZodTuple<[z.ZodString, z.ZodString], null>, "many">>;
            circles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            note: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        }, {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "text";
            text: string;
        }, {
            t: number;
            type: "text";
            text: string;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"pausepoint">;
            id: z.ZodString;
            prompt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        }, {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"branch.start">;
            id: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        }, {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"branch.end">;
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            t: number;
            type: "branch.end";
        }, {
            id: string;
            t: number;
            type: "branch.end";
        }>, z.ZodObject<{
            t: z.ZodNumber;
        } & {
            type: z.ZodLiteral<"navigate">;
            action: z.ZodEnum<["click", "back", "forward", "jump"]>;
            targetMoveIndex: z.ZodNumber;
            sourceMoveIndex: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        }, {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        }>]>, "many">>>;
    }, "strip", z.ZodTypeAny, {
        mainline: ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[];
        branches?: Record<string, ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[]> | undefined;
    }, {
        mainline: ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[];
        branches?: Record<string, ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[]> | undefined;
    }>;
    overlays: z.ZodOptional<z.ZodObject<{
        legend: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        legend?: string | undefined;
    }, {
        legend?: string | undefined;
    }>>;
    precomputed: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        fen: z.ZodString;
        depth: z.ZodNumber;
        cp: z.ZodOptional<z.ZodNumber>;
        mate: z.ZodOptional<z.ZodNumber>;
        best: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        fen: string;
        depth: number;
        cp?: number | undefined;
        mate?: number | undefined;
        best?: string[] | undefined;
    }, {
        fen: string;
        depth: number;
        cp?: number | undefined;
        mate?: number | undefined;
        best?: string[] | undefined;
    }>, {
        fen: string;
        depth: number;
        cp?: number | undefined;
        mate?: number | undefined;
        best?: string[] | undefined;
    }, {
        fen: string;
        depth: number;
        cp?: number | undefined;
        mate?: number | undefined;
        best?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    schema: "cmf.v0.0.1";
    meta: {
        id: string;
        title: string;
        author: string;
        createdAt: string;
        startingFen: string;
        durationMs: number;
        audioUrl?: string | undefined;
        transcriptUrl?: string | undefined;
        tags?: string[] | undefined;
        engineHints?: boolean | undefined;
    };
    tracks: {
        mainline: ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[];
        branches?: Record<string, ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[]> | undefined;
    };
    overlays?: {
        legend?: string | undefined;
    } | undefined;
    precomputed?: {
        fen: string;
        depth: number;
        cp?: number | undefined;
        mate?: number | undefined;
        best?: string[] | undefined;
    }[] | undefined;
}, {
    schema: "cmf.v0.0.1";
    meta: {
        id: string;
        title: string;
        author: string;
        createdAt: string;
        startingFen: string;
        durationMs: number;
        audioUrl?: string | undefined;
        transcriptUrl?: string | undefined;
        tags?: string[] | undefined;
        engineHints?: boolean | undefined;
    };
    tracks: {
        mainline: ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[];
        branches?: Record<string, ({
            t: number;
            type: "move";
            san: string;
            comment?: string | undefined;
        } | {
            t: number;
            type: "annotate";
            arrows?: [string, string][] | undefined;
            circles?: string[] | undefined;
            note?: string | undefined;
        } | {
            t: number;
            type: "text";
            text: string;
        } | {
            id: string;
            t: number;
            type: "pausepoint";
            prompt?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.start";
            label?: string | undefined;
        } | {
            id: string;
            t: number;
            type: "branch.end";
        } | {
            t: number;
            type: "navigate";
            action: "back" | "forward" | "click" | "jump";
            targetMoveIndex: number;
            comment?: string | undefined;
            sourceMoveIndex?: number | undefined;
        })[]> | undefined;
    };
    overlays?: {
        legend?: string | undefined;
    } | undefined;
    precomputed?: {
        fen: string;
        depth: number;
        cp?: number | undefined;
        mate?: number | undefined;
        best?: string[] | undefined;
    }[] | undefined;
}>;
export type ChessmeldMeld = z.infer<typeof ChessmeldMeldSchema>;
export declare function parseMeld(input: unknown): {
    ok: true;
    data: ChessmeldMeld;
} | {
    ok: false;
    errors: string[];
};
//# sourceMappingURL=zod.d.ts.map