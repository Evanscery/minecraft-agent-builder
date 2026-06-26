"""Shared service singletons so all routers operate on the same in-memory state."""
from __future__ import annotations

from app.services.config_service import ConfigService
from app.services.sample_project import SampleProjectService

sample_project_service = SampleProjectService()
config_service = ConfigService()
