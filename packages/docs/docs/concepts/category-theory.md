---
sidebar_position: 2
title: Category Theory Primer
---

# Category Theory Primer

This page provides accessible definitions of the categorical concepts used in the project. Each definition is followed by a concrete "in our project, this means..." translation.

## Category

A category consists of objects, morphisms (arrows) between objects, and a composition operation that is associative with identities. **In our project**, the category $\mathbf{FinSet}/K$ has keyed record fragments as objects and key-preserving maps as morphisms.

## Functor

A functor maps objects and morphisms from one category to another while preserving composition and identities. **In our project**, a schema morphism $F: C \to D$ induces functors between database instances — these are the data migration operations (`deltaF`, `sigmaF`).

## Natural Transformation

A natural transformation is a family of morphisms that converts one functor into another in a "natural" (coherent) way. **In our project**, state reconstruction is a natural transformation from the event-log presheaf to the state presheaf: it transforms "list of events up to time t" into "state at time t" in a way that commutes with time restriction.

## Colimit

A colimit is the universal way to glue objects together along shared structure. It generalizes unions, quotients, and merges. **In our project**, entity resolution is a colimit in $\mathbf{FinSet}/K$: fragments from different bounded contexts sharing the same NPI key are merged into a single golden record. The universal property guarantees this merge is unique and deterministic.

## Adjunction

An adjunction is a pair of functors $F$ and $G$ between categories, where $F$ is "left adjoint" to $G$. Adjunctions capture the idea of a "best approximation" — $F$ freely constructs, while $G$ forgets structure. **In our project**, the schema translation triple $\Sigma_F \dashv \Delta_F \dashv \Pi_F$ governs how data moves between schemas. $\Delta_F$ (pullback) is the safe direction that never creates dangling references.

## Presheaf

A presheaf is a functor from a category's opposite into $\mathbf{Set}$ — it assigns a set of data to each object and provides restriction maps. **In our project**, the event log is a presheaf $P: T^{\mathrm{op}} \to \mathbf{Set}$ over the time poset. $P(t)$ is the set of all events up to time $t$, and the restriction map $P(t) \to P(s)$ for $s \leq t$ simply truncates the log.

## Sheaf

A sheaf is a presheaf that satisfies a **gluing condition**: if you have compatible local data on overlapping regions, there exists a unique global datum that restricts to each local piece. **In our project**, the sheaf condition guarantees that distributed replicas converge to the same state after exchanging updates — the CRDT merge operation is exactly the gluing map.

## Join-Semilattice

A join-semilattice is a set with a binary join operation that is commutative, associative, and idempotent. **In our project**, every CRDT state forms a join-semilattice. The LWW (Last-Writer-Wins) register is the primary semilattice instance: the join of two timestamped values is the one with the later timestamp.

:::info Important distinction
The CRDT merge is a join **within** a fixed semilattice — it is NOT a colimit in the category of join-semilattices ($\mathbf{JSL}$). This distinction is made explicit in the paper (Section 5) and in the code.
:::

## Further Reading

- Saunders Mac Lane, _Categories for the Working Mathematician_ — the standard reference
- David Spivak, _Category Theory for the Sciences_ — accessible introduction with applications
- Bartosz Milewski, _Category Theory for Programmers_ — free online book oriented toward software engineers
- Emily Riehl, _Category Theory in Context_ — modern, rigorous, freely available
