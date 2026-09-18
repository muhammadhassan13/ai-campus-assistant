"""
OpenDataLoader PDF sidecar for the AI Campus Assistant.

Wraps opendataloader_pdf.convert() and reshapes its JSON output into the
shape expected by the Express backend's parsePdfWithOpenDataLoader().

100% local execution — no cloud APIs, no data leaves the machine.
"""

import json
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List

import opendataloader_pdf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI(title="OpenDataLoader PDF Sidecar", version="1.0.0")

PARSER_MODE = os.getenv("ODL_PARSER_MODE", "hybrid")

ALLOWED_TYPES = {"text", "heading", "table"}


def _extract_pages(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    pages_out: List[Dict[str, Any]] = []
    for page in payload.get("pages", []):
        page_num = int(page.get("page_number") or page.get("page") or 1)
        elements = page.get("elements") or page.get("items") or []

        blocks: List[Dict[str, Any]] = []
        for idx, el in enumerate(elements):
            el_type = str(el.get("type", "text")).lower()
            if el_type not in ALLOWED_TYPES:
                continue

            bbox = el.get("bbox") or el.get("bounding_box")
            if not isinstance(bbox, (list, tuple)) or len(bbox) < 4:
                continue

            x0, y0, x1, y1 = (
                float(bbox[0]),
                float(bbox[1]),
                float(bbox[2]),
                float(bbox[3]),
            )

            block: Dict[str, Any] = {
                "id": f"p{page_num}_i{idx}",
                "type": el_type,
                "md": el.get("text") or el.get("md") or "",
                "value": el.get("text") or "",
                "pageNumber": page_num,
                "bbox": {
                    "x": x0,
                    "y": y0,
                    "width": max(0.0, x1 - x0),
                    "height": max(0.0, y1 - y0),
                },
            }
            if el_type == "heading" and "level" in el:
                try:
                    block["level"] = int(el["level"])
                except (TypeError, ValueError):
                    pass
            if el_type == "table":
                if "rows" in el:
                    block["rows"] = el["rows"]
                if "html" in el:
                    block["html"] = el["html"]
            blocks.append(block)

        pages_out.append(
            {
                "pageNumber": page_num,
                "width": float(page.get("width") or 0.0),
                "height": float(page.get("height") or 0.0),
                "blocks": blocks,
            }
        )
    return pages_out


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "mode": PARSER_MODE}


@app.post("/parse")
async def parse(file: UploadFile = File(...)) -> JSONResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Only PDF files are accepted."
        )

    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = Path(tmp) / f"{uuid.uuid4().hex}.pdf"
        out_dir = Path(tmp) / "out"
        out_dir.mkdir(parents=True, exist_ok=True)

        try:
            pdf_path.write_bytes(await file.read())
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Failed to save upload: {exc}"
            )

        try:
            opendataloader_pdf.convert(
                input_path=[str(pdf_path)],
                output_dir=str(out_dir),
                format="json,markdown",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Parser failed: {exc}"
            )

        json_files = sorted(out_dir.glob("*.json"))
        md_files = sorted(out_dir.glob("*.md"))

        if not json_files:
            raise HTTPException(
                status_code=500, detail="Parser produced no JSON output."
            )

        payload = json.loads(json_files[0].read_text(encoding="utf-8"))
        markdown = md_files[0].read_text(encoding="utf-8") if md_files else ""

        pages = _extract_pages(payload)

        page_dims = None
        if pages:
            widest = max((p["width"] for p in pages), default=0.0)
            tallest = max((p["height"] for p in pages), default=0.0)
            page_dims = {"width": widest, "height": tallest}

        all_blocks: List[Dict[str, Any]] = []
        for p in pages:
            all_blocks.extend(p["blocks"])

        full_text = markdown or "\n\n".join(
            b["md"] for b in all_blocks if b.get("md")
        )

        return JSONResponse(
            {
                "fullText": full_text,
                "blocks": all_blocks,
                "pageDimensions": page_dims,
            }
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)