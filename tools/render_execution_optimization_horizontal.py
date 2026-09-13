#!/usr/bin/env python3
"""Reflow the measured EgoPipeline execution figure for a wide web layout."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyArrowPatch

# Anonymous build: the manuscript figure-generation tree lives outside this
# directory and its absolute path names the author's account, so it is passed
# in rather than hard-coded. The open build carries the concrete path.
DEFAULT_SOURCE_CODE = Path(
    os.environ.get("MINT_FIGURE_CODE",
                   "<paper>/materials/pic_gen_code/"
                   "ego_pipeline/dist_gpu_record/code")
)


def load_figure_module(source_code: Path):
    sys.path.insert(0, str(source_code.resolve()))
    import dist_gpu_record_optimization_overview_v2 as overview

    return overview


def build_horizontal_figure(overview, serial_rows, serial_events, serial_summary,
                            dist_times, dist_util, dist_memory):
    colors = overview.COLORS
    distributed = overview.distributed
    base = overview.base

    fig = plt.figure(figsize=(13.6, 7.0), facecolor="none")
    outer = fig.add_gridspec(
        2,
        2,
        height_ratios=[0.72, 5.8],
        width_ratios=[0.78, 1.22],
        hspace=0.10,
        wspace=0.16,
    )
    overview.draw_header(fig.add_subplot(outer[0, :]))

    serial_video = serial_summary.get("input_video") or {}
    ba_steps = serial_summary.get("megasam_ba_steps") or {}
    ba_detail = ""
    if ba_steps:
        ba_detail = (
            f"  |  BA {ba_steps['stage1']}/{ba_steps['stage2']}/{ba_steps['stage3']}"
        )
    serial_detail = (
        f"{serial_video.get('total_frames', 270)} frames  |  "
        f"{serial_summary['wall_time_s']:.1f} s{ba_detail}"
    )

    serial_panel = outer[1, 0].subgridspec(
        2, 1, height_ratios=[0.20, 1.80], hspace=0.08
    )
    overview.draw_section_header(
        fig.add_subplot(serial_panel[0, 0]),
        "A",
        "SERIAL EGOPIPELINE · 1 GPU",
        serial_detail,
    )

    serial_times = np.asarray([row["t"] for row in serial_rows], dtype=float)
    serial_util = np.asarray(
        [row["gpus"][0]["util"] for row in serial_rows], dtype=float
    )
    serial_memory = np.asarray(
        [row["gpus"][0]["mem_used"] / 1024.0 for row in serial_rows], dtype=float
    )
    serial_duration = max(
        serial_times[-1], max(event["end_s"] for event in serial_events)
    )
    serial_grid = serial_panel[1, 0].subgridspec(
        4,
        2,
        height_ratios=[0.20, 0.20, 0.78, 0.55],
        width_ratios=[0.95, 5.6],
        hspace=0.12,
        wspace=0.03,
    )
    serial_labels = (
        ("CPU", True, colors["cpu_edge_1"]),
        ("GPU 0", True, colors["ink"]),
        ("UTIL. (%)", False, None),
        ("VRAM (GiB)", False, colors["memory_trace"]),
    )
    for row, (label, strong, color) in enumerate(serial_labels):
        distributed.draw_row_label(
            fig.add_subplot(serial_grid[row, 0]),
            label,
            strong=strong,
            color=color,
        )
    overview.draw_serial_bar(
        fig.add_subplot(serial_grid[0, 1]), serial_events, serial_duration, "cpu"
    )
    overview.draw_serial_bar(
        fig.add_subplot(serial_grid[1, 1]), serial_events, serial_duration, "gpu"
    )
    overview.draw_serial_utilization(
        fig.add_subplot(serial_grid[2, 1]),
        serial_times,
        serial_util,
        serial_events,
        serial_duration,
    )
    overview.draw_serial_memory(
        fig.add_subplot(serial_grid[3, 1]),
        serial_times,
        serial_memory,
        serial_duration,
    )

    distributed_panel = outer[1, 1].subgridspec(
        7,
        2,
        height_ratios=[0.20, 0.52, 0.42, 1, 1, 1, 1],
        width_ratios=[0.78, 6.4],
        hspace=0.11,
        wspace=0.025,
    )
    overview.draw_section_header(
        fig.add_subplot(distributed_panel[0, :]),
        "B",
        "DISTRIBUTED EXECUTION · 4 GPUs",
        "80 s production window  |  shared queue  |  asynchronous CPU stages",
    )
    distributed.draw_scheduler(fig.add_subplot(distributed_panel[1, :]))

    dist_duration = base.WINDOW_END_S - base.WINDOW_START_S
    distributed.draw_cpu_pool_labels(
        fig.add_subplot(distributed_panel[2, 0]), distributed.CPU_PEAK_WORKERS
    )
    distributed.draw_cpu_pool(
        fig.add_subplot(distributed_panel[2, 1]), dist_duration
    )
    for gpu_id in range(4):
        row_left = distributed_panel[gpu_id + 3, 0].subgridspec(
            3, 1, height_ratios=[0.15, 0.50, 0.35], hspace=0.07
        )
        row_right = distributed_panel[gpu_id + 3, 1].subgridspec(
            3, 1, height_ratios=[0.15, 0.50, 0.35], hspace=0.07
        )
        distributed.draw_row_label(
            fig.add_subplot(row_left[0, 0]),
            f"GPU {gpu_id}",
            strong=True,
            color=colors["ink"],
        )
        distributed.draw_row_label(fig.add_subplot(row_left[1, 0]), "UTIL. (%)")
        distributed.draw_row_label(
            fig.add_subplot(row_left[2, 0]),
            "VRAM (GiB)",
            color=colors["memory_trace"],
        )
        distributed.draw_model_bar(
            fig.add_subplot(row_right[0, 0]), gpu_id, dist_duration
        )
        distributed.draw_utilization(
            fig.add_subplot(row_right[1, 0]),
            dist_times,
            dist_util[gpu_id],
            gpu_id,
        )
        distributed.draw_memory(
            fig.add_subplot(row_right[2, 0]),
            dist_times,
            dist_memory[gpu_id],
        )

    arrow = FancyArrowPatch(
        (0.391, 0.48),
        (0.445, 0.48),
        transform=fig.transFigure,
        arrowstyle="-|>",
        mutation_scale=16,
        linewidth=1.6,
        color=colors["accent"],
    )
    fig.add_artist(arrow)
    fig.text(
        0.418,
        0.515,
        "GLOBAL\nSCHEDULING",
        ha="center",
        va="bottom",
        fontsize=6.5,
        fontweight="bold",
        color=colors["accent"],
    )
    fig.text(
        0.418,
        0.425,
        "3.4x\nFASTER",
        ha="center",
        va="top",
        fontsize=8.0,
        fontweight="bold",
        color=colors["accent"],
    )
    fig.text(
        0.745,
        0.012,
        "Time in representative 4-GPU production window (s)",
        ha="center",
        va="bottom",
        fontsize=6.3,
        color=colors["muted"],
    )
    fig.subplots_adjust(left=0.012, right=0.995, top=0.995, bottom=0.045)
    return fig


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-code", type=Path, default=DEFAULT_SOURCE_CODE)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("assets/pipeline/execution-optimization-horizontal.png"),
    )
    args = parser.parse_args()

    overview = load_figure_module(args.source_code)
    serial_rows, serial_events, serial_summary = overview.load_serial_run(
        overview.DEFAULT_SERIAL_RUN
    )
    dist_times, dist_util, dist_memory, _, _ = overview.load_distributed_trace(
        overview.base.DEFAULT_INPUT
    )
    font_family = overview.register_font()
    plt.rcParams.update(
        {
            "font.family": font_family,
            "pdf.fonttype": 42,
            "ps.fonttype": 42,
            "svg.fonttype": "none",
        }
    )
    figure = build_horizontal_figure(
        overview,
        serial_rows,
        serial_events,
        serial_summary,
        dist_times,
        dist_util,
        dist_memory,
    )
    output = args.out.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output, transparent=True)
    plt.close(figure)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
