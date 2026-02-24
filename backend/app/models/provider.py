from typing import List, Optional

from beanie import Document, Indexed
from pydantic import Field


class Provider(Document):
    npi: Indexed(str, unique=True)
    name: str
    practice_name: str
    zip_code: str
    zip_codes: List[str] = Field(default_factory=list)
    tin: Optional[str] = None
    fax_number: Optional[str] = None
    specialty: str = ""
    phone: Optional[str] = None
    credential: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    cms_sourced: bool = False

    class Settings:
        name = "providers"
