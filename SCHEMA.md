# ReqVerify AI — Updated Database Schema, APIs & Workflows

## Database Collections (MongoDB)

### `users`
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Auto-increment primary key |
| username | String | Analyst/admin/client display name |
| email | String | Login email |
| password_hash | String | bcrypt hash |
| role | String | `admin` \| `qa_analyst` \| `client` |
| employee_id | String | e.g. QA001 |
| level | String | Designation (Junior/Mid/Senior/Lead QA Analyst) |
| experience | Number | Years of experience |
| status | String | `Active` \| `Inactive` |
| employment_status | String | Full-time, Part-time, Contract |
| created_at | Date | Account creation timestamp |

### `requirements`
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Version-specific ID |
| root_requirement_id | Number | Stable ID across all versions |
| title | String | Requirement title |
| client_name | String | Client organization |
| description | String | Extracted requirement text |
| pdf_path | String | Uploaded PDF path |
| status | String | `pending_validation`, `under_validation`, `under_review`, `approved`, `returned_to_client`, `resubmitted`, `archived_version` |
| version | Number | Version number (1, 2, 3...) |
| parent_id | Number | Previous version ID |
| assigned_to | Number | QA analyst user ID |
| created_by | Number | Creator user ID |
| submitted_by | String | Resubmission actor |
| change_notes | String | Client revision notes |
| return_reason | String | Admin return reason |
| admin_feedback | String | Feedback to client |
| returned_at | Date | Return timestamp |
| archived_at | Date | When superseded by new version |
| created_at | Date | Version creation timestamp |

### `validation_reports`
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Report ID |
| requirement_id | Number | Linked requirement version |
| qa_analyst_id | Number | Submitting analyst |
| checklist_results | JSON String | Pass/fail per checklist rule |
| ai_findings | JSON String | AI analysis results |
| missing_requirements | String | Gap annotations |
| ambiguous_requirements | String | Ambiguity annotations |
| incomplete_requirements | String | Incomplete path notes |
| recommendations | String | Suggested rewrites |
| overall_quality_score | Number | Checklist pass rate % |
| status | String | `submitted`, `approved`, `qa_rejected`, `returned_to_client` |
| admin_decision | String | `approve`, `reject_qa`, `return_client` |
| admin_feedback | String | Admin review comments |
| decided_at | Date | Decision timestamp |
| returned_to_client_at | Date | Client return timestamp |
| created_at / updated_at | Date | Timestamps |

### `mistake_logs`
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Log ID |
| qa_analyst_id | Number | Analyst who made mistake |
| requirement_id | Number | Related requirement |
| missed_checklist_rule | String | Which rule was missed |
| mistake_type | String | Category of mistake |
| severity | String | Low/Medium/High/Critical |
| frequency | Number | Occurrence count (deduped per day) |
| date | Date | Mistake date |
| created_at | Date | Log creation |

> **Note:** Mistake logs are used for competency training recommendations only. They do NOT affect QA accuracy calculations.

### `competency_assessments`
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Assessment ID |
| qa_analyst_id | Number | Assigned analyst |
| title | String | Assessment title |
| category | String | Primary competency category |
| assessment_type | String | `scenario_based`, `multiple_choice`, `practical_analysis` |
| question_count | Number | Always 10 |
| category_distribution | Object | Questions per category |
| weakness_profile | Object | Analyst mistake pattern snapshot |
| questions | Array | 10 unique scenario-based MCQs |
| status | String | `assigned` \| `completed` |
| answers | Object | Submitted answers (on completion) |
| score | Number | Percentage score |
| category_scores | Object | Per-category performance |
| improvement_from_previous | Number | Score delta from last attempt |
| improvement_recommendations | String | AI/static training advice |
| created_at / completed_at | Date | Timestamps |

### `quiz_attempts` (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | Number | Attempt ID |
| assessment_id | Number | Parent assessment |
| qa_analyst_id | Number | Analyst who completed |
| answers | Object | Question ID → selected option |
| score | Number | Overall percentage |
| category_scores | Object | Per-category breakdown |
| improvement_from_previous | Number | Delta from prior attempt |
| completed_at | Date | Completion timestamp |

### `checklist_rules` (seeded, read-only)
8 standard validation rules used during QA checklist evaluation.

### `ai_analyses`
Cached AI comparative audit results per requirement.

### `counters`
Auto-increment sequences per collection.

---

## Employee Performance Metrics

### Accuracy Formula
```
Accuracy = Approved Reviews / (Approved Reviews + QA Mistakes) × 100
```

