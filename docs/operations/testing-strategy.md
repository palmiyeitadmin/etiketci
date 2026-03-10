# Operations: Testing Strategy

## Philosophy
Test business logic aggressively. Use E2E tests for the final check of the print loop.

## Backend (.NET)
- **Unit Tests (xUnit/NUnit):** Services, DTO Validators, JWT Claim parsers, canonical model deserializers.
- **Integration Tests:** Repository layer testing with a real Postgres Testcontainer to verify EF Core LINQ correctness and foreign key constraints.

## Frontend (Next.js)
- **Unit Tests (Jest/Vitest):** The `UnitConverter.ts` is the heart of the editor. Test it exhaustively for rounding errors and mm/px translations.
- **Component Tests (React Testing Library):** Basic mounting of the Editor Canvas to ensure elements render correctly given a canonical JSON model.

## E2E (Playwright - Future Scope)
- Playwright should be used to simulate entering the Editor, creating a label, and clicking the Print Flow through to the "Did it print?" dialog.
