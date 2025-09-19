# CMF v0.0.1 Specification

## Overview

The Chess Meld Format (CMF) version 0.0.1 is a structured format designed to represent chess game data, including moves, evaluations, and branching variations. It is intended to be both human-readable and machine-parsable, facilitating analysis, sharing, and processing of chess information.

CMF v0.0.1 provides a flexible yet consistent way to capture the evolution of a chess game, including alternative lines, precomputed evaluations, and metadata about the game's progress.

## Design Principles

- **Clarity:** The format is designed to be easy to read and understand by humans.
- **Extensibility:** Supports branching and annotations to cover complex game scenarios.
- **Efficiency:** Enables precomputed evaluations to optimize analysis workflows.
- **Compatibility:** Suitable for integration with various chess engines and tools.

## Document Structure

A CMF v0.0.1 document is a Markdown file structured into sections and subsections that describe the game state and events. The main components include:

- **Header:** Metadata about the document and version.
- **Events:** A chronological list of game events such as moves, evaluations, and annotations.
- **Branches:** Variations and alternative lines captured as nested event sequences.
- **Precomputed Evaluations:** Cached analysis results to speed up processing.

## Events

Events represent discrete actions or states in the chess game. Each event is recorded with relevant details.

### Move Event

A move event records a single chess move in standard algebraic notation.

**Example:**

```
- Move: e4
```

### Evaluation Event

An evaluation event provides engine analysis of a position, including score and depth.

**Example:**

```
- Evaluation:
    Score: +0.34
    Depth: 20
    Engine: Stockfish 14
```

### Annotation Event

Annotations provide human commentary or notes on a particular position or move.

**Example:**

```
- Annotation: "Strong central control achieved."
```

## Branching

Branches capture alternative lines or variations from a given position. Branches are nested sequences of events representing different continuations.

**Example:**

```
- Branch:
    - Move: Nf3
    - Move: d5
    - Branch:
        - Move: c4
        - Move: e6
```

## Precomputed Evaluations

To optimize analysis, CMF v0.0.1 supports embedding precomputed evaluations. These are stored alongside move events and include engine details and evaluation metrics.

**Example:**

```
- Move: e4
  PrecomputedEvaluation:
    Score: +0.20
    Depth: 18
    Engine: Stockfish 14
```

## Example Document

```markdown
# Chess Meld Format v0.0.1

- Move: e4
  PrecomputedEvaluation:
    Score: +0.20
    Depth: 18
    Engine: Stockfish 14

- Move: c5

- Branch:
    - Move: Nf3
    - Move: d6
    - Evaluation:
        Score: +0.10
        Depth: 22
        Engine: Stockfish 14
```

## Versioning

CMF v0.0.1 is the initial alpha release of the Chess Meld Format. Future versions may introduce additional features or structural changes while maintaining backward compatibility where possible.

## Usage Notes

- Tools parsing CMF v0.0.1 documents should handle nested branches gracefully.
- Precomputed evaluations are optional but recommended for performance optimization.
- Human annotations enhance understanding but do not affect automated processing.
- Adherence to standard algebraic notation for moves is required.

For further details or contributions, please refer to the project repository or contact the maintainers.
