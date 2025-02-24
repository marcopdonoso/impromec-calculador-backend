import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({
    status: 409,
    description: 'El correo electrónico ya está registrado',
  })
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    const { password, ...result } = user.toObject();
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Devuelve el token JWT',
    schema: { example: { access_token: 'jwt_token' } },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar el correo electrónico' })
  @ApiResponse({
    status: 200,
    description: 'Correo electrónico verificado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Token de verificación inválido o expirado',
  })
  @ApiResponse({
    status: 409,
    description: 'El correo electrónico ya ha sido verificado',
  })
  async verifyEmail(@Query('token') token: string) {
    try {
      const result = await this.authService.verifyEmail(token);

      if (result.success) {
        return {
          success: true,
          message: result.message,
        };
      }

      return {
        success: false,
        message: result.message,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('resend-verification-email')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar el correo de verificación' })
  @ApiResponse({
    status: 200,
    description: 'Correo de verificación reenviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuario ya verificado o token inválido',
  })
  async resendVerificationEmail(@Request() req) {
    const user = req.user; // Obtiene el usuario autenticado
    if (!user) {
      throw new BadRequestException('El token es inválido o faltante.');
    }
    return this.authService.resendVerificationEmail(user);
  }
}
