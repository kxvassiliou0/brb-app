import { RoleType } from "@enums";
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from "class-validator";
import {
  BeforeInsert,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PasswordHandler } from "../helpers/PasswordHandler.ts";
import { Department } from "./Department.entity.ts";
import { JobRole } from "./JobRole.entity.ts";
import { LeaveRequest } from "./LeaveRequest.entity.ts";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @Column({ unique: true })
  @IsEmail()
  email!: string;

  @Column({ select: false })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: "Password must be at least 10 characters long" })
  password!: string;

  @Column({ length: 32, select: false })
  salt!: string;

  @Column({ type: "simple-enum", enum: RoleType })
  @IsEnum(RoleType)
  role!: RoleType;

  @Column({ default: 25 })
  @IsInt()
  @IsPositive()
  annualLeaveAllowance!: number;

  @ManyToOne(() => Department, (department: Department) => department.users)
  department!: Department;

  @Column()
  @IsInt()
  @IsPositive()
  departmentId!: number;

  @ManyToOne(() => JobRole, (jobRole: JobRole) => jobRole.users)
  jobRole!: JobRole;

  @Column()
  @IsInt()
  @IsPositive()
  jobRoleId!: number;

  @ManyToOne(() => User, (user: User) => user.subordinates, {
    nullable: true,
    onDelete: "SET NULL",
  })
  manager!: User | null;

  @Column({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId!: number | null;

  @OneToMany(() => User, (user: User) => user.manager)
  subordinates!: Array<User>;

  @OneToMany(
    () => LeaveRequest,
    (leaveRequest: LeaveRequest) => leaveRequest.user,
  )
  leaveRequests!: Array<LeaveRequest>;

  @OneToMany(
    () => LeaveRequest,
    (leaveRequest: LeaveRequest) => leaveRequest.reviewedBy,
  )
  reviewedLeaveRequests!: Array<LeaveRequest>;

  @BeforeInsert()
  hashPassword(): void {
    if (!this.password) {
      throw new Error("Password must be provided before inserting a user.");
    }
    const { hashedPassword, salt } = PasswordHandler.hashPassword(
      this.password,
    );
    this.password = hashedPassword;
    this.salt = salt;
  }
}
