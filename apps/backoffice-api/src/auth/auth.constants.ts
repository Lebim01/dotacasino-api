import { Role } from "@security/roles.enum";

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  SUPPORT: 'support',
} as const;

export type UserRoles = (typeof USER_ROLES)[keyof typeof USER_ROLES];
