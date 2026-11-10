import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecretBox } from '@common/utils/secret-box.util';
import { JwtPayload } from '@modules/auth/core/interfaces/jwt-payload.interface';
import { AuditService } from '@modules/activity/audit.service';
import { UpdateEmployeeDto, UpdateMyEmployeeDto } from './core/dto/employee.dto';

const include = { manager: { select: { username: true } }, user: { select: { id: true, username: true, display_name: true, first_name: true, last_name: true } } } as const;
type Row = Prisma.EmployeeProfileGetPayload<{ include: typeof include }>;

const date = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
const day = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const open = (v?: string | null) => (v ? SecretBox.open(v) : undefined);
const seal = (v?: string) => (v === undefined ? undefined : v === '' ? null : SecretBox.seal(v));

/**
 * Data karyawan dengan dua tingkat akses:
 * - publik (semua anggota): ID karyawan, atasan, lokasi kerja, mulai bekerja, ulang tahun (tanggal & bulan)
 * - lengkap: hanya pemilik profil dan Owner. Owner yang membuka data orang lain tercatat di log audit.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private canSeePrivate(viewer: JwtPayload, userId: number) {
    return viewer.userId === userId || viewer.positionName === 'Owner';
  }

  private toPublic(r: Row) {
    return {
      memberId: r.user.username,
      employeeId: r.employee_no ?? undefined,
      managerId: r.manager?.username,
      workLocation: r.work_location,
      office: r.office,
      startDate: date(r.start_date),
      birthday: r.birth_date ? r.birth_date.toISOString().slice(5, 10) : undefined,
      restricted: true,
    };
  }

  private toFull(r: Row) {
    return {
      ...this.toPublic(r),
      restricted: false,
      employment: r.employment,
      contractEnd: date(r.contract_end),
      birthPlace: r.birth_place ?? undefined,
      birthDate: date(r.birth_date),
      gender: r.gender ?? undefined,
      phone: r.phone ?? undefined,
      personalEmail: r.personal_email ?? undefined,
      address: r.address ?? undefined,
      nik: open(r.nik_enc),
      npwp: open(r.npwp_enc),
      bpjsKesehatan: open(r.bpjs_kesehatan_enc),
      bpjsKetenagakerjaan: open(r.bpjs_tk_enc),
      bank: r.bank_name ? { name: r.bank_name, account: open(r.bank_account_enc) ?? '', holder: r.bank_holder ?? '' } : undefined,
      emergency: r.emergency_name ? { name: r.emergency_name, relation: r.emergency_relation ?? '', phone: r.emergency_phone ?? '' } : undefined,
    };
  }

  private async userByUsername(username: string) {
    const u = await this.prisma.user.findFirst({ where: { username, deleted_at: null }, select: { id: true, kind: true, display_name: true, first_name: true, last_name: true } });
    if (!u) throw new NotFoundException('Anggota tidak ditemukan');
    if (u.kind === 'agent') throw new BadRequestException('Agent tidak punya data karyawan');
    return u;
  }

  async get(viewer: JwtPayload, username: string, ip?: string) {
    const u = await this.userByUsername(username);
    const r = await this.prisma.employeeProfile.findUnique({ where: { user_id: u.id }, include });
    if (!r) return null;
    if (!this.canSeePrivate(viewer, u.id)) return this.toPublic(r);
    if (viewer.userId !== u.id) {
      await this.audit.log(viewer.userId, 'melihat data karyawan', [u.first_name, u.last_name].filter(Boolean).join(' '), 'akses', ip);
    }
    return this.toFull(r);
  }

  private personalData(dto: UpdateMyEmployeeDto): Prisma.EmployeeProfileUncheckedUpdateInput {
    return {
      birth_place: dto.birthPlace,
      birth_date: dto.birthDate ? day(dto.birthDate) : undefined,
      gender: dto.gender,
      phone: dto.phone,
      personal_email: dto.personalEmail?.toLowerCase(),
      address: dto.address,
      nik_enc: seal(dto.nik),
      npwp_enc: seal(dto.npwp),
      bpjs_kesehatan_enc: seal(dto.bpjsKesehatan),
      bpjs_tk_enc: seal(dto.bpjsKetenagakerjaan),
      ...(dto.bank ? { bank_name: dto.bank.name, bank_account_enc: SecretBox.seal(dto.bank.account), bank_holder: dto.bank.holder } : {}),
      ...(dto.emergency ? { emergency_name: dto.emergency.name, emergency_relation: dto.emergency.relation, emergency_phone: dto.emergency.phone } : {}),
    };
  }

  /** Pemilik profil: hanya data pribadi, kontak, identitas, rekening, kontak darurat. */
  async updateMine(viewer: JwtPayload, dto: UpdateMyEmployeeDto) {
    const data = this.personalData(dto);
    await this.prisma.employeeProfile.upsert({
      where: { user_id: viewer.userId },
      create: { user_id: viewer.userId, ...(data as Prisma.EmployeeProfileUncheckedCreateInput), updated_by: viewer.userId },
      update: { ...data, updated_by: viewer.userId },
    });
    await this.audit.log(viewer.userId, 'memperbarui data pribadi', Object.keys(dto).join(', '), 'akses');
    return this.toFull(await this.prisma.employeeProfile.findUniqueOrThrow({ where: { user_id: viewer.userId }, include }));
  }

  /** Owner: semua kolom, termasuk ID karyawan, status, kontrak, atasan, lokasi kerja. */
  async updateAsOwner(viewer: JwtPayload, username: string, dto: UpdateEmployeeDto) {
    if (viewer.positionName !== 'Owner') throw new ForbiddenException('Data kepegawaian hanya bisa diubah oleh Owner');
    const u = await this.userByUsername(username);
    let managerId: number | null | undefined;
    if (dto.managerId === null) managerId = null;
    else if (dto.managerId) {
      const m = await this.prisma.user.findFirst({ where: { username: dto.managerId, kind: 'human', deleted_at: null } });
      if (!m) throw new BadRequestException(`Atasan "${dto.managerId}" tidak ditemukan`);
      if (m.id === u.id) throw new BadRequestException('Atasan tidak boleh diri sendiri');
      managerId = m.id;
    }
    const data: Prisma.EmployeeProfileUncheckedUpdateInput = {
      ...this.personalData(dto),
      employee_no: dto.employeeId,
      employment: dto.employment,
      contract_end: dto.contractEnd === undefined ? undefined : dto.contractEnd === null ? null : day(dto.contractEnd),
      start_date: dto.startDate ? day(dto.startDate) : undefined,
      manager_id: managerId,
      work_location: dto.workLocation,
      office: dto.office,
      updated_by: viewer.userId,
    };
    await this.prisma.employeeProfile.upsert({
      where: { user_id: u.id },
      create: { user_id: u.id, ...(data as Prisma.EmployeeProfileUncheckedCreateInput) },
      update: data,
    });
    await this.audit.log(viewer.userId, 'memperbarui data karyawan', `${[u.first_name, u.last_name].filter(Boolean).join(' ')} (${Object.keys(dto).join(', ')})`, 'akses');
    return this.toFull(await this.prisma.employeeProfile.findUniqueOrThrow({ where: { user_id: u.id }, include }));
  }
}
