-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_no" TEXT,
    "manager_id" INTEGER,
    "work_location" TEXT NOT NULL DEFAULT 'Kantor',
    "office" TEXT NOT NULL DEFAULT 'Jakarta Selatan',
    "start_date" DATE,
    "employment" TEXT NOT NULL DEFAULT 'Tetap',
    "contract_end" DATE,
    "birth_place" TEXT,
    "birth_date" DATE,
    "gender" TEXT,
    "phone" TEXT,
    "personal_email" TEXT,
    "address" TEXT,
    "nik_enc" TEXT,
    "npwp_enc" TEXT,
    "bpjs_kesehatan_enc" TEXT,
    "bpjs_tk_enc" TEXT,
    "bank_name" TEXT,
    "bank_account_enc" TEXT,
    "bank_holder" TEXT,
    "emergency_name" TEXT,
    "emergency_relation" TEXT,
    "emergency_phone" TEXT,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employee_no_key" ON "employee_profiles"("employee_no");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
