import { LeaveStatus, LeaveType, RoleType } from "@enums";
import { config } from "dotenv";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppDataSource } from "./data_source.ts";
import { Department } from "./entities/Department.entity.ts";
import { JobRole } from "./entities/JobRole.entity.ts";
import { LeaveRequest } from "./entities/LeaveRequest.entity.ts";
import { User } from "./entities/User.entity.ts";

config();

type SeedUserInput = {
  firstname: string;
  surname: string;
  email: string;
  password: string;
  role: RoleType;
  annualLeaveAllowance: number;
  departmentId: number;
  jobRoleId: number;
  managerId: number | null;
};

type SeedLeaveInput = {
  userId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  status: LeaveStatus;
  reason: string | null;
  daysRequested: number;
  reviewedById: number | null;
};

async function dropAllTables(): Promise<void> {
  const cleanupSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
  });

  await cleanupSource.initialize();
  await cleanupSource.query("SET FOREIGN_KEY_CHECKS = 0");
  await cleanupSource.query("DROP TABLE IF EXISTS `leave_request`");
  await cleanupSource.query("DROP TABLE IF EXISTS `user`");
  await cleanupSource.query("DROP TABLE IF EXISTS `job_role`");
  await cleanupSource.query("DROP TABLE IF EXISTS `role`");
  await cleanupSource.query("DROP TABLE IF EXISTS `department`");
  await cleanupSource.query("SET FOREIGN_KEY_CHECKS = 1");
  await cleanupSource.destroy();
}

