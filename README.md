# mcAgentBuilder

A constraint-first Minecraft blueprint prototype built around structured regions, material rules, merging, validation, and an interactive 3D frontend workbench.

## What is in this stage

This repository currently provides a **working closed loop**:

- a FastAPI backend with domain models, validation rules, and real mutation/export
- a sample project generator that builds a small castle-like layout
- a real Minecraft block database (`backend/app/data/blocks.json`, sourced from PrismarineJS/minecraft-data)
- real block textures loaded from PrismarineJS/minecraft-assets in the 3D preview
- Litematica (`.litematic`) as the default export format, written as gzip-compressed NBT
- a React + Vite + Three.js frontend with a 3D voxel workbench (see `docs/frontend-design.md`)
- backend tests covering the main constraint and command flows

It does **not** yet call external LLM services. This is intentional: the current stage focuses on stable data contracts and rule enforcement before adding agent orchestration.

## Repository layout

```text
backend/
  app/
    api/
    core/
    data/
    domain/
    schemas/
    services/
  tests/
frontend/
docs/
```

## Local development

### 1. Backend setup

Recommended: use a dedicated virtual environment so this project does not interfere with your global Python packages.

#### PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "backend[dev]"
```

Start the backend:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 9393
```

Frontend API base URL defaults to `http://127.0.0.1:9393`.

Backend endpoints:

- `GET /health`
- `GET /materials`
- `POST /projects/sample`
- `POST /projects/create` — structured new-project (name/size/theme/build_mode/version/base_fills), no natural language
- `DELETE /projects/{project_id}`
- `GET /projects/{project_id}`
- `GET /projects/{project_id}/preview`
- `GET /projects/{project_id}/validation`
- `POST /projects/{project_id}/retry-region`
- `POST /projects/{project_id}/manual-patch`
- `POST /projects/{project_id}/export` (formats: `litematica` default, `json`, `mcfunction`)
- `POST /projects/{project_id}/undo` — roll back the last manual patch (Ctrl+Z)
- `POST /projects/{project_id}/save` / `POST /projects/{project_id}/load` — persist/restore snapshots (Ctrl+S)
- `GET /config` · `PUT /config` — user config (language, defaults, renderer/export overrides)
- `GET /config/prompts` · `PUT /config/prompts` — edit agent prompt templates (5 stages)
- `GET /mods` · `POST /mods` · `DELETE /mods/{id}` — dynamic mod material import (advanced mode)
- `GET /saved-projects` · `POST /projects/{id}/save-as` · `DELETE /saved-projects/{name}` — named save-as snapshots
- `GET /materials?version=` · `GET /materials/versions` · `POST /materials/refresh?version=` — versioned, updateable block database (1.20.1..1.21.1, 1000+ blocks)

### 2. Frontend setup

Install dependencies:

```powershell
cd frontend
npm install
```

Start the frontend:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Build the frontend:

```powershell
npm run build
```

## Running tests

Backend tests:

```powershell
python -m pytest backend/tests
```

## Current architecture

### Backend

The backend is split by responsibility:

- `domain/` — core data models
- `services/` — material planning, blueprint expansion, merging, validation, sample assembly
- `schemas/` — API response models
- `api/` — HTTP routes only
- `data/` — seed materials CSV

The sample project data is also modularized so the assembly layer stays thin:

- `services/sample_project_spec.py` — sample project metadata, regions, interfaces
- `services/sample_project_blueprints.py` — sample region blueprint seed data
- `services/sample_project.py` — runtime assembly of sample state

### Frontend

The frontend is a modern 3D workbench (`docs/frontend-design.md`):

- Three.js voxel preview with orbit camera, presets, and per-block selection
- **Correct block rendering**: full blocks use textured cubes; decorative blocks (torch/lantern) use camera-facing billboard sprites; glass panes render as thin translucent panes; transparent/glass blocks are translucent and don't occlude; emissive blocks (torch/lantern) emit real point lights
- real Minecraft textures loaded from PrismarineJS minecraft-assets
- region tree, palette, and validation panels that drive the 3D view
- view modes (full / region / layer / material / interface / error) and x-ray
- **view / edit interaction modes** (Tab) so left-drag never accidentally selects while editing
- manual edit tools: paint (replace), **build** (place new blocks in empty cells), erase, box (selection), each with auto-refresh
- **undo (Ctrl+Z)** and **save (Ctrl+S)** with top toolbar buttons
- retry and export panels with copy/download; litematica is the default export
- bottom bar toggles ground (void / superflat grass) and background (sky / day / night)
- keyboard shortcuts, toasts, and fully Chinese-localized UI
- polished glass-morphism styling

## Constraint flow

The current sample flow is:

```text
materials.csv
→ material repository
→ active palette
→ region blueprints
→ merger
→ validator
→ API responses
→ frontend viewer
```

## Notes

- `.env.local` is not required for the current stage.
- No external provider calls are needed for development or tests.
- If you later add real planner/agent integrations, keep the current domain and validation layers as the stable core.
