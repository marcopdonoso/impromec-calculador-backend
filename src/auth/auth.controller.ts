import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MailService } from 'src/mail/mail.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

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
}
