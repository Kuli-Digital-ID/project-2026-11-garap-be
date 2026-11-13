import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Minimal 8 karakter, ada huruf dan angka. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PASSWORD_MESSAGE = 'Password minimal 8 karakter dan memuat huruf serta angka';

export class LoginDto {
  @ApiProperty({ example: 'bhagaskuro@gmail.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MaxLength(72)
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Password saat ini (atau password sementara dari Admin)' })
  @IsString()
  @IsNotEmpty({ message: 'Password saat ini wajib diisi' })
  currentPassword: string;

  @ApiProperty({ example: 'rahasia2026', description: PASSWORD_MESSAGE })
  @IsString()
  @MinLength(8, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
