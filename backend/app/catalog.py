import json
import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = REPO_ROOT / "templates"
CATALOG_PATH = REPO_ROOT / "catalog.json"

# Not an independently selectable document — it's the Mutual NDA's own cover page.
_EXCLUDED_FILENAMES = {"Mutual-NDA-coverpage.md"}

_SPAN_RE = re.compile(r'<span class="[a-z_]+_link">([^<]+)</span>')
_POSSESSIVE_RE = re.compile(r"[’']s$")


def normalize_label(label: str) -> str:
    """Strips a trailing possessive ('s / 's) so grammatical variants of the same
    span text (e.g. "Customer" and "Customer's") collapse to one field."""
    return _POSSESSIVE_RE.sub("", label).strip()


@dataclass(frozen=True)
class DocumentType:
    id: str
    name: str
    description: str
    filename: str
    is_mnda: bool

    @property
    def field_labels(self) -> list[str]:
        text = (TEMPLATES_DIR / self.filename).read_text()
        labels: list[str] = []
        for raw in _SPAN_RE.findall(text):
            label = normalize_label(raw)
            if label not in labels:
                labels.append(label)
        return labels


def _load_document_types() -> dict[str, DocumentType]:
    entries = json.loads(CATALOG_PATH.read_text())
    types: dict[str, DocumentType] = {}
    for entry in entries:
        if entry["filename"] in _EXCLUDED_FILENAMES:
            continue
        doc_id = Path(entry["filename"]).stem.lower()
        types[doc_id] = DocumentType(
            id=doc_id,
            name=entry["name"],
            description=entry["description"],
            filename=entry["filename"],
            is_mnda=doc_id == "mutual-nda",
        )
    return types


DOCUMENT_TYPES: dict[str, DocumentType] = _load_document_types()
