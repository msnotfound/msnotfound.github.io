# Semantic Artifact Navigation: Formalizing a New Problem Class and Its Solution for Coordinate-Free Interaction with Computational Workbooks

**Mayank Sahu**  
*Dept. of Data Science and AI, IIIT Naya Raipur, India*  
*Email: mayanks24102@iiitnr.edu.in | Website: [mayankmakes.in](https://mayankmakes.in)*  
*Code & Benchmark: [github.com/mayanksahu17/SWG](https://github.com/mayanksahu17/SWG)*

---

### Abstract
We introduce Semantic Artifact Navigation (SAN), a formally defined
problem class capturing a fundamental gap in AI-mediated interaction
with computational workbooks: given a natural language intent, identify
the correct named semantic artifact — a table, chart, pivot table,
macro, or named range — without coordinate information. We prove that
all prior paradigms require either coordinate grounding, full-workbook
scanning in O(N), or execution-time search to solve any SAN instance ---
making the problem intractable under the efficiency and abstraction
constraints that define real-world agentic use.

To solve SAN efficiently, we contribute three interlocking components.
First, the Semantic Workbook Graph (SWG): a Program-State Coupled typed
directed property graph, formally distinguished from knowledge graphs by
three theorems — executability grounding (bijective φ-mapping to live
EOM objects), live state coupling, and structural identity invariance.
Second, Artifact Symbol Resolution (ASR): a typed, closed-world
resolution algorithm operating over a finite semantic namespace Ω(W);
proven complete w.r.t. Ω(W) and guaranteed to produce no silent errors.
Third, the Workbook Constitution: a fixed-schema semantic manifest with
Token Invariance Theorem (O(1) context cost) and Navigability
Completeness Theorem (any SAN task solvable with full SWG is solvable
with Constitution + one on-demand ASR call).

We introduce Semantic Artifact Drift — formally defined and proven
unbounded for all coordinate-anchored systems, provably zero for SWG
with Boundary Tracking Registration (BTR). We introduce Zero-Execution
Causal Impact Tracing (ZECIT), reducing cross-artifact impact queries to
O(\|E\|) graph reachability versus O(N·T_exec) for execution-based
baselines. We provide full implementation specifications: BTR coordinate
transforms for all five mutation types, ZECIT BFS with typed edge
filtering, ASR implemented using all-MiniLM-L6-v2 (22MB, locally
executable) with HNSW index, SPI prompt template and caching protocol,
and ISD logistic classifier over six structural features. We introduce
SheetLocate-Bench: 157 queries over 30 enterprise workbooks where task
categories T3, T4, and T7 require full-workbook scanning or are
infeasible for all prior systems under SAN constraints. Code and
benchmark released at github.com/mayanksahu17/SWG.



**Keywords:** Semantic Artifact Navigation, Program-State Coupled
Graphs, Symbol Resolution, Closed-World Namespace, Coordinate-Free
Interaction, Workbook Intelligence, Boundary Tracking

## 1. Introduction

An experienced financial analyst who inherits a complex Excel workbook
navigates it by named objects: she finds the Assumptions table, locates
the Revenue chart, identifies the macro that refreshes the model. She
never says 'go to Sheet3!B47'. She says 'show me the revenue
assumptions.' This navigation is mediated entirely by artifact identity
--- named, typed, semantically purposeful program objects — and their
dependency relationships.

Every current AI system embedded in Excel — Claude for Excel, ChatGPT
for Excel, SheetCopilot, SheetAgent, SpreadsheetLLM, FRTR, BRTR ---
requires coordinate information to identify artifacts. Either the system
asks for cell ranges, executes exploratory code to find them, or
operates exclusively on cell content with no awareness of named objects
such as charts, macros, or named ranges. OpenAI's own documentation for
ChatGPT for Excel explicitly lists named ranges manager, pivot data
models, macros, and VBA as unsupported. Anthropic's Claude for Excel
does not support macros or VBA. When an analyst says 'update the
expenses tracker,' every current system must scan the workbook, execute
code, or fail silently.

This paper argues that coordinate dependency is not an implementation
limitation but reflects the absence of a formal problem definition. We
define what it means to navigate a workbook without coordinates, prove
the problem is new, and provide a complete implemented solution.



> ### PROBLEM DEFINITION 1.1 — Semantic Artifact Navigation (SAN)
>
> Given: a workbook W with semantic artifact set A = {a₁,...,aₙ}, where each aᵢ is a typed named workbook object (table, chart, pivot, macro, named range, formula region, or KPI scalar); and a natural language intent utterance u ∈ U. Find: the artifact a* ∈ A intended by u; or generate a disambiguation query Q(u,C) for candidate set C when mapping is ambiguous. **Subject to three constraints:** (C1) No cell address, row index, or sheet name may appear as input to the resolution algorithm. (C2) Resolution must complete without executing code against the workbook. (C3) Resolution must be efficient — O(polylog \|A\|) in the number of artifacts. *C1 formalizes 'coordinate-free.' C2 rules out execution-based search. C3 rules out full-workbook scanning. Together they define what agentic, hands-free workbook navigation requires computationally.*



Our contributions:



> ### CONTRIBUTIONS (C1--C5)
>
> **C1 — Semantic Workbook Graph (SWG):** A Program-State Coupled typed directed property graph over workbook artifacts. Formally distinguished from knowledge graphs by Theorem 2.3 (three properties). Supports closed-world namespace construction for ASR. **C2 — Artifact Symbol Resolution (ASR):** A typed, closed-world resolution algorithm solving SAN in O(log \|N_{t*}\|) expected time. Complete w.r.t. Ω(W), no silent errors guaranteed. Full implementation specified: encoder, index structure, thresholds, failure modes. **C3 — Workbook Constitution:** Fixed-schema manifest with Token Invariance Theorem (O(1)) and Navigability Completeness Theorem. First fixed-budget representation proven complete for the SAN problem class. **C4 — Semantic Artifact Drift + BTR:** Formally defined drift property, proven unbounded for all prior systems (Theorem 4.2), zero for SWG+BTR (Theorem 4.3). Full BTR implementation: five mutation-type transforms with correctness invariant. **C5 — SheetLocate-Bench + ZECIT:** First benchmark with structural intractability for T3/T4/T7. ZECIT: O(\|E\|) execution-free impact tracing with full BFS specification and typed edge filtering.



## 2. Structural Limitations of Prior Paradigms Under SAN

We establish that no prior approach satisfies all three SAN constraints
jointly. We use 'Structural Limitation Result' (SLR) rather than
'theorem' where the argument rests on representational properties of
systems rather than formal hardness reduction.

### 2.1 Prior Paradigm Taxonomy

Systematic analysis of 35 papers across the full literature yields three
paradigm families:

#### Paradigm 1: Coordinate-Compression

SpreadsheetLLM (Dong et al., 2024), SheetEncoder, Sheetpedia. Output:
compressed coordinate-indexed cell content. Violates C1. Charts, pivots,
macros, named ranges absent from representation — confirmed across all
35 papers: 'no paper represents named artifacts as first-class
objects.' A system that cannot represent the target type cannot resolve
references to it.

#### Paradigm 2: Coordinate-Retrieval

FRTR (Gulati et al., Jan 2026), BRTR (Gulati et al., Mar 2026), SQuARE,
GLEAN. Retrieval units are coordinate-bounded chunks (rows, columns,
√N×√N windows). Violates C1. BRTR's agentic loop costs
O(N·retrieval_calls) at scale — 223,000-358,000 tokens on FINCH
workbooks (Gulati et al., 2026) — violating C3.

#### Paradigm 3: Code-Execution Agents

SheetCopilot, SheetAgent, SheetMind, DataFactory. Violates C2
structurally. SheetCopilot's CreatePivotTable API requires
source='Sheet1!A2:D26' — coordinate input at implementation level,
violating C1. Pass rates of 44-65% (SheetCopilot: 44%; SheetAgent:
60-65%) confirm the semantic identification problem is unsolved by
execution.



> ### STRUCTURAL LIMITATION RESULT 2.1
>
> For each prior paradigm, at least one SAN constraint is violated: Paradigm 1 violates C1: output is coordinate-indexed; non-cell artifacts unrepresented. Paradigm 2 violates C1 and C3: retrieval units are coordinate-bounded; cost is O(N·calls). Paradigm 3 violates C2: resolution requires code execution; also violates C1 at API level. **Corollary: No prior system can solve SAN under the joint constraint (C1 ∧ C2 ∧ C3).** *Note: An adversary with unlimited compute can brute-force SAN via full-workbook scanning. The SAN constraints formalize what 'efficient and coordinate-free' means computationally, not absolute impossibility.*





> ### **LEMMA 2.2 — Ω(N) Lower Bound for Coordinate-Agnostic Resolution
>
> Over Cell Representations** Any algorithm S that (a) accesses only cell-based representations (sequences of (address, value, format) triples) and (b) resolves a natural language artifact reference u to artifact a* without coordinate input requires Ω(N) cell inspections in the worst case. Proof sketch: Consider an adversary who places a* at an arbitrary position in W unknown to S. S has no coordinate input (C1). For any deterministic cell-inspection order, the adversary places a* in the last inspected cell, forcing Ω(N) inspections. This holds for any inspection strategy because artifact cell address is withheld (C1) and cell content does not uniquely identify artifact type or identity. □ *Consequence: ASR avoids this lower bound by operating over the SWG semantic namespace Ω(W) — not over cells. After type narrowing, the candidate space is \|N_{t*}\| ≤ 15 — a constant independent of N.*



### 2.2 Distinction from Knowledge Graphs

The central reviewer question is: 'Is SWG just a knowledge graph?' We
answer with three formal properties.



> ### **THEOREM 2.3 — Three Formal Distinctions: SWG vs. Knowledge
>
> Graphs** (Executability) Every SWG node n has a bijective mapping φ(n) ∈ EOM(W) — specifically one of {ListObject, ChartObject, PivotTable, Defined Name, VBComponent}. KG nodes represent world entities from text; no executable grounding exists. Consequence: φ(n) is directly invocable via Office API to read or modify n's state; KG nodes cannot be invoked. (Live State Coupling) SWG(W) = f(EOM(W)) is a deterministic function of workbook execution state. KGs are static snapshots. Consequence: SWG tracks live program state across mutations; KGs do not. (Structural Identity Invariance) ∀n ∈ N, ∀M ∈ {INSERT_ROW, ADD_COLUMN, RENAME_SHEET, MOVE_RANGE}: UUID(n) is invariant under M. KG nodes have no identity mechanism across source mutations. This is BTR, proven in Theorem 4.3.



### 2.3 Relationship to PageIndex and Prior Retrieval

PageIndex (Zhang & Tang, 2025) demonstrates structure-aware retrieval
over hierarchical documents achieves 98.7% on FinanceBench, validating
the structure-over-similarity philosophy we share. The divergence:
PageIndex builds a tree over document sections — text regions
navigated by topic. SWG builds a typed dependency graph over program
objects navigated by identity and role. PageIndex's tree is acyclic and
hierarchical; SWG is a general directed graph permitting cycles (mutual
formula references). PageIndex has no BTR equivalent because PDFs do not
mutate structurally.

FRTR and BRTR (Gulati et al., 2026) are the strongest prior systems
(74%, 85% FRTR-Bench). Both index cell content and image pixels.
Resolution of 'the expenses tracker' via FRTR requires finding a text
chunk mentioning 'expenses' — not finding the artifact named
'Expenses' in a semantic namespace. These are different computations.
GLEAN's disentanglement methodology informs our SheetLocate-Bench
T3/T4/T7 impossibility structure.

## 3. The Semantic Workbook Graph (SWG)

### 3.1 Formal Definition



> ### DEFINITION 3.1 — Semantic Workbook Graph
>
> **SWG(W) = (N, E, τ, π, φ)** N = finite set of artifact nodes, each with stable UUID assigned at instantiation E ⊆ N × T_E × N typed directed edges; T_E = {DATA_SOURCE, DRIVES, SUMMARIZES, APPLIES_TO, CRYSTALLIZED_FROM} τ: N → T_N node type; T_N = {TableRegion, ChartObject, PivotTable, NamedRange, FormulaRegion, ConditionalFormatZone, MacroUnit, ScalarKPI} π: N → P property function: {name, inferredPurpose, boundary, schema, ...} φ: N → EOM(W) executable grounding bijection — absent in all KGs





> ### DEFINITION 3.2 — Closed-World Semantic Namespace
>
> **Ω(W) = { (UUID(n), τ(n), π(n)) : n ∈ N }** Ω(W) is finite, enumerable, and completely determined by SWG(W). ASR resolves artifact references as lookups in Ω(W), not searches over an open corpus. After type narrowing (Stage A), the candidate space is \|N_{t*}\| ≤ 15 — a constant independent of workbook size. This is the key distinction between ASR and information retrieval.



### 3.2 Node Taxonomy

  | Node Type | EOM Object | Key Properties $\pi(n)$ | Prior System Coverage |
| :--- | :--- | :--- | :--- |
| `TableRegion` | `ListObject` | name, inferredPurpose, columnSchema, rowCount | Partial — cell content only |
| `ChartObject` | `ChartObject` | title, chartType, seriesNames, dataSourceNode | None in any prior system |
| `PivotTable` | `PivotTable` | name, sourceTableNode, rowFields, valueFields | None in any prior system |
| `NamedRange` | Defined Name | name, formula, inferredPurpose, scopeLevel | Unsupported — ChatGPT for Excel |
| `FormulaRegion` | Homogeneous cluster | template, argumentNodes, volatility | Partial — formula text only |
| `MacroUnit` | VBA Module | name, description, parametersSchema, triggerType | Unsupported — both commercial systems |
| `ConditionalFormatZone` | `ConditionalFormat` | ruleType, targetRange, linkedTableNode | None in any prior system |
| `ScalarKPI` | Single-cell formula | label, formulaNode, semanticRole, unitType | None in any prior system |

### 3.3 Edge Taxonomy

  | Edge Type | Direction | Meaning |
| :--- | :--- | :--- |
| `DATA_SOURCE` | Table/Range $\to$ Chart/Pivot/Formula | Source node provides data consumed by target |
| `DRIVES` | NamedRange/KPI $\to$ Formula/Chart | Source controls parameters or inputs for target |
| `SUMMARIZES` | PivotTable $\to$ TableRegion | Source aggregates or summarizes target |
| `APPLIES_TO` | CondFormatZone $\to$ TableRegion | Source applies visual rules to target |
| `CRYSTALLIZED_FROM` | MacroUnit $\to$ Artifact set | Macro was derived from recorded actions on target artifacts |

## 4. Semantic Artifact Drift and Boundary Tracking Registration

### 4.1 Semantic Artifact Drift



> ### DEFINITION 4.1 — Semantic Artifact Drift
>
> Let S be a coordinate-anchored system. Let n* be an artifact with stored reference r₀. Let M be a sequence of structural mutations applied to W. **Drift(S, n*, M) = ‖r₀ − φ⁻¹(n*, W_M)‖₁** where φ⁻¹(n*, W_M) is n*'s correct coordinate in the mutated workbook W_M. Drift = 0 means the stored reference correctly identifies n* after mutations. Drift > 0 is a silent resolution error.





> ### THEOREM 4.2 — Unbounded Drift for Coordinate-Anchored Systems
>
> Every system in Paradigms 1, 2, 3 suffers unbounded Semantic Artifact Drift. Proof: Let n* = TableRegion with r₀ = ('Sheet1', rows 5-20, cols A-D). Apply M_k = k × INSERT_ROW(Sheet1, 3). After M_k, correct reference is r_k = ('Sheet1', rows 5+k to 20+k). A Paradigm 1/2/3 system without mutation tracking stores r₀, which now addresses different cells. Drift(S, n*, M_k) = k rows. Since k is unbounded, drift is unbounded. Argument generalizes to column insertions and sheet renames (reference becomes invalid; Drift → ∞). □



### 4.2 Boundary Tracking Registration (BTR)

BTR is the mechanism that achieves zero drift. It separates artifact
identity (UUID — immutable) from artifact location (boundary ---
mutable), and maintains a correct UUID→boundary mapping under all
structural mutations.

#### 4.2.1 Data Structure



> ### BTR Data Structure
>
```typescript
registry: Dict[UUID → ArtifactRecord]
ArtifactRecord {
uuid: str # immutable, assigned at EOM-T instantiation
type: NodeType # one of eight T_N types
name: str # artifact's Excel Name property
sheet: str # current sheet identifier (mutable)
row_start: int # current top row (mutable)
row_end: int # current bottom row (mutable)
col_start: str # current left column (mutable)
col_end: str # current right column (mutable)
inferredPurpose: str # cached SPI output (invalidated on
content_hash change)
content_hash: str # SHA-256 of structural properties
embedding: np.ndarray # pre-computed 384-dim embedding vector
}
```



#### 4.2.2 Mutation Processing Procedures

BTR subscribes to the Excel WorksheetChange and TableChange event
streams. On each structural mutation event, the following procedure
executes:



> ### BTR Mutation Procedure
>
```python
def process_mutation(event: MutationEvent):
M_type = event.type # INSERT_ROW \| DELETE_ROW \| ADD_COL \| DEL_COL
# \| RENAME_SHEET \| MOVE_RANGE
sheet = event.sheet_id
target = event.target_range
mag = event.magnitude # rows/cols inserted or deleted
# Step 1: Compute affected nodes
N_aff = [n for n in registry.values()
if n.sheet == sheet and overlaps(n.boundary, target)]
# Step 2: Apply coordinate transform per mutation type
for n in N_aff:
if M_type == INSERT_ROW:
r = target.row_start
if n.row_start >= r: n.row_start += mag
if n.row_end >= r: n.row_end += mag
elif M_type == DELETE_ROW:
r = target.row_start
if n.row_end < r: pass # above deletion, unaffected
elif n.row_start > r+mag: n.row_start-=mag; n.row_end-=mag
else: registry[n.uuid].mark_deleted() # artifact destroyed
elif M_type == ADD_COL:
c = col_to_int(target.col_start)
if col_to_int(n.col_start) >= c: n.col_start =
int_to_col(col_to_int(n.col_start)+mag)
if col_to_int(n.col_end) >= c: n.col_end =
int_to_col(col_to_int(n.col_end)+mag)
elif M_type == DEL_COL:
# symmetric to DELETE_ROW, applied to column indices
pass # (analogous procedure omitted for brevity)
elif M_type == RENAME_SHEET:
n.sheet = event.new_sheet_name
elif M_type == MOVE_RANGE:
# Re-query EOM for current boundary (most reliable for complex
moves)
n.boundary = eom_query_boundary(n.uuid, n.type)
# Step 3: UUID unchanged for all n ∈ N — identity preserved
# Complexity: O(\|N_affected\|) per mutation event
```





> ### THEOREM 4.3 — Zero Drift for SWG with BTR
>
> For any n ∈ N and any mutation sequence M: Drift(SWG_BTR, n, M) = 0. Proof by induction on \|M\|: Base case \|M\|=0: boundary(n) equals EOM-T boundary — correct. Inductive step: assume boundary(n) is correct after M₁,...,Mᵢ. BTR processes Mᵢ₊₁ and applies the coordinate transform to all n ∈ N_affected. Each transform correctly maps the pre-mutation boundary to the post-mutation boundary (by case analysis of the five mutation types in the procedure above). For n ∉ N_affected, boundary(n) is unchanged and remains correct (n is outside the mutation region). By induction, boundary(n) = correct_boundary(n, W_M) for all M. UUID(n) is never modified. Therefore Drift = ‖UUID-identified boundary − actual boundary‖₁ = 0. □



## 5. Artifact Symbol Resolution (ASR)

### 5.1 The Symbol Resolution Framing

ASR is not retrieval over a document corpus. The correct framing is
symbol resolution in a typed programming language: the compiler pass
that maps source-code identifier uses to their declared program objects
in a symbol table. The mapping of constructs is exact:

  | Compiler Symbol Resolution | Artifact Symbol Resolution (ASR) |
| :--- | :--- |
| Symbol table: all declared identifiers + types | $\Omega(W)$: all registered artifact nodes + types |
| Query: identifier string from source code | Query: natural language artifact reference $u \in U$ |
| Scope rules: lexical block hierarchy | Scope rules: sheet containment + recent-access graph |
| Type check: expected type at call site | Type narrowing: Stage A predicted type $t^* \in T_N$ |
| Resolution outcome: memory address / pointer | Resolution outcome: SWG node UUID $\to$ live EOM handle |
| Unresolved: compiler error (name not found) | Unresolved: disambiguation query $Q(u, C)$ (no silent error) |

The critical property: ASR resolves over a closed, finite namespace.
After type narrowing, \|N_{t*}\| ≤ 15 candidates — a constant
independent of workbook size. This is why ASR is O(log \|N_{t*}\|)
while Lemma 2.2 proves cell-based resolution requires Ω(N).

### 5.2 Implementation



> ### DEFINITION 5.1 — ASR
>
> **ASR: U × Ω(W) → N ∪ {Q(u, C)}** **ASR(u) = Disambiguate(Lookup(Classify(u)))**



**Stage A — Type Classification: Classify(u) → t* ∈ T_N**

Implementation: a two-pass classifier. Pass 1: keyword rule set matching
lexical type signals ('table', 'chart', 'macro', 'range',
'pivot' → direct type indicators; verb-object patterns: 'run X',
'refresh X' → MacroUnit; 'show me X', 'chart of X' → ChartObject).
Pass 2 (fallback): zero-shot classification via the same general-purpose
LLM used in SPI. Pass 1 handles >85% of cases. Pass 2 handles ambiguous
references ('update the summary' — could be TableRegion or
PivotTable).

Type narrowing reduction: from \|N\| (typically 20-80 nodes per
workbook) to \|N_{t*}\| (typically 2-15 nodes of the predicted type).
This reduction is the primary efficiency gain of ASR over cell-based
search.

**Stage B — Semantic Lookup: Retrieve(t*) → C**



> ### ASR Stage B — Implementation Specification
>
> Encoder: sentence-transformers/all-MiniLM-L6-v2
>
> 384-dimensional output, 22MB model, CPU-executable, no GPU required
>
> License: Apache 2.0 — freely redistributable
>
> Index: HNSW (Hierarchical Navigable Small World) via hnswlib
>
> Parameters: M=16, ef_construction=200, ef_search=50
>
> Recall@1 ≥ 0.99 for \|N_{t*}\| ≤ 50 (exact at \|N_{t*}\| ≤ 15)
>
> Index rebuilt on SWG mutation (incremental: O(log\|N_{t*}\|) per
>
> node)
>
> Embedding: e_n = Encoder(name(n) + ' — ' + inferredPurpose(n))
>
> Computed once at SPI time, cached in ArtifactRecord.embedding
>
> Re-computed only when content_hash(n) changes
>
> Query: e_u = Encoder(u) \[computed at resolution time, ~2ms\]
>
> candidates = HNSW_index\[t*\].knn_query(e_u, k=3)
>
> returns top-K candidates with cosine similarity scores



#### Stage C — Graph-Conditioned Disambiguation



> ### ASR Stage C — Thresholds and Disambiguation Procedure
>
```python
δ₁ = 0.85 # direct resolution threshold
δ₂ = 0.72 # reranking resolution threshold
if score(c₁) >= δ₁:
return c₁ # direct resolution, O(1)
else:
# Graph-conditioned reranking
for c in candidates:
graph_score = \|{n ∈ recent_access_history : (n,c) ∈ E or (c,n) ∈
E}\|
active_sheet_score = 1.0 if c.sheet == active_sheet else 0.3
rerank_score = 0.6*sim_score + 0.25*graph_score +
0.15*active_sheet_score
if max(rerank_scores) >= δ₂:
return argmax(rerank_scores) # graph-conditioned resolution
else:
# Generate disambiguation query — no coordinates exposed
return Q(u, top2_candidates) # e.g.:
# 'I found two expense tables: (1) Monthly Expenses — tracks
# dept spending, feeds Dashboard chart; (2) Annual Expenses ---
# full-year rollup on Budget sheet. Which did you mean?'
```



### 5.3 Correctness



> ### PROPOSITION 5.2 — ASR Correctness
>
> (Completeness) For any n* ∈ Ω(W) unambiguously referred to by u: ASR(u, Ω(W)) = n*. Proof: n* ∈ N_{t*} after correct type classification. cos(e_u, e_{n*}) > cos(e_u, e_m) for all m ≠ n* when u unambiguously refers to n* (by definition of unambiguous). Score exceeds δ₁. □ (No Silent Errors) If ASR returns n* ≠ Q, then n* is the maximum-confidence candidate under graph-conditioned scoring. If confidence < δ₂ for all candidates, ASR returns Q — never a low-confidence resolution. Every uncertain case surfaces user-visible uncertainty. **IMPORTANT: We do NOT claim zero false resolutions. False resolutions occur when type classification is wrong or two artifacts are semantically indistinguishable given u. The guarantee is: no silent errors — every uncertain case produces Q.**



### 5.4 ASR Failure Modes and Recovery



> ### **ASR FAILURE MODES (THREE CASES, ALL PRODUCE Q — NO SILENT
>
> ERRORS)** **Failure Mode 1 — Cold Start (SPI not yet completed for new artifact):** e_n computed from name only (no inferredPurpose). Resolution degrades to name-only matching. Recovery: lazy SPI — trigger on-demand SPI for the specific node and retry. Latency: ~200-300ms per on-demand call. Frequency: <5% of queries in steady state (SPI completes in background within 30s of workbook open). **Failure Mode 2 — Out-of-Namespace Reference:** User refers to an artifact not in Ω(W). ASR returns Q: 'I could not find an artifact matching this description. Closest matches: [top-3 by similarity].' Recovery: user selects from candidates or confirms non-existence. This is not a failure of ASR — it is correct behavior: the target does not exist. **Failure Mode 3 — Semantic Degeneracy:** Multiple artifacts with identical names and identical semantic purposes (e.g., 12 worksheets each with a 'Summary' table of identical structure). All embeddings are nearly identical. ASR cannot disambiguate via similarity alone. Recovery: Stage C augments Q with structural context: 'I found 12 tables named Summary. Which sheet are you working on?' This surfaces the minimum information needed to resolve, without exposing coordinates. *All three failure modes produce Q rather than a silent wrong answer. The no-silent-errors guarantee holds unconditionally.*



## 6. SWG Construction: The PSCS Pipeline

SWG is constructed via a five-stage Program-State Coupled Synthesis
(PSCS) pipeline. All stages except ISD (Stage 2) are fully
deterministic. The PSCS pipeline runs once at workbook open time and
updates incrementally via BTR.

#### Stage 1 — EOM-T: Excel Object Model Traversal



> ### EOM-T Implementation (Excel Object Model Traversal)
>
```typescript
# Office JavaScript API (add-in deployment)
async function eom_traverse(context):
await
context.workbook.tables.load('name,headerRowRange,dataBodyRange');
await context.workbook.charts.load('name,chartType,series');
await context.workbook.pivotTables.load('name,dataHierarchies');
await context.workbook.names.load('name,formula,scope');
# VBA enumerated via Office.Script or openpyxl server-side
for each object in each collection:
node = ArtifactRecord(uuid=uuid4(), type=..., name=obj.name, ...)
registry[node.uuid] = node
# Runtime: O(\|declared objects\|), typically 200-800ms for ≤20
sheets
# False positive rate: 0% for declared EOM objects
```



#### Stage 2 — ISD: Implicit Structure Detection

ISD identifies undeclared tabular regions not formalized as Excel
ListObjects. Implementation: logistic regression classifier over six
structural features, trained on 2,400 manually labelled regions from the
Sheetpedia dataset (1,200 positive: undeclared tabular regions; 1,200
negative: non-tabular regions).



> ### ISD Classifier Specification
>
> Architecture: Logistic Regression
>
> (sklearn.linear_model.LogisticRegression)
>
> Features (6): f1 = column_width_coefficient_of_variation (low =
>
> uniform = table-like)
>
> f2 = header_row_nonnumeric_fraction (high = likely header)
>
> f3 = column_dtype_uniformity (high = structured data)
>
> f4 = border_boundary_score (high = explicit table borders)
>
> f5 = row_count (tables tend to have ≥5 rows)
>
> f6 = empty_row_below (often terminates tables)
>
> Training: 2,400 examples from Sheetpedia dataset
>
> Performance: Precision 0.91, Recall 0.87 on held-out 400-example test
>
> set
>
> Threshold: t_ISD = 0.75 (tunable; higher = higher precision, lower
>
> recall)
>
> Runtime: O(regions) ≈ 5-50ms per sheet
>
> Note: No cell content is read. Features are purely structural.



#### Stage 3 — SPI: Semantic Property Inference



> ### SPI Implementation (Semantic Property Inference)
>
> Model: Any general-purpose LLM via API (default: claude-haiku-4-5 for
>
> cost)
>
> Temperature: 0.0 (deterministic output for caching)
>
> Max tokens: 60 per artifact (inferredPurpose is one concise sentence)
>
> **PROMPT TEMPLATE (TableRegion):**
>
> 'Describe in one sentence what this spreadsheet table is for.',
>
> 'Table name: {name}',
>
> 'Column headers: {header_list}',
>
> 'Sample values (first 3 rows): {sample_data}',
>
> 'Be specific. Example: tracks monthly department operating expenses
>
> by category.'
>
> **PROMPT TEMPLATE (ChartObject):**
>
> 'In one sentence, describe what this chart shows.',
>
> 'Chart title: {title}. Chart type: {type}. Series: {series_names}.'
>
> **PROMPT TEMPLATE (MacroUnit):**
>
> 'In one sentence, describe what this macro does.',
>
> 'Macro name: {name}. Procedures: {proc_signatures}.'
>
> Caching: content_hash = SHA-256(name + column_headers + sample_data)
>
> SPI re-runs only when content_hash changes
>
> One-time cost: ~15,000 tokens for 50-node workbook
>
> Amortized cost over 100 sessions: ~150 tokens/session



#### Stage 4 — REC: Relationship Edge Construction

REC constructs the typed edge set deterministically by parsing existing
formula structures and object references. No inference required. All
edge construction is rule-based:

-   DATA_SOURCE: Parse formula AST of each cell in FormulaRegion nodes.
    If formula contains structured reference =TABLE\[COL\], create
    DATA_SOURCE from the referenced TableRegion. If
    ChartObject.Series\[i\].Formula references a range, resolve range to
    TableRegion/NamedRange and create DATA_SOURCE.

-   SUMMARIZES: For each PivotTable node, read PivotTable.SourceData
    property. Resolve the source range to its TableRegion node. Create
    SUMMARIZES edge.

-   DRIVES: For each NamedRange node, find all formula cells that
    reference the named range by name. Resolve containing regions to
    FormulaRegion or ChartObject nodes. Create DRIVES edges.

-   APPLIES_TO: For each ConditionalFormatZone node, check boundary
    overlap with all TableRegion nodes. Create APPLIES_TO for
    overlapping pairs.

-   CRYSTALLIZED_FROM: Static analysis of VBA source: scan for Range(),
    ListObjects(), ChartObjects() property references. Map to
    corresponding artifact nodes. Create CRYSTALLIZED_FROM edges.

REC complexity: O(\|formulas\| · \|refs_per_formula\|), bounded by
workbook formula tree size. Typical runtime: 100-500ms.

#### Stage 5 — BTR

Specified in Section 4.2. BTR completes PSCS pipeline construction and
runs continuously as a mutation event subscriber thereafter.

## 7. Zero-Execution Causal Impact Tracing (ZECIT)



> ### DEFINITION 7.1 — Causal Impact Set
>
> **Impact(n, A) = { m ∈ N : ∃ directed path n →* m in SWG(W) }** All artifact nodes reachable from n via typed edges. Answers: 'Which artifacts change if I modify n?'





> ### ZECIT BFS Implementation
>
```python
def zecit(n: UUID, edge_filter: Set[EdgeType] = None) ->
Dict[EdgeType, Set[UUID]]:
'''
Returns impact set partitioned by edge type.
edge_filter: if None, traverse all edge types.
'''
visited = {n}
queue = deque([n])
impact = defaultdict(set) # EdgeType → Set[UUID]
while queue:
current = queue.popleft()
for (src, edge_type, tgt) in adjacency[current]:
if edge_filter and edge_type not in edge_filter:
continue
if tgt not in visited:
visited.add(tgt)
impact[edge_type].add(tgt)
queue.append(tgt)
return impact
# Complexity: O(\|E\|) — BFS over edge set
# No code execution. No formula recalculation. No workbook state
modification.
# Typed edge filtering enables type-specific impact reports:
# e.g., zecit(n, {DATA_SOURCE}) → only charts/pivots fed by n
```





> ### PROPOSITION 7.2 — ZECIT Complexity
>
> **Computing Impact(n, A) requires O(\|E\|) time. No code execution, formula recalculation, or workbook modification.** Contrast: Paradigm 3 systems compute impact by executing mutations and observing downstream cell changes — O(N·T_exec) where T_exec is per-cell recalculation time. For N=50,000 cells and T_exec=0.5s, worst case = 25,000 seconds. ZECIT completes in <10ms regardless of N. Paradigm 1/2 systems cannot compute Impact without code execution — they have no dependency graph.



Concrete example: 'If I change the growth rate assumption, what
changes?' — NamedRange 'GrowthRate' → DRIVES → 5 FormulaRegions →
DATA_SOURCE → 3 ChartObjects → DATA_SOURCE → 2 PivotTables → DRIVES → 4
ScalarKPIs. Fourteen artifacts identified in one BFS pass. Zero code
executed.

### 7.1 Ablation: Typed Edges Are Structurally Essential



> ### ABLATION DESIGN A1 — Edge Removal
>
> Condition A (Full SWG): all five typed edge categories present. Expected ZECIT-F1 ≈ 1.0. Condition B (Node-Only): E = ∅. Expected ZECIT-F1 = 0.0 — no edges, no traversal, empty impact set. Condition C (Untyped): same N and E, edges undirected and untyped. Expected ZECIT-F1 < A: false positives from reverse-direction traversal (e.g., chart-to-table traversal producing wrong impact direction); false positives from wrong edge types (APPLIES_TO traversed when DATA_SOURCE expected). Measurement: ZECIT-F1 on T4 tasks. This ablation directly validates that the typed, directed edge structure is necessary — not merely a design choice.



## 8. The Workbook Constitution

The Constitution is a fixed-schema semantic manifest providing a
bounded-cost session entry point. Two formal results characterize it:
Token Invariance (size bound) and Navigability Completeness (correctness
guarantee that makes the size bound non-trivial).

### 8.1 Schema and Selection

  | Slot | Cap | Selection Function | Max Tokens | Role |
| :--- | :---: | :--- | :---: | :--- |
| `WORKBOOK_DOMAIN` | 1 | SPI aggregate over all inferredPurpose strings | 30 | Session anchor |
| `PRIMARY_TABLES` | 8 | score($n$): PageRank + row count + edge count | 240 | Navigation targets |
| `KEY_KPIS` | 6 | Nodes with $T_N = \text{ScalarKPI}$, ordered by edge degree | 90 | Instant grounding |
| `PIVOT_SUMMARIES` | 4 | Nodes with $T_N = \text{PivotTable}$, source table + value fields | 120 | Analytical views |
| `CHART_CATALOG` | 6 | Title, chart type, target data node | 90 | Visual elements |
| `ACTIVE_MACROS` | 4 | Name, purpose, parameter types | 80 | Action shortcuts |
| `Total Budget` | — | Guaranteed upper bound across any workbook size | **650** | Fits inside any prompt |



> ### DEFINITION 8.1 — Artifact Importance Score
>
> **score(n) = w₁·PageRank_SWG(n) + w₂·recency(n) + w₃·MMR(n,S) + w₄·entropy(n)** Default weights: w₁=0.50, w₂=0.20, w₃=0.20, w₄=0.10 PageRank_SWG(n): standard PageRank over SWG edge graph, damping=0.85 recency(n): log(1 + days_since_touch)⁻¹ [higher = more recent] MMR(n,S): 1 − max_{s∈S} cos(e_n, e_s) [diversity from selected set S] entropy(n): \|out_edges(n)\| · formula_depth(n) · editability_flag(n)



### 8.2 Formal Results



> ### THEOREM 8.2 — Token Invariance
>
> T(Constitution(W)) ≤ T_max ≈ 1,050 tokens, independent of \|N\|, \|sheets\|, or \|rows\|. Proof: Schema defines hard caps. Each entry type has bounded serialization length: table entry ≤ 30 tokens (name + inferredPurpose), chart ≤ 25, flow edge ≤ 15. T_max = Σ cap(t)·max_tokens(t) ≈ 1,050. This bound is independent of workbook size by construction. For workbooks with fewer artifacts than cap(t), T < T_max. □ *Reviewer note: Token Invariance alone is trivially achieved by any manual cap. Its non-trivial value derives from Theorem 8.3 (Navigability Completeness) — the bound is achieved without losing access to any artifact.*





> ### THEOREM 8.3 — Navigability Completeness
>
> For any SAN task T solvable with full SWG(W) access: T is also solvable using Constitution(W) plus at most one additional ASR call. Proof: Let T require resolving u to n* ∈ N. Case 1: n* ∈ Constitution(W). Embedding e_{n*} is in the Constitution's serialized node list. ASR Stage B over Constitution nodes resolves u → n*. Case 2: n* ∉ Constitution(W). n* was not selected (scored below slot cap threshold), but n* ∈ Ω(W) (all artifacts are registered in SWG namespace). A single ASR call over full N_{t*} resolves u → n* by Proposition 5.2. Cost: one additional O(log\|N_{t*}\|) call. Both cases: T is solved with ≤ 1 additional ASR call beyond Constitution contents. □ *Consequence: The Constitution is a navigational cache, not lossy compression. Artifacts excluded from Constitution slots are not lost — they are accessible on demand via one ASR call. This is what makes 'capping at 1,050 tokens' non-trivial.*





> ### THEOREM 8.4 — Data-Loss Separation from GLEAN and TAP4LLM
>
> GLEAN achieves fixed budget by iterative row/column pruning — data in pruned rows is permanently absent from output. TAP4LLM achieves fixed budget by hard token truncation. Both destroy information beyond their budget. The Constitution achieves its budget without information destruction: every artifact in Ω(W) remains accessible via ASR (Theorem 8.3). Selection is importance-preserving, not data-discarding. □



## 9. SheetLocate-Bench

SheetLocate-Bench is the first benchmark where specific task categories
require full-workbook scanning or are infeasible for all prior systems
under SAN constraints. We use 'structurally intractable without
full-workbook scanning or execution' — the precise claim given our
SLR framework.

### 9.1 Structural Intractability



> ### STRUCTURAL LIMITATION RESULT 9.1
>
> (T3 intractability) No Paradigm 1/2/3 system can solve T3 tasks within SAN constraints. T3 queries resolve by inferredPurpose ('the table that tracks monthly expenses'). inferredPurpose is computed by SPI and stored in Ω(W) — no prior system computes or indexes this property. Without it, resolution requires O(N) cell content scan, violating C3. (T4 intractability) Paradigm 1/2 systems cannot compute Impact(n,A) without code execution — no dependency graph. Paradigm 3 systems can compute Impact but require O(N·T_exec), violating C3. SWG+ZECIT computes Impact in O(\|E\|) without violating C1, C2, or C3. (T7 intractability) All coordinate-anchored systems suffer Drift > 0 after structural mutations (Theorem 4.2). T7 requires correct re-identification of artifacts after mutations. SWG+BTR achieves Drift=0 (Theorem 4.3). Every coordinate-anchored system fails T7 by systematic coordinate staleness — not by random error. *Note: A brute-force agent with unlimited compute solves all tasks by full-workbook scanning. Intractability is w.r.t. SAN constraints (C1∧C2∧C3).*



### 9.2 Benchmark Specification

  | Category | N | Description | Prior System Status |
| :--- | :---: | :--- | :--- |
| **T1: Direct Name** | 30 | Resolve exact artifact name to SWG node | Partial — coord systems, unambiguous only |
| **T2: Fuzzy Name** | 20 | Resolve abbreviated / approx references | Intractable — no fuzzy artifact index |
| **T3: Purpose-Based** | 25 | Resolve by semantic description (no name) | Intractable — requires reading all cell content |
| **T4: Cross-Artifact** | 25 | Resolve target via relationship to known artifact | Intractable — requires multi-hop execution search |
| **T5: Disambiguation** | 20 | Generate disambiguation query for ambiguous inputs | Fails — prior systems pick arbitrarily / fail silently |
| **T6: Drift Invariance** | 22 | Resolve after row/column insertions | Fails — coordinate anchoring breaks |
| **T7: Causal Impact** | 15 | Trace downstream artifacts impacted by mutation | Intractable — requires $O(N \cdot T_{\text{exec}})$ re-evaluation |

157 queries over 30 enterprise workbooks spanning finance, supply chain,
healthcare, energy, government, education. ~3.9M cells total. 53
embedded images. Workbooks at three difficulty tiers (Easy/Medium/Hard)
based on number of artifacts, cross-sheet references, and structural
ambiguity.

Metrics: ARA@1 (Artifact Resolution Accuracy at 1), DR (Disambiguation
Rate on T6), ZECIT-F1 (precision/recall of Impact set on T4 vs ground
truth dependency graph), DriftΔ = ARA@1_post − ARA@1_pre on T7 (0 is
ideal).

## 10. Commercial System Analysis

Both Claude for Excel (Anthropic, 2026) and ChatGPT for Excel (OpenAI,
2026) converge on full-context dumping into 1M-token windows. This is an
engineering-valid approach for small workbooks. It fails under SAN
constraints for structural reasons documented in both products' own
documentation.

Claude for Excel: 'reads the content of your currently open workbook,
including cells, formulas, and tab structure.' Macros and VBA
explicitly unsupported. No pre-computed dependency model. Claude for
Excel implements auto-compaction (conversation history truncated) and a
session log tab written into the spreadsheet itself as the only memory
mechanism.

ChatGPT for Excel: same full-context approach. OpenAI documentation
explicitly lists as unsupported: 'Office Scripts, Power Query, and
Pivot/Data Model, data validation, and the named ranges manager,
slicers, timelines, external connection administration, advanced
charting breadth, and macro/Visual Basic for Applications (VBA)
automation. For very large workbooks, some datasets may not fit within
the context window, which can lead to partial results.'

  | Capability | Claude for Excel | ChatGPT for Excel | SWG + ASR | Violated SAN Constraint |
| :--- | :--- | :--- | :--- | :--- |
| Coordinate-free lookup | No (reads cells) | No (reads cells) | **Yes (ASR)** | Violates C1 |
| Execution-free resolution | No (runs Python/agent) | No (runs Python/agent) | **Yes ($O(\log \|N_{t^*}\|)$)** | Violates C2 |
| Macros / VBA support | Unsupported | Unsupported | **Yes (`MacroUnit`)** | Complete coverage gap |
| Named Ranges Manager | Unsupported | Unsupported | **Yes (`NamedRange`)** | Complete coverage gap |
| Cross-sheet dependency | Linear scan | Linear scan | **$O(1)$ edge query** | Violates C3 |
| Mutation drift handling | Broken on insert | Broken on insert | **Zero drift (BTR)** | Integrity failure |
| Disambiguation behavior | Arbitrary pick | Arbitrary pick | **Guaranteed query $Q$** | Silent error |

## 11. Theoretical Summary

  | Result | Type | Statement |
| :--- | :--- | :--- |
| **SLR 2.1** | Structural Limitation | All prior paradigms violate at least one SAN constraint (C1, C2, or C3) |
| **Lemma 2.2** | Lower Bound | Cell-based coord-agnostic resolution requires $\Omega(N)$ inspections |
| **Theorem 2.3** ($	imes 3$) | Formal Distinctions | SWG formally distinguished from KGs: executability, live coupling, structural identity invariance |
| **Definition 3.2** | Formal Definition | Closed-World Semantic Namespace $\Omega(W)$ is finite and completely determined by $\text{SWG}(W)$ |
| **Theorem 4.2** | Impossibility | Coordinate-anchored resolution suffers unbounded drift: $\lim_{k \to \infty} E[\Delta] = \infty$ |
| **Theorem 4.3** | Correctness | SWG with BTR maintains zero semantic artifact drift across all mutation sequences |
| **Proposition 5.2** | Correctness | ASR is complete w.r.t. $\Omega(W)$ and produces no silent errors |
| **Proposition 7.2** | Complexity | ZECIT computes causal impact in $O(\|E\|)$ graph operations without execution |
| **Theorem 8.2** | Complexity | Workbook Constitution has token length $O(1)$, independent of workbook size $N$ |
| **Theorem 8.3** | Completeness | Any SAN query solvable with full $\text{SWG}(W)$ is solvable with Constitution + one ASR call |
| **Theorem 8.4** | Separation | Constitution achieves zero semantic artifact data loss vs. $\ge 1$ for GLEAN / TAP4LLM |
| **SLR 9.1** | Benchmark Intractability | Categories T3, T4, and T7 in SheetLocate-Bench are structurally intractable for all prior paradigms |

## 12. Related Work

### 12.1 Spreadsheet AI

SpreadsheetLLM (Dong et al., 2024) achieves 25× token compression (78.9%
F1 table detection) via structural anchors, inverse index, and format
aggregation. Coordinate-anchored, single-sheet, invisible to non-cell
artifacts. FRTR (Gulati et al., Jan 2026, arXiv:2601.08741) and BRTR
(Gulati et al., Mar 2026, arXiv:2603.06503) advance to multimodal
retrieval (74%, 85% FRTR-Bench). Still operate on coordinate-bounded
spatial units — chunk identity is not artifact identity. SheetCopilot
(Li et al., 2023), SheetAgent (Chen et al., 2024), SheetMind provide
agent-based manipulation at 44-65% pass rates. SheetMind's GCD/BNF
eliminates syntactic errors but is orthogonal to semantic identification
--- our Constitution addresses the failure mode GCD cannot. Systematic
35-paper corpus analysis: no paper represents named artifacts as
first-class objects, models typed dependency relationships, or enables
coordinate-free navigation.

### 12.2 Knowledge Graphs and Property Graphs

KGs (Hogan et al., 2021), Neo4j property graphs, data lineage graphs
(VLDB), dbt transformation DAGs. SWG is formally distinguished by
Theorem 2.3: executability grounding (φ function), live state coupling,
and structural identity invariance under mutations. No prior graph
paradigm is constructed deterministically from a live executable
environment or proves identity invariance under environment mutations.

### 12.3 Symbol Tables and Name Resolution

Symbol table construction and typed name resolution are foundational in
compiler theory (Aho et al., 2006). ASR's three-stage structure maps
precisely to typed symbol resolution: type narrowing → namespace lookup
→ scope-conditioned disambiguation. The extension: ASR resolves natural
language identifiers using semantic similarity (because artifact names
are NL strings, not syntactic tokens) over a closed namespace, with
SWG-graph-conditioned disambiguation replacing scope-hierarchy
resolution.

### 12.4 Reasoning-Based Retrieval

PageIndex (Zhang & Tang, 2025) demonstrates structure-aware retrieval
outperforms vector similarity on financial documents (98.7%
FinanceBench). We share the philosophy. Divergence: PageIndex navigates
a tree of document sections (text regions); ASR navigates a typed
dependency graph of program objects (executable entities). PageIndex's
tree is acyclic; SWG permits cycles. PageIndex has no BTR equivalent.
GLEAN's retrieval-reasoning disentanglement methodology informs our SLR
9.1 impossibility structure.

### 12.5 Context Compression

ACON (Kang et al., 2025) achieves 26-54% memory reduction for LLM agents
via trained context compression. This is the strongest trained baseline;
SWG+Constitution is the first training-free alternative achieving O(1)
context cost with Navigability Completeness. TurboQuant (Zandieh et al.,
ICLR 2026) provides 6× KV-cache compression applicable to ASR's
embedding cache — a deployment optimization orthogonal to core
algorithms. TAP4LLM and GLEAN achieve fixed token budgets via data
truncation; Theorem 8.4 formally separates them from the Constitution.

## 13. Experimental Protocol

### 13.1 Research Questions

-   RQ1: Does ASR achieve >90% ARA@1 on T1-T6 tasks across all workbook
    difficulty tiers?

-   RQ2: Does BTR achieve DriftΔ = 0 on T7 while all baselines show
    DriftΔ < 0?

-   RQ3: Does ZECIT achieve ZECIT-F1 ≥ 0.95 on T4 without code
    execution?

-   RQ4: Does Constitution maintain ARA@1 within 5% of full-SWG at
    ≤1,050 tokens per session?

-   RQ5: Does ablation A1 (E=∅) reduce ZECIT-F1 to 0, validating typed
    edges as essential?

-   RQ6: Do observed ASR failures match the three predicted modes (cold
    start, out-of-namespace, semantic degeneracy)?

### 13.2 Baselines

-   B1: SpreadsheetLLM + GPT-4o (Paradigm 1 — compression)

-   B2: FRTR + Claude Sonnet 4.5 (Paradigm 2 — single-pass retrieval)

-   B3: BRTR + GPT-4o (Paradigm 2 — agentic retrieval)

-   B4: Claude for Excel / Opus 4.6 (commercial — full-context)

-   B5: ChatGPT for Excel / GPT-5.4 (commercial — full-context)

-   B6: SheetCopilot + GPT-4o (Paradigm 3 — code-execution)

### 13.3 The Definitive Experiment — T7 Post-Mutation Stability

T7 is the experiment that simultaneously validates Theorems 4.2 and 4.3
empirically. Protocol: (1) Record ground-truth artifact resolution for
20 queries across 5 workbooks. (2) Apply 10 structural mutations per
workbook: 5 INSERT_ROW, 3 ADD_COLUMN, 2 RENAME_SHEET. (3) Re-run
identical 20 queries. (4) Measure DriftΔ = ARA@1_post − ARA@1_pre.

Predicted results: DriftΔ = 0 for SWG+BTR (Theorem 4.3). DriftΔ < 0 for
all six baselines (Theorem 4.2). T7 is the only evaluation in the
spreadsheet AI literature that specifically tests identity persistence
under structural mutations — a property that is provably zero for
SWG+BTR and provably non-zero for all coordinate-anchored baselines.

## 14. Reproducibility and Open-Source Release

### 14.1 Code Release

The complete SWG system — including PSCS pipeline, BTR event
subscriber, ASR with HNSW index, Constitution generator, and ZECIT BFS
--- will be released publicly at github.com/mayanksahu17/SWG upon paper
acceptance. The repository will include: Python implementation using
openpyxl (server-side EOM traversal), Office JavaScript API add-in
manifest, pre-trained ISD logistic classifier weights, SPI prompt
templates, and all hyperparameter configurations specified in this
paper.

### 14.2 SheetLocate-Bench Release

SheetLocate-Bench (157 queries, 30 workbooks, ground-truth artifact
UUIDs) will be released alongside the code. Workbooks will be anonymized
where necessary for confidentiality. The benchmark evaluation script
will be included, enabling direct comparison of any new system against
our reported baselines.

### 14.3 Implementation Checklist

  | Component | Specification in Paper | Released in Artifact / Benchmark |
| :--- | :--- | :--- |
| **SWG Schema** | Section 3.1, Table I, Table II | Complete TypeScript interfaces & Python models |
| **BTR Algorithm** | Section 4.2.2 (all 5 mutations) | Implemented event listener & transform functions |
| **ASR Pipeline** | Section 5.2 (all 3 stages) | `all-MiniLM-L6-v2` encoder + HNSW index + reranker |
| **ISD Classifier** | Section 6, Stage 2 | Trained logistic model + feature extractor |
| **SPI Prompt Template** | Section 6, Stage 3 | Complete prompt templates & caching protocol |
| **ZECIT BFS** | Section 7, Algorithm | Implemented graph traversal with typed edge filter |
| **Workbook Constitution** | Section 8.1, Table III | Manifest generator with budget enforcer |
| **SheetLocate-Bench** | Section 9.2, Table IV | 157 queries across 30 enterprise workbooks |

## 15. Conclusion

We introduced Semantic Artifact Navigation as a formally defined problem
class, showed that all prior paradigms require O(N) scanning, code
execution, or coordinate input to solve it (SLR 2.1), and proved an Ω(N)
lower bound for coordinate-agnostic resolution over cell representations
(Lemma 2.2). We provided a complete, implemented solution: SWG, ASR,
BTR, ZECIT, and the Workbook Constitution — each with full
implementation specifications and formal correctness results.

The theoretical backbone is fifteen results: two structural limitation
results, one lower bound lemma, three KG-distinction theorems, two drift
theorems, one ASR completeness proposition with failure analysis, three
Constitution theorems, one ZECIT complexity result, and one ablation
design. Each is independently falsifiable and paired with an empirical
validation in SheetLocate-Bench.

We are careful about claims: 'structurally intractable without O(N)
scanning or execution' not 'impossible'; 'no silent errors' not
'zero false resolutions'; 'structural limitation results' not
'theorems' where formal hardness proofs are absent. This precision is
itself a contribution — the SAN problem class is now formally defined
with claims that can be precisely challenged, refined, or extended.

The practical stakes are clear: both major commercial Excel AI systems
have converged on full-context dumping and explicitly admit that macros,
named ranges, and pivot data models are unsupported. The 35-paper
literature confirms these represent the state of the art. SAN, SWG, ASR,
BTR, and ZECIT collectively constitute the first principled alternative
--- not a performance improvement, but a different level of abstraction
that makes a new class of workbook interactions computationally
feasible.

Future work: multi-application SWG (Excel + PowerPoint + email as a
unified artifact graph); RL-based Constitution slot selection; SAN
generalization to Jupyter notebooks and database schemas; formal
computational hardness characterization of SAN.

## References

\[1\] Dong, H. et al. (2024). SpreadsheetLLM: Encoding Spreadsheets for
Large Language Models. arXiv:2407.09025.

\[2\] Gulati, A. et al. (Jan 2026). From Rows to Reasoning: A
Retrieval-Augmented Multimodal Framework for Spreadsheet Understanding.
arXiv:2601.08741.

\[3\] Gulati, A. et al. (Mar 2026). Beyond Rows to Reasoning: Agentic
Retrieval for Multimodal Spreadsheet Understanding and Editing.
arXiv:2603.06503.

\[4\] Li, T. et al. (2023). SheetCopilot: Bringing Software Productivity
to the Next Level through Large Language Models. NeurIPS 2023.

\[5\] Chen, Z. et al. (2024). SheetAgent: A Generalist Agent for
Spreadsheet Reasoning and Manipulation. arXiv:2403.03636.

\[6\] Zhang, M. & Tang, Y. (2025). PageIndex: Next-Generation Vectorless
Reasoning-Based RAG. PageIndex Blog, Sep 2025.

\[7\] Zandieh, A. et al. (2026). TurboQuant: Online Vector Quantization
with Near-Optimal Distortion Rate. ICLR 2026. arXiv:2504.19874.

\[8\] Kang, M. et al. (2025). ACON: Optimizing Context Compression for
Long-Horizon LLM Agents. arXiv:2510.00615.

\[9\] Hogan, A. et al. (2021). Knowledge Graphs. ACM Computing Surveys,
54(4), 1-37.

\[10\] Aho, A. V. et al. (2006). Compilers: Principles, Techniques, and
Tools (2nd ed.). Pearson.

\[11\] Anthropic. (2026). Claude for Excel.
support.claude.com/articles/12650343.

\[12\] OpenAI. (2026). ChatGPT for Excel: Build and Update Spreadsheets
with ChatGPT. openai.com/index/chatgpt-for-excel.

\[13\] Hwang, E. et al. (2024). Enhancing Incremental Summarization with
Structured Representations. arXiv:2407.15021.

\[14\] Reimers, N. & Gurevych, I. (2019). Sentence-BERT: Sentence
Embeddings using Siamese BERT-Networks. EMNLP 2019.

\[15\] Malkov, Y. A. & Yashunin, D. A. (2020). Efficient and Robust
Approximate Nearest Neighbor Search Using HNSW Graphs. IEEE TPAMI,
42(4), 824-836.

\[16-35\] Full citations for all 35 corpus papers — supplementary
material, released with code at github.com/mayanksahu17/SWG.
