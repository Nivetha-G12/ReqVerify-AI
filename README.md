# ReqVerify-AI

## AI-Powered Software Requirement Validation & QA Competency Platform

ReqVerify-AI is a full-stack web application designed to improve the quality of software requirements and measure QA analyst competency.

The platform manages the requirement validation lifecycle between **Clients, QA Analysts, and Administrators**. It combines rule-based requirement validation with AI-powered analysis to detect ambiguity, missing information, edge cases, and potential requirement gaps.

It also tracks QA validation mistakes and generates personalized scenario-based assessments to help analysts improve their requirement validation skills.

---

## 🚀 Key Features

### 👥 Role-Based Access Control

The system provides three different user roles:

- **Client**
  - Submit software requirements
  - View returned requirements
  - Edit requirements
  - Create new requirement versions
  - Add change notes during resubmission

- **QA Analyst**
  - View assigned requirements
  - Validate requirements against quality rules
  - Run AI-powered requirement audits
  - Add validation findings and annotations
  - Submit validation reports
  - Complete competency assessments
  - Track assessment performance

- **Admin**
  - Upload and ingest requirements
  - Assign requirements to QA Analysts
  - Review QA validation reports
  - Approve or reject QA validations
  - Return requirements to clients
  - Track QA analyst performance
  - Generate targeted competency assessments
  - Manage users and staff

---

## 🔍 Requirement Validation

ReqVerify-AI validates requirements using **8 quality rules**:

1. Clarity
2. Completeness
3. Consistency
4. Testability
5. Acceptance Criteria
6. Business Rules
7. Validation Rules
8. Exception Handling

The QA Analyst performs manual checklist validation and can also run an AI-powered audit.

---

## 🧠 AI-Powered Requirement Analysis

The system uses the **OpenAI API** to analyze software requirements and identify:

- Ambiguous statements
- Missing information
- Requirement gaps
- Missing edge cases
- Potential inconsistencies
- Suggested requirement improvements
- Recommended rewrites

### AI Analysis Flow

```text
Requirement Specification
        ↓
PDF/Text Extraction
        ↓
Manual 8-Rule Validation
        ↓
AI Comparative Analysis
        ↓
Ambiguity & Gap Detection
        ↓
Suggested Improvements
        ↓
QA Validation Report
