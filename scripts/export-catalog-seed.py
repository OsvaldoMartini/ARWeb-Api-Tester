import json
import os
import sqlite3
import sys


def main() -> int:
    if len(sys.argv) != 3:
      print("usage: export-catalog-seed.py <input-db> <output-json>", file=sys.stderr)
      return 1

    input_db = os.path.abspath(sys.argv[1])
    output_json = os.path.abspath(sys.argv[2])

    if not os.path.exists(input_db):
      print(f"missing database: {input_db}", file=sys.stderr)
      return 1

    con = sqlite3.connect(input_db)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    def rows(query: str):
      return [dict(row) for row in cur.execute(query)]

    def endpoints():
      result = []
      for row in cur.execute("SELECT id, spec_id, operation_id, method, path, summary, description, tags, category_id FROM api_endpoints ORDER BY path, method"):
        item = dict(row)
        try:
          item["tags"] = json.loads(item.get("tags") or "[]")
        except Exception:
          item["tags"] = []
        result.append(item)
      return result

    payload = {
      "ApiSpecs": rows("SELECT id, title, version, source_path, raw_format, imported_at, endpoint_count FROM api_specs ORDER BY imported_at DESC"),
      "ApiEndpoints": endpoints(),
    }

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
      json.dump(payload, f, ensure_ascii=False, indent=2)

    print(output_json)
    con.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
