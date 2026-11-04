"""Figures 3-7 of the extended paper, drawn from the project's stored measurements (see the data paths below)."""
import json
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
REG = ROOT / "backend" / "models" / "registry" / "v20261025-153602" / "metrics.json"
REP = ROOT / "backend" / "reports"
LAND = ROOT / "backend" / "data" / "processed" / "landmarks"
plt.rcParams.update({"font.family": "serif", "font.serif": ["Times New Roman", "DejaVu Serif"], "font.size": 8,
                     "axes.edgecolor": "#888", "axes.linewidth": 0.6, "pdf.fonttype": 42})
INK, MUTED, GRID = "#222222", "#555555", "#e6e6e6"
BLUE, ORANGE, GREEN = "#2a78d6", "#eb6834", "#1baf7a"
RAMP = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"]


def style(ax, ygrid=True):
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    if ygrid:
        ax.yaxis.grid(True, color=GRID, linewidth=0.6, zorder=0)
    ax.set_axisbelow(True)
    ax.tick_params(colors=MUTED, length=2)


def save(fig, name):
    fig.tight_layout(pad=0.3)
    fig.savefig(f"{name}.pdf")
    fig.savefig(f"{name}.png", dpi=220)
    plt.close(fig)


m = json.loads(REG.read_text(encoding="utf-8"))

# Fig. 3 - threshold calibration on out-of-fold development predictions
curve = m["calibration"]["curve"]
th = [p["threshold"] for p in curve]
fig, ax = plt.subplots(figsize=(3.45, 2.2))
for key, color, ls, mk, lab in (("precision", BLUE, "-", "o", "Precision"), ("recall", ORANGE, "--", "s", "Recall"),
                                ("coverage", GREEN, ":", "^", "Coverage")):
    ys = [p[key] for p in curve]
    ax.plot(th, ys, ls, color=color, lw=1.6, marker=mk, ms=3.2, markevery=3, label=lab, zorder=3)
    ax.text(th[-1] + 0.012, ys[-1], lab, color=INK, fontsize=6.5, va="center")
ax.axvline(m["calibration"]["threshold"], color=MUTED, lw=0.8, ls="-", zorder=2)
ax.text(m["calibration"]["threshold"] + 0.01, 0.97, "chosen 0.50", fontsize=6.3, color=MUTED, va="top")
ax.set_xlabel("Confidence threshold", color=INK); ax.set_ylabel("Share", color=INK)
ax.set_xlim(0.05, 1.08); ax.set_ylim(0, 1.02)
style(ax)
save(fig, "fig_calibration")

# Fig. 4 - per-sign F1 on the 314-video test set (signs with test videos)
f1 = sorted((v["f1-score"] for v in m["per_class"].values() if (v.get("support") or 0) > 0), reverse=True)
fig, ax = plt.subplots(figsize=(3.45, 1.9))
ax.bar(range(len(f1)), f1, width=0.8, color=RAMP[2], zorder=3)
zeros = [i for i, v in enumerate(f1) if v == 0]
if zeros:                                   # a zero-height bar is invisible: mark it
    ax.plot(zeros, [0.012] * len(zeros), "v", color=ORANGE, ms=3.5, zorder=5)
mean = sum(f1) / len(f1)
ax.axhline(mean, color=ORANGE, lw=1.0, ls="--", zorder=4)
ax.text(len(f1) - 1, mean + 0.03, f"mean {mean:.2f}", ha="right", fontsize=6.5, color=INK)
ax.set_xlabel(f"Signs, sorted by F1 ({len(f1)} signs with test videos)", color=INK); ax.set_ylabel("F1-score", color=INK)
ax.set_xlim(-0.8, len(f1) - 0.2); ax.set_ylim(0, 1.05); ax.set_xticks([])
style(ax)
save(fig, "fig_perclass")

# Fig. 5 - robustness to landmark-level perturbations of real held-out recordings
rob = json.loads((REP / "robustness_eval.json").read_text(encoding="utf-8"))["conditions"]
names = list(rob)[::-1]
vals = [rob[k]["top1_ignoring_threshold"] * 100 for k in names]
fig, ax = plt.subplots(figsize=(3.45, 2.5))
colors = [ORANGE if k == "no face visible" else (RAMP[3] if k == "original" else RAMP[1]) for k in names]
ax.barh(range(len(names)), vals, height=0.62, color=colors, zorder=3)
for i, v in enumerate(vals):
    ax.text(v + 0.8, i, f"{v:.1f}", va="center", fontsize=6.3, color=INK)
ax.set_yticks(range(len(names))); ax.set_yticklabels(names, fontsize=6.5, color=INK)
ax.set_xlabel("Top-1 accuracy (%), 268 held-out videos", color=INK); ax.set_xlim(0, 80)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
ax.xaxis.grid(True, color=GRID, linewidth=0.6, zorder=0); ax.set_axisbelow(True); ax.tick_params(colors=MUTED, length=2)
save(fig, "fig_robustness")

# Fig. 6 - segmentation variants: sign error rate on 50 test streams of 5 signs with known boundaries
seg = json.loads((REP / "segmentation_eval.json").read_text(encoding="utf-8"))["test"]
variants = [("current: still 800 ms, absent 200 ms", "Default\n(800/200 ms)"), ("still 600 ms + absent 400 ms", "600/400 ms"),
            ("absent 600 ms", "absent\n600 ms"), ("sliding window + stability gate", "Sliding\nwindow"), ("dip split + absent 400 ms", "Dip\nsplit")]
conds = [("pause", "Short pause", BLUE, ""), ("back_to_back", "Back to back", ORANGE, "////"), ("trimmed", "Hands never lowered", GREEN, "....")]
fig, ax = plt.subplots(figsize=(3.45, 2.3))
w = 0.26
for j, (c, lab, col, hatch) in enumerate(conds):
    xs = [i + (j - 1) * (w + 0.015) for i in range(len(variants))]
    ax.bar(xs, [seg[v][c]["sign_error_rate"] for v, _ in variants], w, color=col, hatch=hatch, edgecolor="white",
           linewidth=0.4, label=lab, zorder=3)
ax.set_xticks(range(len(variants))); ax.set_xticklabels([n for _, n in variants], fontsize=6.4, color=INK)
ax.set_ylabel("Sign error rate (lower is better)", color=INK)
ax.legend(fontsize=6.2, frameon=False, ncol=3, loc="upper left", bbox_to_anchor=(0, 1.13), handlelength=1.4, columnspacing=0.8)
style(ax)
save(fig, "fig_segmentation")

# Fig. 7 - training videos per sign by source (active model's 64 signs)
counts = m["class_counts"]
src = defaultdict(lambda: defaultdict(int))
for f in LAND.glob("*/*/*.json"):
    src[f.parent.parent.name][f.parent.name] += 1
order = sorted(counts, key=lambda k: -counts[k])
am = [src["amrita_slr"].get(k, 0) for k in order]
inc = [src["include"].get(k, 0) for k in order]
fig, ax = plt.subplots(figsize=(3.45, 1.9))
ax.bar(range(len(order)), am, 0.8, color=BLUE, label="Amrita SLR", zorder=3)
ax.bar(range(len(order)), inc, 0.8, bottom=am, color=ORANGE, label="INCLUDE", zorder=3, edgecolor="white", linewidth=0.3)
ax.set_xticks([]); ax.set_xlabel(f"{len(order)} signs, sorted by number of recordings", color=INK)
ax.set_ylabel("Valid recordings", color=INK)
ax.legend(fontsize=6.4, frameon=False, loc="upper right")
style(ax)
save(fig, "fig_datadist")
print("figures written")
