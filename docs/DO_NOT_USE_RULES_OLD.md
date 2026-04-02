# RULES.md

## Purpose

This document defines the required standards for all work performed on this codebase. These rules apply to all features, refactors, bug fixes, design updates, architecture decisions, and documentation changes.

These rules are intended to be applicable to both new and existing applications.

The goal is to ensure that every application is built systematically, consistently, professionally, and in a way that scales over time.

---

## Scope

These rules apply to:

- new applications
- existing applications
- frontend code
- backend code
- shared libraries
- design systems
- APIs
- internal tools
- admin portals
- dashboards
- websites
- mobile-capable interfaces where applicable
- refactors
- bug fixes
- maintenance changes

---

## Core Principles

- Build with consistency across design, behavior, structure, and naming.
- Prefer reuse, extension, and refactoring over duplication.
- Keep a single source of truth for shared logic, models, states, and patterns.
- Design for maintainability, scalability, accessibility, and clarity.
- Ship production-ready work, not temporary-looking patches.
- Make decisions that improve the system, not only the immediate task.
- Keep implementations simple, clear, and extensible.
- Ensure each addition fits the overall product architecture and user experience.
- Improve touched areas whenever safe and practical.
- Avoid introducing new technical debt.

---

## Mandatory Working Process

For every request, task, feature, or change, follow this order:

1. Understand the request fully before implementing.
2. Inspect the existing codebase, components, patterns, functions, and architecture first.
3. Identify whether the requested functionality, or something similar, already exists.
4. Reuse, extend, or refactor existing implementations wherever possible.
5. Avoid creating duplicate components, duplicate functions, duplicate styles, duplicate workflows, or duplicate business logic.
6. Ensure the solution aligns with existing design patterns and interaction patterns.
7. Verify that the implementation is scalable and maintainable.
8. Confirm that the change does not create a second source of truth.
9. Validate that the final result is consistent, accessible, and production-ready.
10. Summarize what was reused, refactored, standardized, or consolidated.

---

## Legacy Code Rule

For existing applications, do not rewrite large areas unnecessarily.

When touching existing code:

- bring the affected area closer to current standards
- remove duplication where safe
- consolidate similar logic where practical
- improve naming, structure, and consistency incrementally
- improve accessibility where practical
- improve maintainability where practical
- avoid introducing new technical debt
- avoid broad rewrites unless requested or clearly justified
- preserve stable behavior unless a change is required
- document significant refactors when needed

For legacy systems, prefer incremental improvement over disruptive rewrites unless a larger refactor is explicitly requested.

---

## Duplication Prevention Rule

Before adding any new code, always check whether an equivalent or similar implementation already exists.

This includes checking for duplication in:

- components
- pages
- layouts
- hooks
- utility functions
- services
- API clients
- models
- types and interfaces
- validation schemas
- constants
- status definitions
- formatting helpers
- state management logic
- business rules
- table patterns
- form patterns
- modal patterns
- notification patterns
- styles and design tokens
- workflow logic

If an equivalent or near-equivalent already exists, do one of the following:

- reuse it
- extend it
- generalize it
- refactor it
- consolidate duplicates into one shared implementation

Do not create another implementation that solves the same problem unless there is a clearly justified architectural reason.

If duplication is discovered during work, prefer fixing and consolidating the current implementation rather than adding another one.

---

## Single Source of Truth Rule

Every shared concern must have one clear source of truth.

Avoid duplicating:

- business rules
- validation rules
- statuses
- permissions
- route definitions
- API contracts
- display mappings
- constants
- derived state
- formatting logic
- shared labels
- configuration values

Centralize shared concerns where appropriate and reference them consistently.

Do not scatter the same logic or definitions across multiple files unless there is a deliberate and justified separation of responsibility.

---

## Design Consistency Rules

All user interfaces must feel like they belong to one coherent system.

Maintain consistency in:

### Layout

- page structure
- section spacing
- grid spacing
- container widths
- alignment
- visual hierarchy
- sidebar/header/content relationships
- responsive behavior

### Typography

- heading levels
- body text sizes
- labels
- captions
- helper text
- error text
- link styling
- table text
- button text

### Components

- buttons
- inputs
- textareas
- selects
- checkboxes
- radios
- toggles
- tables
- cards
- badges
- alerts
- toasts
- tabs
- modals
- drawers
- dropdowns
- pagination
- search inputs
- empty states
- loaders
- skeletons

### Visual Language

- color usage
- status colors
- spacing scale
- border radius
- shadows
- borders
- icon sizing
- icon usage
- elevation
- hover effects
- focus states

Do not introduce one-off design patterns if an existing pattern can be reused or extended.

