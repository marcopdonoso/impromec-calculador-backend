import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { MailService } from 'src/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { User } from './user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = new this.userModel({
      ...registerDto,
      password: hashedPassword,
    });

    await user.save();

    const verificationToken = this.jwtService.sign(
      {
        email: user.email,
        id: user._id,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1d',
      },
    );

    await this.mailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );

    return user;
  }

  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const user = await this.userModel.findById(decoded.id);

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      if (user.isVerified) {
        return {
          success: false,
          message: 'El correo electrónico ya ha sido verificado',
        };
      }

      user.isVerified = true;
      await user.save();

      return {
        success: true,
        message: 'Correo electrónico verificado exitosamente',
      };
    } catch (error) {
      throw new BadRequestException(
        'Token de verificación inválido o expirado',
      );
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    if (!user.isVerified) {
      throw new UnauthorizedException('Cuenta no verificada. Revisa tu email.');
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user._id,
      name: user.name,
      category: user.category,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    return {
      access_token,
      user: {
        name: user.name,
        email: user.email,
        category: user.category,
        company: user.company,
        phone: user.phone,
        location: user.location,
      },
    };
  }

  async resendVerificationEmail(user: any) {
    const existingUser = await this.userModel.findById(user.id);

    if (!existingUser) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (existingUser.isVerified) {
      throw new BadRequestException(
        'El correo electrónico ya ha sido verificado',
      );
    }

    const newVerificationToken = this.jwtService.sign(
      {
        email: existingUser.email,
        id: existingUser._id,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1d',
      },
    );

    await this.mailService.sendVerificationEmail(
      existingUser.email,
      existingUser.name,
      newVerificationToken,
    );

    return {
      message: 'Correo electrónico de verificación reenviado exitosamente',
    };
  }
}
