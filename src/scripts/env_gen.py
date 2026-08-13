"""Generate the project .env file from urls.json.

By default this reads the sibling urls.json file and writes the generated
CALENDARS_JSON value to src/calenmerge/.env.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_calendars(urls_path: Path) -> dict[str, Any]:
	with urls_path.open("r", encoding="utf-8") as handle:
		data = json.load(handle)

	if not isinstance(data, dict):
		raise ValueError("urls.json must contain a top-level JSON object")

	return data


def build_env_content(calendars: dict[str, Any]) -> str:
	calendars_json = json.dumps(calendars, separators=(",", ":"), ensure_ascii=False)
	return f"CALENDARS_JSON={calendars_json}\n"


def resolve_default_paths() -> tuple[Path, Path]:
	script_dir = Path(__file__).resolve().parent
	urls_path = script_dir / "urls.json"
	env_path = script_dir.parent / "calenmerge" / ".env"
	return urls_path, env_path


def parse_args() -> argparse.Namespace:
	default_urls_path, default_env_path = resolve_default_paths()

	parser = argparse.ArgumentParser(
		description="Generate src/calenmerge/.env from src/scripts/urls.json",
	)
	parser.add_argument(
		"--input",
		type=Path,
		default=default_urls_path,
		help=f"Path to urls.json (default: {default_urls_path})",
	)
	parser.add_argument(
		"--output",
		type=Path,
		default=default_env_path,
		help=f"Path to write the .env file (default: {default_env_path})",
	)
	return parser.parse_args()


def main() -> int:
	args = parse_args()

	calendars = load_calendars(args.input)
	env_content = build_env_content(calendars)

	args.output.parent.mkdir(parents=True, exist_ok=True)
	args.output.write_text(env_content, encoding="utf-8")

	print(f"Wrote {args.output}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
