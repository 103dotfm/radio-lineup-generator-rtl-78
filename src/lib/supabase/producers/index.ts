
// Re-export all producers-related functionality from a central file
export * from './assignments';
export * from './arrangements';
export * from './workers';
export * from './users';
// Export from roles.ts with a specific import to avoid naming conflicts
export { ProducerRole, ensureProducerRoles } from './roles';
// Import and re-export the getProducerRoles from roles.ts, not from workers.ts
import { getProducerRoles as getRolesSorted } from './roles';
export { getRolesSorted as getProducerRolesOrdered };
export type { ProducerAssignment, ProducerWorkArrangement } from '../types/producer.types';
