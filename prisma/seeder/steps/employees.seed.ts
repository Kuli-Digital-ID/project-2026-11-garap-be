import { PrismaClient } from '@prisma/client';
import { SecretBox } from '../../../src/common/utils/secret-box.util';
import { employees } from '../demo/data/employees';
import { day, IdMap, must } from './util';

/** Data karyawan demo (nomor identitas & rekening fiktif), kolom sensitif dienkripsi. */
export const seedEmployees = async (prisma: PrismaClient, users: IdMap) => {
  console.log('🪪 Data karyawan...');
  const seal = (v?: string) => (v ? SecretBox.seal(v) : null);
  for (const e of employees) {
    await prisma.employeeProfile.create({
      data: {
        user_id: must(users, e.memberId, 'Karyawan'),
        employee_no: e.employeeId,
        manager_id: e.managerId ? users.get(e.managerId) : null,
        work_location: e.workLocation,
        office: e.office,
        start_date: day(e.startDate),
        employment: e.employment,
        contract_end: day(e.contractEnd),
        birth_place: e.birthPlace,
        birth_date: day(e.birthDate),
        gender: e.gender,
        phone: e.phone,
        personal_email: e.personalEmail,
        address: e.address,
        nik_enc: seal(e.nik),
        npwp_enc: seal(e.npwp),
        bpjs_kesehatan_enc: seal(e.bpjsKesehatan),
        bpjs_tk_enc: seal(e.bpjsKetenagakerjaan),
        bank_name: e.bank?.name,
        bank_account_enc: seal(e.bank?.account),
        bank_holder: e.bank?.holder,
        emergency_name: e.emergency?.name,
        emergency_relation: e.emergency?.relation,
        emergency_phone: e.emergency?.phone,
      },
    });
  }
  console.log(`   ${employees.length} karyawan`);
};
