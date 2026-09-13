# What this build removes

This is the anonymous build of the MINT project page, for double-blind review.
It is the open build with the identifying surface removed and the benchmark
graphics refreshed from the latest manuscript tables. All other technical
claims, figures, and video cases are unchanged.

## Page content

| Open build | This build |
| --- | --- |
| Institutional wordmark (the header logo SVG) in the header | `MINT` set as type; the SVG is deleted, and the CSS class is `.brand-mark` rather than a company name |
| Eyebrow naming the company and year | `Under review · 2026` / `评审中 · 2026` |
| Seven author names with numbered affiliations, in both languages | `Anonymous Authors` / `匿名作者` over `Paper under double-blind review` |
| Hero buttons linking paper, repository, model, dataset | Two non-links: paper under review, and code/model/dataset upon acceptance |
| Header `GitHub ↗` action | Removed |
| `schema.org` JSON-LD with an `author` array and `codeRepository` | Neither; `creativeWorkStatus` states the review instead |
| Integrity statement linking the benchmark directory on the host | Same statement, naming the in-repository path only |
| Four resource cards linking off-site | Four cards stating when each artifact appears |
| BibTeX with named authors and a surname-derived key | `@misc{anonymous2026mint}` with `author = {Anonymous Authors}` |
| Footer contact address and repository link | `Anonymous submission` / `匿名投稿` |
| Sample column headed with the company's robot-hand product name | `Dexterous hand retargeting` / `灵巧手重定向`, `20-DoF dexterous hand` |

## Files

The header logo SVG and `assets/paper/` are deleted. The manuscript PDF
names its authors on page 1, and reviewers read the paper through the
submission system, so no PDF ships here at all rather than a redacted one.

## Project film

`assets/media/mint-film-compact.mp4` and `mint-film-720p.webm` are the
anonymous cut. It follows the open cut apart from two anonymity shots and the
refreshed benchmark graphics. The anonymity shots are re-rendered from the same
code with the same typography and timing:

- **Title card, 00:12.033-00:19.633** — the credit block reads `Anonymous
  Authors` over `Paper under double-blind review` in place of the seven names
  and five institutions.
- **Closing page, 02:05.433-02:13.433** — the headline reads `Everything will
  be open.` and the four destination rows read `released upon acceptance` in
  place of the project page, repository, model, and dataset URLs.

The benchmark summary (01:31.433-01:38.432) and detailed-table shots
(01:38.433-01:54.432) use the latest manuscript values. Their reusable layers
come from `tools/render_benchmark_video_layers.py`.

No other shot in the film carries a name, a logo, or a URL. The derived clips
on the page (`feature-*`, `benchmark-*`) are cut from intervals that do not
overlap either anonymity shot, and `film-poster.webp` is sampled at 00:14.500,
before the credit block fades in, so it is identical in both builds.

Both complete-film assets come from the same refreshed anonymous master: the
CRF 23 MP4 is 30.9 MiB and the 720p VP9 fallback is 17.6 MiB.
