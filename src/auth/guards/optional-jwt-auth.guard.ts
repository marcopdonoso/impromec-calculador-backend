import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Sobrescribir el método handleRequest para no lanzar excepciones
  // si no hay token o el token es inválido
  handleRequest(err, user, info) {
    // Si hay un error pero tenemos usuario, devolvemos el usuario
    if (info?.name === 'TokenExpiredError' && user) {
      return user;
    }

    // Si no hay error y hay usuario, devolvemos el usuario
    if (!err && user) {
      return user;
    }

    // Si hay error o no hay usuario, simplemente devolvemos null
    // en lugar de lanzar una excepción
    return null;
  }
}
