"""Render production-grade, dense engineering telemetry and architecture plates."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

def font(size, bold=False, serif=False):
    if serif:
        return ImageFont.truetype(SERIF, size)
    return ImageFont.truetype(MONO_BOLD if bold else MONO, size)

def base_plate(title, category, system_tag, accent="#d1ff48"):
    im = Image.new("RGB", (1200, 840), "#0c0e0d")
    d = ImageDraw.Draw(im)
    
    # Outer precision boundary / hair lines
    d.rectangle((24, 24, 1176, 816), outline="#232b21", width=1)
    
    # Header telemetry bar
    d.rectangle((24, 24, 1176, 78), fill="#131914", outline="#232b21", width=1)
    d.text((44, 42), f"SYS://{category.upper()}", font=font(15, bold=True), fill="#7e8c75")
    d.text((440, 42), f"[SPECIMEN: {title.upper()}]", font=font(15, bold=True), fill=accent)
    d.text((940, 42), system_tag, font=font(14, bold=True), fill="#7e8c75")
    
    # Footer metadata bar
    d.rectangle((24, 762, 1176, 816), fill="#111612", outline="#232b21", width=1)
    d.text((44, 778), "INSPECTABLE ARCHITECTURE ARTIFACT // ZERO VAPORWARE", font=font(13), fill="#5c6655")
    d.text((920, 778), "VERIFIED SOURCE EMISSION", font=font(13), fill=accent)
    
    return im, d

def save(im, name):
    im.save(OUT / f"{name}.webp", quality=90, method=6)
    print(f"Generated {name}.webp")

# --------------------------------------------------------------------------
# 1. FLEETORCH: Authentic Multi-Worktree Terminal Console
# --------------------------------------------------------------------------
im, d = base_plate("Fleetorch", "Agent Infrastructure / Go", "RUNTIME: PTY-SUPERVISED")
d.text((54, 108), "FLEETORCH PROCESS SUPERVISOR [ACTIVE SESSION: pr-84-review]", font=font(22, bold=True), fill="#f0f3e9")
d.text((54, 142), "$ fleetorch status --all --worktrees --metrics", font=font(16), fill="#a8b29e")

# Terminal Box Header
d.rectangle((54, 180, 1146, 720), fill="#121714", outline="#323d2e", width=1)
d.rectangle((54, 180, 1146, 224), fill="#1a221d", outline="#323d2e", width=1)
d.text((74, 194), "WORKTREE ID", font=font(14, bold=True), fill="#798771")
d.text((320, 194), "AGENT / MODEL", font=font(14, bold=True), fill="#798771")
d.text((560, 194), "STATUS", font=font(14, bold=True), fill="#798771")
d.text((760, 194), "MEM / CPU", font=font(14, bold=True), fill="#798771")
d.text((940, 194), "GIT DELTA", font=font(14, bold=True), fill="#798771")

rows = [
    ("wt-01-auth-refactor", "codex (isolated)", "[RUNNING]", "11.4MB / 1.2%", "+142 -28 (3 files)", "#d1ff48"),
    ("wt-02-db-migrations", "claude-haiku", "[RUNNING]", "8.2MB / 0.8%", "+68  -4  (1 file)", "#d1ff48"),
    ("wt-03-api-contract", "gemini-flash", "[COMMITTED]", "14.1MB / 0.0%", "0x9a8f4c (MERGED)", "#a3b593"),
    ("wt-04-unit-suite", "codex-testrun", "[HEALTHY]", "19.3MB / 4.1%", "PASS (42 suites)", "#6fe099")
]

for idx, (wt, model, status, res, delta, clr) in enumerate(rows):
    y = 250 + idx * 82
    d.rectangle((64, y - 10, 1136, y + 54), fill="#161d18", outline="#252f22", width=1)
    d.text((80, y + 10), wt, font=font(16, bold=True), fill="#f4f6ee")
    d.text((320, y + 10), model, font=font(15), fill="#cbd2c2")
    d.text((560, y + 10), status, font=font(15, bold=True), fill=clr)
    d.text((760, y + 10), res, font=font(15), fill="#9aa68f")
    d.text((940, y + 10), delta, font=font(15), fill="#d1ff48" if "+" in delta else "#f4f6ee")

d.rectangle((64, 600, 1136, 700), fill="#0d110f", outline="#283325", width=1)
d.text((80, 616), "SUPERVISOR LOG BUFFER:", font=font(13, bold=True), fill="#697561")
d.text((80, 642), "[INFO] 07:02:19.412 lock acquired /tmp/fleetorch_wt01.lock (no collision with .git/index)", font=font(13), fill="#a5b39b")
d.text((80, 668), "[INFO] 07:02:20.108 pty stream attached: stdout/stderr multiplexed on fd 11 (0 dropped)", font=font(13), fill="#d1ff48")
save(im, "fleetorch")

# --------------------------------------------------------------------------
# 2. MNEMIUM: Vector Memory Distillation Pipeline
# --------------------------------------------------------------------------
im, d = base_plate("Mnemium", "Local AI / Persistent Context", "PIPELINE: HYBRID FTS+DENSE", accent="#7b8eff")
d.text((54, 108), "CONTINUOUS CONVERSATION DISTILLATION & VECTOR MEMORY", font=font(22, bold=True), fill="#f0f3e9")
d.text((54, 142), "Raw Context Ingestion -> Typed Memory Distillation -> Local Vector Search (<8ms)", font=font(16), fill="#8c9ac9")

# Left: Raw Conversational Ingestion
d.rectangle((54, 180, 520, 720), fill="#12151c", outline="#2a334d", width=1)
d.rectangle((54, 180, 520, 224), fill="#191e2b", outline="#2a334d", width=1)
d.text((74, 194), "RAW CHAT STREAM (UNSTRUCTURED)", font=font(13, bold=True), fill="#7b8dbf")

raw_snippet = [
    "User: 'We decided on using SQLite FTS5 for lexical",
    "search because maintaining Meilisearch in local CLI",
    "is too much overhead. Embeddings will use all-MiniLM-L6-v2",
    "quantized locally via ONNX Runtime.'",
    "Assistant: 'Acknowledged. Architecture rule logged.'"
]
for idx, line in enumerate(raw_snippet):
    d.text((74, 250 + idx * 36), line, font=font(13), fill="#7e89ab")

d.rectangle((74, 460, 500, 690), fill="#0d1017", outline="#222b40", width=1)
d.text((90, 480), "INGESTION TELEMETRY:", font=font(12, bold=True), fill="#5c688a")
d.text((90, 514), "Tokens Streamed: 4,120", font=font(14), fill="#d0d8ff")
d.text((90, 548), "Distillation Threshold: TRIGGERED", font=font(14, bold=True), fill="#7b8eff")
d.text((90, 582), "Local Embedding Model: all-MiniLM-L6-v2", font=font(13), fill="#9ba8d6")
d.text((90, 616), "Quantization: int8 ONNX (CPU 4.2ms)", font=font(13), fill="#6fe099")
d.text((90, 650), "Zero Cloud Leaks: 100% LOCAL", font=font(13, bold=True), fill="#d1ff48")

# Right: Typed Vector Memory Cards
d.rectangle((540, 180, 1146, 720), fill="#12151c", outline="#2a334d", width=1)
d.rectangle((540, 180, 1146, 224), fill="#191e2b", outline="#2a334d", width=1)
d.text((560, 194), "DISTILLED TYPED MEMORY REPOSITORY", font=font(13, bold=True), fill="#7b8dbf")

memories = [
    ("ARCHITECTURAL_DECISION", "Search Stack Selection", "FTS5 + ONNX all-MiniLM-L6-v2", "sim: 0.942"),
    ("SYSTEM_CONSTRAINT", "Local Binary Footprint", "Zero daemon dependencies; pure SQLite", "sim: 0.891"),
    ("CODEBASE_RULE", "PTY Session Lifecycle", "Worktree directories destroyed on exit", "sim: 0.865")
]

for idx, (mtype, label, summary, sim) in enumerate(memories):
    my = 246 + idx * 150
    d.rectangle((560, my, 1126, my + 130), fill="#171b26", outline="#313d5e", width=1)
    d.text((580, my + 16), mtype, font=font(12, bold=True), fill="#7b8eff")
    d.text((980, my + 16), sim, font=font(12, bold=True), fill="#d1ff48")
    d.text((580, my + 44), label, font=font(18, bold=True), fill="#f4f6ff")
    d.text((580, my + 78), summary, font=font(14), fill="#b1bddf")

save(im, "mnemium")

# --------------------------------------------------------------------------
# 3. SYNTRA: Supply-Chain Risk Decision Engine
# --------------------------------------------------------------------------
im, d = base_plate("Syntra", "Supply-Chain Risk Intelligence", "DECISION GRAPH: 4,200 NODES", accent="#38d996")
d.text((54, 108), "DEPENDENCY PROVENANCE & REALTIME RISK ENGINE", font=font(22, bold=True), fill="#f0f3e9")
d.text((54, 142), "Dynamic Exposure Scoring / Supplier Alert Containment / Traceability Graph", font=font(16), fill="#82aa96")

# Matrix Table
d.rectangle((54, 180, 1146, 720), fill="#101713", outline="#293d31", width=1)
d.rectangle((54, 180, 1146, 224), fill="#17241d", outline="#293d31", width=1)
d.text((74, 194), "TIER / ENTITY", font=font(14, bold=True), fill="#6d947f")
d.text((360, 194), "DEPENDENCY RISK", font=font(14, bold=True), fill="#6d947f")
d.text((580, 194), "ANOMALY SIGNAL", font=font(14, bold=True), fill="#6d947f")
d.text((820, 194), "CONTAINMENT DECISION", font=font(14, bold=True), fill="#6d947f")
d.text((1040, 194), "STATUS", font=font(14, bold=True), fill="#6d947f")

syntra_rows = [
    ("Tier-1 Fab (Munich)", "HIGH (Score: 0.91)", "Sub-component bottleneck", "Reroute to Secondary", "ACTIVE", "#ff6b6b"),
    ("Logistics Carrier EU", "MED (Score: 0.54)", "Customs clearing latency", "Buffer Stock Buffer +4d", "RESOLVED", "#f1c40f"),
    ("Raw Material Lithium", "LOW (Score: 0.18)", "Stable Spot Volatility", "Maintain Rolling Contract", "OPTIMAL", "#38d996"),
    ("Firmware Vendor AS", "CRITICAL (0.98)", "Vulnerability CVE-2026-X", "Quarantine Supply Batch", "ACTION REQ", "#ff4757"),
    ("Packaging Facility", "LOW (Score: 0.12)", "Normal variance", "Standard Protocol", "OPTIMAL", "#38d996")
]

for idx, (entity, risk, anomaly, decision, status, clr) in enumerate(syntra_rows):
    y = 244 + idx * 76
    d.rectangle((64, y - 6, 1136, y + 54), fill="#141e18", outline="#203026", width=1)
    d.text((80, y + 14), entity, font=font(16, bold=True), fill="#eef6f1")
    d.text((360, y + 14), risk, font=font(14, bold=True), fill=clr)
    d.text((580, y + 14), anomaly, font=font(14), fill="#b9cebf")
    d.text((820, y + 14), decision, font=font(14), fill="#eef6f1")
    d.text((1040, y + 14), status, font=font(14, bold=True), fill=clr)

d.rectangle((64, 620, 1136, 700), fill="#0d1410", outline="#203026", width=1)
d.text((80, 638), "GRAPH ENGINE TOPOLOGY:", font=font(13, bold=True), fill="#5c7a69")
d.text((80, 664), "4,200 entities tracked in real time. Provenance verification across multi-tier supplier paths.", font=font(14), fill="#a5c4b2")
save(im, "syntra")

# --------------------------------------------------------------------------
# 4. GHOSTSIGNAL: Cryptographic Commitment Verification Protocol
# --------------------------------------------------------------------------
im, d = base_plate("GhostSignal", "Cryptographic Accountability", "ZERO-KNOWLEDGE VERIFIER", accent="#d1ff48")
d.text((54, 108), "AUTONOMOUS AGENT COMMITMENT-REVEAL CIRCUIT", font=font(22, bold=True), fill="#f0f3e9")
d.text((54, 142), "Verify Agent Decision Integrity Without Disclosing Proprietary Weights or State", font=font(16), fill="#b2a6be")

d.rectangle((54, 180, 1146, 720), fill="#14131a", outline="#322d40", width=1)

# Step 1: Commit Phase
d.rectangle((74, 210, 400, 680), fill="#1a1824", outline="#3b354d", width=1)
d.text((94, 230), "01 // COMMITMENT PHASE", font=font(14, bold=True), fill="#d1ff48")
d.text((94, 270), "Agent calculates decision:", font=font(13), fill="#a49eb5")
d.text((94, 296), "m = 'ORDER_500_UNITS_Q3'", font=font(14, bold=True), fill="#ffffff")
d.text((94, 340), "Salt Generated: 256-bit entropy", font=font(12), fill="#7e7694")
d.rectangle((94, 380, 380, 480), fill="#100f17", outline="#322d40", width=1)
d.text((108, 396), "ON-CHAIN HASH COMMITMENT:", font=font(11, bold=True), fill="#7e7694")
d.text((108, 428), "0x7F4A8C91E2D...B839", font=font(14, bold=True), fill="#d1ff48")
d.text((94, 520), "Timestamp locked to block #4,891,023. Agent cannot alter intent retroactively.", font=font(13), fill="#9b95aa")

# Step 2: ZK Circuit Execution
d.rectangle((430, 210, 770, 680), fill="#1a1824", outline="#3b354d", width=1)
d.text((450, 230), "02 // GROTH16 ZK CIRCUIT", font=font(14, bold=True), fill="#d1ff48")
d.text((450, 270), "Constraint System: R1CS", font=font(13), fill="#a49eb5")
d.text((450, 296), "Constraints: 24,192 gates", font=font(14, bold=True), fill="#ffffff")
d.rectangle((450, 340, 750, 500), fill="#100f17", outline="#322d40", width=1)
d.text((466, 356), "CIRCUIT PROOF TUPLE (pi):", font=font(11, bold=True), fill="#7e7694")
d.text((466, 388), "pi_a: G1 (128 bytes)", font=font(13), fill="#c7bed9")
d.text((466, 416), "pi_b: G2 (256 bytes)", font=font(13), fill="#c7bed9")
d.text((466, 444), "pi_c: G1 (128 bytes)", font=font(13), fill="#c7bed9")
d.text((450, 530), "Public Inputs: [CommitmentHash, BlockTimestamp]", font=font(13), fill="#b9afd0")
d.text((450, 566), "Private Witness: [RawModelDecision, RandomSalt]", font=font(13), fill="#7e7694")

# Step 3: Reveal & Verification
d.rectangle((800, 210, 1126, 680), fill="#1a1824", outline="#3b354d", width=1)
d.text((820, 230), "03 // VERIFICATION RESULT", font=font(14, bold=True), fill="#d1ff48")
d.rectangle((820, 270, 1106, 400), fill="#132418", outline="#2b5936", width=1)
d.text((840, 300), "VERIFICATION STATUS:", font=font(12, bold=True), fill="#6fe099")
d.text((840, 332), "VALIDATED (PASS)", font=font(22, bold=True), fill="#d1ff48")
d.text((840, 368), "Verification Time: 2.14ms", font=font(13), fill="#a4dbb3")
d.text((820, 430), "Cryptographic certainty that agent acted strictly on pre-committed signal parameters.", font=font(14), fill="#b4abc2")
save(im, "ghostsignal")
