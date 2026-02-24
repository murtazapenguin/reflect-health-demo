from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class Provider(Document):
    npi: Indexed(str, unique=True)
    name: str
    practice_name: str
    zip_code: str
    tin: Optional[str] = None
    fax_number: Optional[str] = None
    specialty: str = ""
    phone: Optional[str] = None

    class Settings:
        name = "providers"
