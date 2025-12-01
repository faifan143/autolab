import { Request } from 'express';
import { UserRole } from '../../users/schemas/user.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    role: UserRole;
  };
}
