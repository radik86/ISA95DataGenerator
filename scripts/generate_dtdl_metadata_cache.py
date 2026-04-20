#!/usr/bin/env python3
"""
Generate DTDL metadata cache for ISA95 validation.

This utility builds/refreshes the metadata cache file from DTDL JSON files so
validation can run later without needing the full DTDL directory.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from validate_isa95_entities_and_mappings import Validator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate ISA95 DTDL metadata cache")
    parser.add_argument(
        "--dtdl-dir",
        required=True,
        help="Directory containing ISA95 DTDL JSON files",
    )
    parser.add_argument(
        "--metadata-cache",
        default="generated/dtdl_metadata_cache.json",
        help="Output path for metadata cache JSON",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    validator_args = argparse.Namespace(
        data_dirs=[],
        dtdl_dir=args.dtdl_dir,
        metadata_cache=args.metadata_cache,
        refresh_metadata=True,
        output_json="",
        max_past_days=3650,
        max_future_days=30,
        exclude_master_process=True,
        include_master_process=False,
    )

    validator = Validator(validator_args)
    validator.load_dtdl()

    cache_path = Path(args.metadata_cache)
    print("DTDL metadata cache generated")
    print(f"  DTDL dir: {args.dtdl_dir}")
    print(f"  Cache path: {cache_path}")
    print(f"  Entity count: {len(validator.dtdl_entities)}")
    print(f"  Source: {validator.dtdl_metadata_source}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
