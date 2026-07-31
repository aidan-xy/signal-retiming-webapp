#!/usr/bin/env python3
"""
Import existing signal timings from a NYCDOT corridor comparison workbook
into PostgreSQL.

    # inspect what would be loaded, no database needed
    python import_workbook.py corridor.xlsm --corridor "Linden Blvd" --dry-run

    # load it
    python import_workbook.py corridor.xlsm --corridor "Linden Blvd" \
        --borough Brooklyn --dsn "postgresql://user@localhost/signals"

Exit codes: 0 ok, 1 extraction failure, 2 validation warnings with --strict.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from openpyxl import load_workbook

import extract


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("workbook", help="path to the .xlsm corridor workbook")
    ap.add_argument("--corridor", required=True, help='corridor name, e.g. "Linden Blvd"')
    ap.add_argument("--borough")
    ap.add_argument("--dsn", default=os.environ.get("SIGNALS_DSN"),
                    help="PostgreSQL DSN (or set SIGNALS_DSN)")
    ap.add_argument("--dry-run", action="store_true",
                    help="extract and validate only; print a summary and exit")
    ap.add_argument("--json", metavar="PATH",
                    help="also write the extracted data to a JSON file")
    ap.add_argument("--strict", action="store_true",
                    help="refuse to load if any validation warnings were raised")
    ap.add_argument("--only", nargs="*", metavar="TAB",
                    help="limit to specific intersection tabs (for debugging)")
    args = ap.parse_args()

    if not args.dry_run and not args.dsn:
        ap.error("--dsn is required unless --dry-run is given")

    print(f"reading {args.workbook} ...", file=sys.stderr)
    wb = load_workbook(args.workbook, data_only=True)

    index = extract.read_intersection_index(wb)
    if args.only:
        index = [row for row in index if row[0] in set(args.only)]
    if not index:
        print("no intersection tabs matched", file=sys.stderr)
        return 1

    intersections = []
    failures = 0
    warnings = 0
    for tab, name, order in index:
        try:
            inter = extract.extract_intersection(wb[tab], tab, name, order)
        except extract.LayoutError as exc:
            print(f"  FAIL {tab}: {exc}", file=sys.stderr)
            failures += 1
            continue
        intersections.append(inter)
        flag = ""
        if inter.warnings:
            warnings += len(inter.warnings)
            flag = f"  ({len(inter.warnings)} warning(s))"
        print(f"  {order:>3}  {tab:<20} {len(inter.timing_plans)} plans, "
              f"{len(inter.splits)} splits, {len(inter.tod_slots)} tod slots{flag}",
              file=sys.stderr)
        for w in inter.warnings:
            print(f"         ! {w}", file=sys.stderr)

    print(f"\n{len(intersections)} intersection(s) extracted, "
          f"{failures} failure(s), {warnings} warning(s)", file=sys.stderr)

    if failures:
        print("aborting: some tabs could not be parsed", file=sys.stderr)
        return 1
    if warnings and args.strict:
        print("aborting: --strict and warnings present", file=sys.stderr)
        return 2

    if args.json:
        import dataclasses
        with open(args.json, "w") as fh:
            json.dump([dataclasses.asdict(i) for i in intersections], fh, indent=2)
        print(f"wrote {args.json}", file=sys.stderr)

    if args.dry_run:
        print("dry run: nothing written to the database", file=sys.stderr)
        return 0

    import load
    load.load_corridor(
        dsn=args.dsn,
        corridor_name=args.corridor,
        borough=args.borough,
        intersections=intersections,
        source_file=os.path.basename(args.workbook),
    )
    print(f"loaded corridor {args.corridor!r}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
