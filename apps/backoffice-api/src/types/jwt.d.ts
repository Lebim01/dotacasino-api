import { UserRoles } from '../auth/auth.constants';

export type User = { id: string; name: string; roles: UserRoles[] };
export type RequestWithUser = Request & { user: User };
