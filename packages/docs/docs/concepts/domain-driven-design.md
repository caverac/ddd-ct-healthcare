---
sidebar_position: 1
title: Domain-Driven Design
---

# Domain-Driven Design

Domain-Driven Design (DDD) is a software design approach that centers the codebase on the core business domain. This project uses DDD to model healthcare provider directories and then applies category theory to solve the integration problems that DDD surfaces.

## Key DDD Concepts

### Bounded Contexts

A bounded context is a boundary within which a particular domain model is defined and applicable. Different teams, systems, or departments may use different models for the same real-world entity.

In healthcare, a single provider (e.g., Dr. Jane Doe) exists across **four bounded contexts**:

- **EHR (Electronic Health Records)** — knows the provider's name and practice address
- **Credentialing** — knows the provider's name and medical license number
- **Contracting** — knows which insurance networks the provider participates in
- **Directory** — the public-facing golden record that consumers query

Each context has its own schema, its own update cadence, and its own notion of what "provider data" means.

### Aggregates

An aggregate is a cluster of domain objects treated as a single unit for data changes. In our model, a `ProviderState` is an aggregate that bundles name, address, license, and network membership — all protected by Last-Writer-Wins (LWW) registers for conflict resolution.

### Domain Events

A domain event captures something that happened in the domain. Our event types (`NameUpdated`, `AddressMoved`, `LicenseRenewed`, `NetworkChanged`) form the vocabulary of state transitions. The event log is modeled as a presheaf over time.

### Anti-Corruption Layer (ACL)

An ACL translates between bounded contexts so that one context's model doesn't leak into another. In categorical terms, this is exactly the pullback functor Delta_F — it reindexes data along a schema morphism without creating dangling references.

## The Integration Problem

DDD is excellent at defining clear boundaries, but it deliberately **does not prescribe** how to integrate across those boundaries. When four contexts each hold partial, overlapping, potentially contradictory information about the same provider, you face:

1. **Entity resolution** — Which records refer to the same real-world provider?
2. **Conflict resolution** — When two contexts disagree, which value wins?
3. **Schema mismatch** — How do you safely translate data between different schemas?
4. **Temporal queries** — What did the data look like at a specific point in time?
5. **Consistency** — How do you guarantee convergence across distributed replicas?

## Why Category Theory?

Category theory provides **universal constructions** — colimits, adjunctions, presheaves, sheaves — that solve each of these problems with formal guarantees. Rather than ad-hoc integration code, we get:

- **Correctness by construction**: the colimit's universal property guarantees that entity resolution is deterministic and complete
- **Composability**: functors compose, so schema translations chain safely
- **Verifiability**: categorical laws (commutativity, associativity, idempotence) become testable properties

The next section introduces the specific categorical tools we use.
