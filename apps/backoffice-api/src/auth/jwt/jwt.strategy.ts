import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRoles } from '../auth.constants';

type Payload = {
  id: string;
  roles: UserRoles[];
  name: string;
};

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: Payload) {
    if (!payload.id) throw new Error('INVALID_USER');
    return { id: payload.id, roles: payload.roles, name: payload.name };
  }
}
