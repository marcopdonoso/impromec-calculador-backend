import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
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

    const verificationToken = randomBytes(32).toString('hex');

    const user = new this.userModel({
      ...registerDto,
      password: hashedPassword,
      verificationToken,
    });

    await user.save();

    await this.mailService.sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );

    return user;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

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

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      }),
    };
  }
}
