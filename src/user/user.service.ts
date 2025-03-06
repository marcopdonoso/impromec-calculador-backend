import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { User } from 'src/auth/user.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password, ...result } = user.toObject();
    return result;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.company) user.company = updateUserDto.company;
    if (updateUserDto.category) user.category = updateUserDto.category;
    if (updateUserDto.phone) user.phone = updateUserDto.phone;
    if (updateUserDto.location) user.location = updateUserDto.location;

    await user.save();

    const { password, ...result } = user.toObject();
    return result;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      try {
        const publicId = this.getPublicIdFromUrl(user.avatar);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        console.log('Error al eliminar la imagen anterior:', error);
      }
    }

    const result = await this.cloudinaryService.uploadImage(
      file,
      'impromec_avatars',
    );
    user.avatar = result.url;
    await user.save();

    const { password, ...resultUser } = user.toObject();
    return resultUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      salt,
    );

    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Contraseña cambiada exitosamente',
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      try {
        const publicId = this.getPublicIdFromUrl(user.avatar);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        console.log('Error al eliminar avatar:', error);
      }
    }

    // TODO: Eliminar proyectos asociados y otros datos relacionados

    await this.userModel.findByIdAndDelete(userId);
    return {
      message: 'Cuenta eliminada exitosamente',
    };
  }

  private getPublicIdFromUrl(url: string): string {
    const startIndex = url.lastIndexOf('/') + 1;
    const endIndex = url.lastIndexOf('.');
    return 'avatars/' + url.substring(startIndex, endIndex);
  }
}