### Decision Rules
| Admin Decision | Counts As | Affects Accuracy |
|----------------|-----------|------------------|
| Approve Spec | Approved Review | Yes (positive) |
| Reject & Return QA | QA Mistake | Yes (negative) |
| Return Client | Returned to Client | **No** — excluded from accuracy |

### Data Synchronization
On every `GET /api/employees`, `syncHistoricalReportDecisions()` reprocesses legacy `rejected` reports into `qa_rejected` or `returned_to_client` based on requirement state and mistake logs.

---

## Competency Assessment Engine

### Question Categories (7)
1. Validation Rules
2. Acceptance Criteria
3. Business Rules
4. Requirement Completeness
5. Ambiguity Detection
6. Exception Handling
7. Checklist Evaluation

### Generation Rules
- **Fixed length:** Exactly 10 questions per assessment
- **Uniqueness:** No duplicate questions within same assessment
- **Difficulty mix:** 3 easy, 4 medium, 3 challenging
- **Intelligent weighting:** Categories with frequent mistake patterns receive more questions
- **Auto-detect:** When no category specified, targets analyst's top mistake category

### Mistake → Category Mapping
| Mistake Type | Training Category |
|-------------|-------------------|
| Missed Validation Rule | Validation Rules |
| Missed Acceptance Criteria | Acceptance Criteria |
| Missed Business Rule | Business Rules |
| Missed Ambiguous Requirement | Ambiguity Detection |
| Incorrect Checklist Evaluation | Checklist Evaluation |

---

## Requirement Versioning Workflow

```
Client → Admin → QA Analyst → Admin Review
                ↓ (if returned)
Admin → Client → Client Updates → New Version (V+1) → Admin → QA Analyst → Admin Review
```

### Version Rules
- Never overwrite previous versions
- New version created on every client resubmission
- Parent version archived with `archived_version` status
- Full version history available via `GET /api/requirements/:id/versions`

---

## API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register user |
| POST | `/login` | Public | JWT login |
| GET | `/me` | JWT | Current user |

### Requirements — `/api/requirements`
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/` | admin | Create requirement + PDF |
| GET | `/` | all | List (role-filtered) |
| GET | `/client/returned` | client | Returned requirements |
| GET | `/:id` | all | Requirement detail |
| GET | `/:id/versions` | all | Version history chain |
| PUT | `/:id/assign` | admin | Assign QA analyst |
| POST | `/:id/revise` | admin, client | Create new version |
| POST | `/:id/return-client` | admin | Return to client |

### Reports — `/api/reports`
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/` | qa_analyst | Submit validation report |
| GET | `/` | all | List reports |
| GET | `/:id` | all | Report detail |
| POST | `/:id/verify` | admin | Approve or reject QA |
| POST | `/:id/return-client` | admin | Return via report |

### Employees — `/api/employees`
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/` | admin | All analysts with performance stats |
| GET | `/me` | qa_analyst | Own performance profile |
| POST | `/` | admin | Add QA analyst |
| PUT | `/:id` | admin | Edit analyst |
| DELETE | `/:id` | admin | Delete (blocked if active assignments) |

### Assessments — `/api/assessments`
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/recommendations` | admin | Mistake-pattern training alerts |
| POST | `/generate` | admin | Generate 10-question assessment |
| GET | `/` | all | List assessments |
| GET | `/history/:analystId` | admin, self | Competency history & trends |
| GET | `/:id` | all | Assessment detail |
| POST | `/:id/submit` | qa_analyst | Submit quiz answers |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checklist` | Read checklist rules |
| POST | `/api/ai/analyze` | AI comparative analysis |

---

## Navigation Structure

| Role | Sidebar Items |
|------|---------------|
| admin | Dashboard, Requirements, Reports, Employees |
| qa_analyst | Dashboard, Requirements, Reports, Employees |
| client | Client Portal |

All assessment functionality is integrated into the **Employees** module (no standalone Assessment tab).

---

## UI Module Responsibilities

### Employees Module
- QA Analyst CRUD (admin)
- Employee directory with performance metrics
- Review-decision based accuracy display
- Competency assessment generation & assignment
- Quiz taking (QA analyst self-service)
- Competency history timeline
- Category-wise performance trends
- Training recommendations

### Client Portal
- View returned requirements
- Admin feedback and return reasons
- Edit and resubmit requirements (creates new version)
- Version history timeline

### Report Verification Workspace
- Side-by-side view: Original Requirement | Current Version | QA Checklist | AI Audit
- Admin Decision Panel: Approve / Reject QA / Return Client
- "View Requirement" toggle for full traceability

### Dashboard
- Operational metrics: requirements by status, active analysts, avg accuracy
- Recent Requirements
- Pending Review Queue
- Training Overview