async function seed() {
  await dropAllTables();
  await AppDataSource.initialize();

  const departmentRepo = AppDataSource.getRepository(Department);
  const jobRoleRepo = AppDataSource.getRepository(JobRole);
  const userRepo = AppDataSource.getRepository(User);
  const leaveRepo = AppDataSource.getRepository(LeaveRequest);

  const [engineering, hr, finance, marketing] = await departmentRepo.save([
    departmentRepo.create({ name: "Engineering" }),
    departmentRepo.create({ name: "Human Resources" }),
    departmentRepo.create({ name: "Finance" }),
    departmentRepo.create({ name: "Marketing" }),
  ]);

  const [
    contractor,
    seniorContractor,
    hrSpecialist,
    financeAnalyst,
    marketingExecutive,
  ] = await jobRoleRepo.save([
    jobRoleRepo.create({ name: "Contractor" }),
    jobRoleRepo.create({ name: "Senior Contractor" }),
    jobRoleRepo.create({ name: "HR Specialist" }),
    jobRoleRepo.create({ name: "Finance Analyst" }),
    jobRoleRepo.create({ name: "Marketing Executive" }),
  ]);

  const createUser = (data: SeedUserInput) =>
    userRepo.create({
      firstName: data.firstname,
      lastName: data.surname,
      email: data.email,
      password: data.password,
      role: data.role,
      annualLeaveAllowance: data.annualLeaveAllowance,
      departmentId: data.departmentId,
      jobRoleId: data.jobRoleId,
      managerId: data.managerId,
    });

  await userRepo.save(
    createUser({
      firstname: "Alice",
      surname: "Thompson",
      email: "alice.thompson@company.com",
      password: "Password123!",
      role: RoleType.Admin,
      annualLeaveAllowance: 25,
      departmentId: hr.id,
      jobRoleId: hrSpecialist.id,
      managerId: null,
    }),
  );

  const [engManager, finManager] = await userRepo.save([
    createUser({
      firstname: "Bob",
      surname: "Mitchell",
      email: "bob.mitchell@company.com",
      password: "Password123!",
      role: RoleType.Manager,
      annualLeaveAllowance: 25,
      departmentId: engineering.id,
      jobRoleId: seniorContractor.id,
      managerId: null,
    }),
    createUser({
      firstname: "Carol",
      surname: "Reeves",
      email: "carol.reeves@company.com",
      password: "Password123!",
      role: RoleType.Manager,
      annualLeaveAllowance: 25,
      departmentId: finance.id,
      jobRoleId: financeAnalyst.id,
      managerId: null,
    }),
  ]);

  const [emp1, emp2, emp3, emp4] = await userRepo.save([
    createUser({
      firstname: "David",
      surname: "Jones",
      email: "david.jones@company.com",
      password: "Password123!",
      role: RoleType.Employee,
      annualLeaveAllowance: 25,
      departmentId: engineering.id,
      jobRoleId: contractor.id,
      managerId: engManager.id,
    }),
    createUser({
      firstname: "Eve",
      surname: "Knowles",
      email: "eve.knowles@company.com",
      password: "Password123!",
      role: RoleType.Employee,
      annualLeaveAllowance: 25,
      departmentId: engineering.id,
      jobRoleId: contractor.id,
      managerId: engManager.id,
    }),
    createUser({
      firstname: "Frank",
      surname: "Harrison",
      email: "frank.harrison@company.com",
      password: "Password123!",
      role: RoleType.Employee,
      annualLeaveAllowance: 25,
      departmentId: finance.id,
      jobRoleId: financeAnalyst.id,
      managerId: finManager.id,
    }),
    createUser({
      firstname: "Grace",
      surname: "Williams",
      email: "grace.williams@company.com",
      password: "Password123!",
      role: RoleType.Employee,
      annualLeaveAllowance: 25,
      departmentId: marketing.id,
      jobRoleId: marketingExecutive.id,
      managerId: null,
    }),
  ]);

  const createLeave = (data: SeedLeaveInput) =>
    leaveRepo.create({
      userId: data.userId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      daysRequested: data.daysRequested,
      reason: data.reason,
      status: data.status,
      reviewedById: data.reviewedById,
    });

  await leaveRepo.save([
    createLeave({
      userId: emp1.id,
      leaveType: LeaveType.Vacation,
      startDate: new Date("2026-04-07"),
      endDate: new Date("2026-04-11"),
      daysRequested: 5,
      reason: "Family holiday",
      status: LeaveStatus.Approved,
      reviewedById: engManager.id,
    }),
    createLeave({
      userId: emp1.id,
      leaveType: LeaveType.Sick,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-05-02"),
      daysRequested: 2,
      reason: "Feeling unwell",
      status: LeaveStatus.Pending,
      reviewedById: null,
    }),
    createLeave({
      userId: emp2.id,
      leaveType: LeaveType.Personal,
      startDate: new Date("2026-03-24"),
      endDate: new Date("2026-03-24"),
      daysRequested: 1,
      reason: "Personal appointment",
      status: LeaveStatus.Rejected,
      reviewedById: engManager.id,
    }),
    createLeave({
      userId: emp3.id,
      leaveType: LeaveType.Vacation,
      startDate: new Date("2026-06-02"),
      endDate: new Date("2026-06-13"),
      daysRequested: 10,
      reason: "Summer holiday",
      status: LeaveStatus.Approved,
      reviewedById: finManager.id,
    }),
    createLeave({
      userId: emp4.id,
      leaveType: LeaveType.Vacation,
      startDate: new Date("2026-04-14"),
      endDate: new Date("2026-04-18"),
      daysRequested: 5,
      reason: "Easter break",
      status: LeaveStatus.Cancelled,
      reviewedById: null,
    }),
    createLeave({
      userId: emp2.id,
      leaveType: LeaveType.Vacation,
      startDate: new Date("2026-07-14"),
      endDate: new Date("2026-07-25"),
      daysRequested: 10,
      reason: "Summer holiday",
      status: LeaveStatus.Pending,
      reviewedById: null,
    }),
  ]);

  console.log("Seed complete.");
  console.log(
    "\nDepartments: Engineering, Human Resources, Finance, Marketing",
  );
  console.log(
    "\nJob Roles: Contractor, Senior Contractor, HR Specialist, Finance Analyst, Marketing Executive",
  );
  console.log("\nAccounts (password: Password123!)");
  console.log("Admin:     alice.thompson@company.com  (HR Specialist)");
  console.log(
    "Managers:  bob.mitchell@company.com (Senior Contractor), carol.reyes@company.com (Finance Analyst)",
  );
  console.log(
    "Employees: david.jones (Contractor), eve.knowles (Contractor), frank.harrison (Finance Analyst), grace.williams (Marketing Executive) @company.com",
  );

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
