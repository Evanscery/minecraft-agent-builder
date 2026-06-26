from __future__ import annotations

from pydantic import BaseModel, Field


class ValidationIssue(BaseModel):
    type: str
    region: str | None = None
    regions: list[str] = Field(default_factory=list)
    interface: str | None = None
    detail: str


class ValidationReport(BaseModel):
    errors: list[ValidationIssue] = Field(default_factory=list)

    def add(self, issue: ValidationIssue) -> None:
        self.errors.append(issue)

    def extend(self, issues: list[ValidationIssue]) -> None:
        self.errors.extend(issues)

    @property
    def is_valid(self) -> bool:
        return not self.errors