If no pattern exists, create one that is reusable and can serve as the standard going forward.

---

## Interaction and Behavior Consistency Rules

Similar actions must behave the same way throughout the application.

Maintain consistency in:

- navigation behavior
- row click behavior
- form submit behavior
- save/cancel placement
- confirmation dialogs
- destructive actions
- filtering behavior
- sorting behavior
- searching behavior
- pagination behavior
- loading behavior
- error handling
- validation messaging
- success feedback
- empty state behavior
- keyboard interactions
- modal and drawer interactions

Do not make similar workflows behave differently without a clear and documented reason.

---

## Scalability Rules

All work should support future growth.

Design and implement with scalability in mind for:

### Code Scalability

- modular structure
- separation of concerns
- reusable abstractions
- clean APIs between layers
- predictable organization
- extensible component props
- clear domain boundaries

### Product Scalability

- new modules
- new roles and permissions
- new statuses and workflows
- larger datasets
- more filters and search options
- additional integrations
- more pages and navigation items
- regionalization or localization
- future reporting and analytics needs

### UI Scalability

- long text handling
- additional columns in tables
- additional cards or widgets in dashboards
- larger forms
- responsive layouts
- conditional states
- growing data complexity

Avoid solutions that only work for the current small case if they are likely to block future development.

---

## Architecture Rules

Each implementation must respect clean separation of responsibilities.

Before introducing code, verify:

- Is this the correct layer for this logic?
- Does this belong in the UI, domain, service, data, or infrastructure layer?
- Is business logic leaking into presentation code?
- Is data transformation duplicated unnecessarily?
- Is the solution tightly coupled to one page when it should be reusable?
- Will another engineer understand where this code belongs?

Prefer:

- composition over duplication
- clear interfaces over implicit coupling
- modular design over monolithic files
- predictable structure over ad hoc organization
- explicit data flow over hidden side effects

---

## Naming Rules

Use names that are:

- clear
- descriptive
- consistent
- domain-appropriate
- easy to search
- not overly abbreviated

Apply consistent naming conventions across:

- files
- folders
- components
- hooks
- services
- functions
- variables
- constants
- types
- schemas
- routes
- events
- actions

If a naming convention already exists in the codebase, follow it consistently.

Do not introduce alternate naming patterns for the same concept.

---

## Component Rules

When creating or modifying components:

- keep them focused and understandable
- avoid embedding unrelated business logic
- make reusable components configurable without overcomplicating them
- avoid premature abstraction, but extract repeated patterns once repetition is clear
- keep APIs predictable
- maintain visual and behavioral consistency
- support disabled, loading, error, and empty states where relevant
- support accessibility requirements

If multiple components solve nearly the same problem, consolidate them where practical.

---

## Form Rules

All forms must be consistent, clear, and robust.

Checklist:

- clear labels
- consistent required and optional indicators
- sensible default values
- helper text where useful
- inline validation where appropriate
- clear error messaging
- success feedback where appropriate
- loading/submitting state
- disabled state handling
- keyboard accessibility
- predictable button placement
- avoid duplicated validation logic
- prefer schema-driven or centralized validation when possible

Do not leave forms in a partially validated or inconsistent state.

---

## Table and List Rules

Tables and lists should be designed systematically.

Checklist:

- clear headers
- consistent alignment
- predictable sorting behavior
- useful filtering behavior
- useful search behavior
- loading state
- empty state
- error state
- pagination when needed
- graceful overflow handling
- consistent row actions
- readable status indicators
- consistent formatting for dates, numbers, and identifiers

Do not create unique table behavior for each screen unless there is a strong reason.

---

## State and Workflow Rules

Statuses, workflows, and transitions must be standardized and controlled.

Rules:

- define statuses centrally where possible
- define allowed transitions clearly
- use consistent naming for statuses
- use consistent visual treatment for statuses
- prevent invalid transitions
- avoid hardcoding status definitions in many places
- ensure state changes are reflected consistently across the system
- log or track meaningful state changes where appropriate

Do not implement the same workflow differently in multiple places.

---

## Error Handling Rules

Handle failures intentionally and consistently.

Requirements:

- do not fail silently
- surface user-friendly error messages
- preserve useful debugging details for developers where appropriate
- distinguish between empty states and error states
- show validation errors clearly
- handle partial failures intentionally
- provide retry behavior where useful
- protect destructive actions with confirmation where needed

Every meaningful operation should have a defined failure path.

---

## Accessibility Rules

Accessibility is required, not optional.

Ensure:

