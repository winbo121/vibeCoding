from dataclasses import dataclass
from datetime import datetime


@dataclass
class NormalizedJob:
    source: str
    external_id: str
    title: str
    company: str
    location: str | None = None
    experience: str | None = None
    employment_type: str | None = None
    skills: str | None = None
    summary: str | None = None
    description: str | None = None
    url: str | None = None
    posted_at: datetime | None = None
