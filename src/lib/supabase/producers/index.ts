
// Re-export all producers-related functionality from a central file
export * from './assignments';
export * from './arrangements';
// Explicitly re-export getProducers and rename getProducerRoles from workers to avoid conflict
export { getProducersByDivision, getProducers } from './workers';
// Export getProducerRoles from roles.ts (this takes precedence)
export { getProducerRoles, ensureProducerRoles } from './roles';
export * from './users';
export type { ProducerAssignment, ProducerRole, ProducerWorkArrangement } from '../types/producer.types';
