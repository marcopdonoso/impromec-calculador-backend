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
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification-by-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar el correo de verificación proporcionando el email',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Correo de verificación reenviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuario ya verificado o correo no encontrado',
  })
  async resendVerificationByEmail(@Body() { email }: ResendVerificationDto) {
    return this.authService.resendVerificationByEmail(email);
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

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recuperar contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Correo de recuperación de contraseña enviado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Correo no registrado',
  })
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Token de restablecimiento de contraseña inválido o expirado',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Request() req,
    @Query('token') queryToken?: string,
  ) {
    // Obtener token de la query o del cuerpo
    const token = queryToken || resetPasswordDto.token;

    // Si hay token, usarlo para resetear
    if (token) {
      return this.authService.resetPasswordWithToken(
        resetPasswordDto.newPassword,
        token,
      );
    }

    // Si no hay token pero hay usuario autenticado
    if (req.user && req.user.sub) {
      const userId = req.user.sub;
      return this.authService.resetPassword(
        resetPasswordDto.newPassword,
        userId,
      );
    }

    throw new BadRequestException(
      'Token de restablecimiento de contraseña inválido o expirado',
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener información del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario obtenida exitosamente',
    schema: { example: { name: 'John Doe', email: '6X8kI@example.com' } },
  })
  async me(@Request() req) {
    return this.authService.me(req.user.sub);
  }
}
