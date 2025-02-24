import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (info?.name === 'TokenExpiredError' && user) {
      return user;
    }
    return user || null;
  }
}
