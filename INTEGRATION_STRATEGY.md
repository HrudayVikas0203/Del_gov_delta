# Delivery Governance Integration Strategy

This repository is the master application for the integrated delivery governance platform.

## Source Roles

- `Del_gov_delta`: master React/FastAPI application, RBAC, governance, resource allocation, reports, MySQL/SQLAlchemy, ChromaDB, and common LLM services.
- `project_task_tracker`: source for the Task Tracker workflow and task status model.
- `Ai-Solution-Architect-and-business-flow`: source for BRD ingestion, requirements, business flow, architecture, database design, and copilot workflows.

## Integration Rule

`projects.id` is the primary integration key. Tasks, BRDs, requirements, business flows, architectures, database designs, reports, status updates, and resource allocations must all connect back to the master `projects` table.

MySQL remains the source of truth for structured data. ChromaDB should be used only for vector/RAG data. Uploaded documents and generated files should live in backend storage with metadata in MySQL.

## Implemented Modules

### Task Tracker

Frontend:

- `src/pages/TaskTracker.tsx`
- Navigation route: `/tasks`

Backend:

- `backend/app/models/tasks.py`
- `backend/app/api/v1/tasks.py`
- API prefix: `/api/v1/tasks`

The task model links to:

- `projects.id` through `Task.project_id`
- `employees.id` through `Task.assignee_id` and `Task.reporter_id`

### BRD Studio

Frontend:

- `src/pages/BRDStudio.tsx`
- Navigation route: `/brd-studio`

Backend:

- `backend/app/models/brd.py`
- `backend/app/api/v1/brd.py`
- API prefix: `/api/v1/brd`

The BRD model links to:

- `projects.id` through `BRDDocument.project_id`
- `employees.id` through upload and artifact ownership
- BRD artifacts through `BRDDesignArtifact.artifact_type`

## API Mapping

| Source capability | Integrated API |
| --- | --- |
| List/create/update/delete tasks | `/api/v1/tasks` |
| Task comments | `/api/v1/tasks/{task_id}/comments` |
| Upload BRD | `/api/v1/brd/documents/upload` |
| List project BRDs | `/api/v1/brd/documents?project_id=...` |
| Project requirements | `/api/v1/brd/projects/{project_id}/requirements` |
| Save requirements version | `/api/v1/brd/requirements` |
| Business flow artifact | `/api/v1/brd/artifacts` with `artifact_type=business_flow` |
| Solution architecture artifact | `/api/v1/brd/artifacts` with `artifact_type=architecture` |
| Database design artifact | `/api/v1/brd/artifacts` with `artifact_type=database_design` |

## Next Steps

1. Move the richer AI generation services from `Ai-Solution-Architect-and-business-flow` behind the existing common AI/LLM service.
2. Index uploaded BRD chunks into the existing ChromaDB RAG layer using `BRDDocument.id` and `project_id` metadata.
3. Extend executive reports to include task blockers, BRD requirement coverage, and design artifact versions.
4. Add Alembic migrations for the new task and BRD tables before production deployment.
