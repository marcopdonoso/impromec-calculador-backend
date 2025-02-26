import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'juan@impromec.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