- keyboard navigability
- visible focus states
- semantic structure
- accessible labels
- proper use of ARIA where necessary
- adequate color contrast
- status is not communicated by color alone
- interactive elements are reachable and understandable
- error messages are accessible
- modals, menus, and dropdowns are operable by keyboard and assistive technologies

Do not ship inaccessible interaction patterns if they can reasonably be avoided.

---

## Performance Rules

Performance must be considered during implementation.

Avoid:

- unnecessary re-renders
- duplicate API requests
- duplicate data fetching
- oversized client state
- premature heavy computations in render paths
- loading excessive data when pagination or filtering should be used

Prefer:

- efficient data flow
- pagination for large datasets
- lazy loading when appropriate
- selective memoization when justified
- efficient rendering for repeated UI patterns

Do not sacrifice maintainability for micro-optimizations, but do not ignore obvious inefficiencies.

---

## Security and Data Integrity Rules

Protect data and user actions.

Checklist:

- validate inputs
- enforce permissions and access control
- confirm destructive actions
- avoid exposing sensitive information
- handle identifiers safely
- preserve data integrity across updates
- avoid trusting client-only constraints
- log or audit critical actions where appropriate

Security-sensitive logic must not be implemented casually or inconsistently.

---

## Documentation Rules

Document changes when documentation is needed for correct understanding or future maintenance.

Document:

- new architecture decisions
- new shared patterns
- new environment variables
- new workflows
- new statuses
- new setup steps
- migrations
- non-obvious implementation constraints
- important tradeoffs

Documentation should be clear, concise, and practical.

---

## Testing Rules

Every meaningful change should be evaluated for test impact.

Consider:

- unit tests for business logic
- component tests for reusable UI
- integration tests for workflows
- regression checks for modified behavior
- edge cases
- validation scenarios
- permission scenarios
- failure scenarios

If tests are not added for a meaningful change, provide a clear reason.

Do not change critical behavior without considering how it will be verified.

---

## Refactor-First Rule

If a request overlaps with existing functionality, prefer the following order:

1. inspect the current implementation
2. identify what already works
3. identify gaps
4. refactor to support the new requirement
5. extend the refactored implementation
6. remove or consolidate obsolete duplication

Do not solve overlap by copying the old implementation and creating a parallel version.

---

## Production Readiness Rules

Before finalizing any change, verify that it is production-ready.

Checklist:

- no placeholder text
- no unfinished sections
- no dead code
- no commented-out obsolete code
- no unnecessary console logging
- no obvious UI inconsistencies
- no broken states
- no missing loading or error handling where needed
- no unexplained magic values
- no duplicate logic introduced
- no naming inconsistencies
- no obvious maintainability issues

Every delivered change should look intentional and complete.

---

## Review Checklist

Before considering any task complete, verify all of the following:

- Did I inspect existing implementations first?
- Did I avoid duplication?
- Did I reuse or refactor where appropriate?
- Is there only one source of truth for shared logic?
- Is the design consistent with the rest of the product?
- Is behavior consistent with similar features?
- Is the architecture clean and appropriately layered?
- Is the naming consistent?
- Is the implementation scalable?
- Is the solution accessible?
- Are loading, error, success, and empty states handled?
- Is the solution maintainable by another engineer?
- Is the code and UI production-ready?

If any answer is no, revise before finalizing.

---

## Existing App Audit Recommendation

For existing applications, periodic audits are recommended to identify:

- duplicate components
- duplicate utilities
- inconsistent naming
- inconsistent statuses
- duplicated business logic
- inconsistent UI patterns
- missing accessibility support
- architectural drift
- dead code
- outdated patterns
- performance bottlenecks
- untested critical paths

When practical, address these issues incrementally as related work is performed.

---

## Do Not Rules

Do not:

- create duplicate functions for existing logic
- create duplicate components with only small differences
- duplicate styles instead of reusing tokens or shared patterns
- hardcode repeated labels, statuses, rules, or mappings in many places
- create a second source of truth
- invent one-off UI patterns unnecessarily
- mix domain logic and presentation carelessly
- leave dead code after refactoring
- bypass validation or permission checks
- patch over architectural problems by copying code
- implement inconsistent error handling
- add features without considering scalability
- ship partial or visually inconsistent work
- prioritize speed over system quality when the result creates long-term maintenance problems

---

## Default Implementation Standard

When in doubt, choose the option that is:

- more consistent
- more reusable
- less duplicative
- easier to maintain
- easier to scale
- more accessible
- more predictable
- more professional

If a tradeoff must be made, prefer long-term system quality over short-term convenience.

---

## Final Instruction

Every change must improve the overall system.

Do not merely complete the requested task. Ensure the result strengthens the codebase, design system, and product consistency while avoiding duplication and preserving scalability.
