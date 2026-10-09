import io
from typing import Tuple
from pypdf import PdfReader

class DocumentParser:
    """
    Parses uploaded markdown, plaintext, and PDF troubleshooting runbooks.
    """

    @staticmethod
    def parse_file(filename: str, content_bytes: bytes) -> Tuple[str, str]:
        """
        Returns (extracted_text, file_type)
        """
        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            try:
                reader = PdfReader(io.BytesIO(content_bytes))
                text_parts = []
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text_parts.append(extracted)
                return "\n\n".join(text_parts), "pdf"
            except Exception as e:
                raise ValueError(f"Failed to parse PDF document: {str(e)}")
        elif lower_name.endswith(".md"):
            return content_bytes.decode("utf-8", errors="replace"), "markdown"
        else:
            return content_bytes.decode("utf-8", errors="replace"), "text"

document_parser = DocumentParser()
