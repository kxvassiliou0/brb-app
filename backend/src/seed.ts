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
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason: string;
  reviewedById: number | null;
  managerNote?: string;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function inclusiveDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

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

  const admin = await userRepo.save(
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

  engManager.managerId = finManager.id;
  await userRepo.save(engManager);

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

  const createLeave = (data: SeedLeaveInput) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return leaveRepo.create({
      userId: data.userId,
      leaveType: data.leaveType,
      startDate,
      endDate,
      daysRequested: inclusiveDays(startDate, endDate),
      reason: data.reason,
      status: data.status,
      reviewedById: data.reviewedById,
      managerNote: data.managerNote ?? null,
    });
  };

  await leaveRepo.save(
    [
      {
        userId: emp1.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Approved,
        startDate: "2026-05-04",
        endDate: "2026-05-06",
        reason: "Recovering from minor surgery",
        reviewedById: engManager.id,
      },
      {
        userId: emp1.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Rejected,
        startDate: "2026-06-15",
        endDate: "2026-06-16",
        reason: "Migraine",
        reviewedById: engManager.id,
        managerNote:
          "Please use the sick-leave line instead of booking this in advance.",
      },
      {
        userId: emp1.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Rejected,
        startDate: "2026-07-20",
        endDate: "2026-07-21",
        reason: "Training course I would like to attend",
        reviewedById: engManager.id,
        managerNote:
          "Budget for training closes this quarter - resubmit in April.",
      },
      {
        userId: emp1.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Pending,
        startDate: "2026-09-14",
        endDate: "2026-09-18",
        reason: "Autumn trip",
        reviewedById: null,
      },
      {
        userId: emp1.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Pending,
        startDate: "2026-11-09",
        endDate: "2026-11-10",
        reason: "Hospital appointment",
        reviewedById: null,
      },
      {
        userId: emp1.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Cancelled,
        startDate: "2027-01-11",
        endDate: "2027-01-12",
        reason: "House move",
        reviewedById: null,
      },
      {
        userId: emp2.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Rejected,
        startDate: "2026-06-08",
        endDate: "2026-06-09",
        reason: "Feeling unwell",
        reviewedById: engManager.id,
        managerNote: "No sick note on file for these dates.",
      },
      {
        userId: emp2.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Approved,
        startDate: "2026-07-13",
        endDate: "2026-07-17",
        reason: "Summer holiday",
        reviewedById: engManager.id,
      },
      {
        userId: emp2.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Cancelled,
        startDate: "2026-08-10",
        endDate: "2026-08-11",
        reason: "Felt better than expected",
        reviewedById: null,
      },
      {
        userId: emp2.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Approved,
        startDate: "2026-09-21",
        endDate: "2026-09-22",
        reason: "Flu",
        reviewedById: engManager.id,
      },
      {
        userId: emp2.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Cancelled,
        startDate: "2026-10-19",
        endDate: "2026-10-20",
        reason: "Plans changed",
        reviewedById: null,
      },
      {
        userId: emp2.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Pending,
        startDate: "2026-12-21",
        endDate: "2026-12-24",
        reason: "Christmas with family",
        reviewedById: null,
      },
      {
        userId: emp3.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Approved,
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        reason: "Walking holiday",
        reviewedById: finManager.id,
      },
      {
        userId: emp3.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Rejected,
        startDate: "2026-07-06",
        endDate: "2026-07-07",
        reason: "Back pain",
        reviewedById: finManager.id,
        managerNote:
          "Occupational health referral needed before more sick leave is approved.",
      },
      {
        userId: emp3.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Rejected,
        startDate: "2026-08-03",
        endDate: "2026-08-07",
        reason: "Family trip",
        reviewedById: finManager.id,
        managerNote: "Two others in Finance are already away that week.",
      },
      {
        userId: emp3.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Cancelled,
        startDate: "2026-09-07",
        endDate: "2026-09-08",
        reason: "Recovered sooner than expected",
        reviewedById: null,
      },
      {
        userId: emp3.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Pending,
        startDate: "2026-10-05",
        endDate: "2026-10-06",
        reason: "Moving house",
        reviewedById: null,
      },
      {
        userId: emp3.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Pending,
        startDate: "2027-02-15",
        endDate: "2027-02-19",
        reason: "Half term",
        reviewedById: null,
      },
      {
        userId: emp4.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Approved,
        startDate: "2026-05-11",
        endDate: "2026-05-15",
        reason: "Spring break",
        reviewedById: admin.id,
      },
      {
        userId: emp4.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Rejected,
        startDate: "2026-06-22",
        endDate: "2026-06-26",
        reason: "Trip abroad",
        reviewedById: admin.id,
        managerNote: "This would take you past your remaining allowance.",
      },
      {
        userId: emp4.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Cancelled,
        startDate: "2026-08-17",
        endDate: "2026-08-21",
        reason: "Plans fell through",
        reviewedById: null,
      },
      {
        userId: emp4.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Approved,
        startDate: "2026-09-28",
        endDate: "2026-09-29",
        reason: "Family commitment",
        reviewedById: admin.id,
      },
      {
        userId: emp4.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Cancelled,
        startDate: "2026-10-26",
        endDate: "2026-10-27",
        reason: "Booked in error",
        reviewedById: null,
      },
      {
        userId: emp4.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Pending,
        startDate: "2027-01-18",
        endDate: "2027-01-19",
        reason: "Personal appointment",
        reviewedById: null,
      },
      {
        userId: engManager.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Cancelled,
        startDate: "2026-07-27",
        endDate: "2026-07-31",
        reason: "Changed plans",
        reviewedById: null,
      },
      {
        userId: engManager.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Rejected,
        startDate: "2026-08-31",
        endDate: "2026-09-04",
        reason: "Late summer break",
        reviewedById: finManager.id,
        managerNote: "Month-end reporting falls in this week.",
      },
      {
        userId: engManager.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Approved,
        startDate: "2026-10-12",
        endDate: "2026-10-12",
        reason: "Appointment",
        reviewedById: finManager.id,
      },
      {
        userId: engManager.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Pending,
        startDate: "2026-11-16",
        endDate: "2026-11-17",
        reason: "Dental surgery",
        reviewedById: null,
      },
      {
        userId: engManager.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Pending,
        startDate: "2026-12-14",
        endDate: "2026-12-15",
        reason: "Family commitment",
        reviewedById: null,
      },
      {
        userId: engManager.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Rejected,
        startDate: "2027-03-01",
        endDate: "2027-03-02",
        reason: "Personal matter",
        reviewedById: finManager.id,
        managerNote:
          "Year-end close - no leave can be approved in the first week of March.",
      },
      {
        userId: finManager.id,
        leaveType: LeaveType.Vacation,
        status: LeaveStatus.Cancelled,
        startDate: "2026-06-29",
        endDate: "2026-07-03",
        reason: "Changed plans",
        reviewedById: null,
      },
      {
        userId: finManager.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Rejected,
        startDate: "2026-08-24",
        endDate: "2026-08-25",
        reason: "Personal appointment",
        reviewedById: admin.id,
        managerNote: "Please rebook outside the audit window.",
      },
      {
        userId: finManager.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Approved,
        startDate: "2026-09-21",
        endDate: "2026-09-25",
        reason: "Family commitments",
        reviewedById: admin.id,
      },
      {
        userId: finManager.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Approved,
        startDate: "2026-11-02",
        endDate: "2026-11-04",
        reason: "Flu",
        reviewedById: admin.id,
      },
      {
        userId: finManager.id,
        leaveType: LeaveType.Sick,
        status: LeaveStatus.Pending,
        startDate: "2027-01-25",
        endDate: "2027-01-26",
        reason: "Planned procedure",
        reviewedById: null,
      },
      {
        userId: finManager.id,
        leaveType: LeaveType.Personal,
        status: LeaveStatus.Cancelled,
        startDate: "2027-03-08",
        endDate: "2027-03-09",
        reason: "No longer needed",
        reviewedById: null,
      },
    ].map(createLeave),
  );

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
    "Managers:  bob.mitchell@company.com (Senior Contractor, reports to Carol), carol.reeves@company.com (Finance Analyst)",
  );
  console.log(
    "Employees: david.jones (Contractor), eve.knowles (Contractor), frank.harrison (Finance Analyst), grace.williams (Marketing Executive) @company.com",
  );
  console.log(
    "\nLeave requests: 36 across leave year 2026-04-01 to 2027-03-31, 6 per person",
  );
  console.log(
    "Even spread: 12 Vacation, 12 Sick, 12 Personal x 9 Pending, 9 Approved, 9 Rejected, 9 Cancelled",
  );

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
