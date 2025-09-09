export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  SYSTEM: 'SYSTEM',
} as const;

export type UserRoles = (typeof USER_ROLES)[keyof typeof USER_ROLES];
