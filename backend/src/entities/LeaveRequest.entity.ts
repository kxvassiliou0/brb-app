import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";
import { LeaveStatus, LeaveType } from "@enums";
import { User } from "./User.entity.ts";

@Entity()
export class LeaveRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "date" })
  @IsDate()
  startDate!: Date;

  @Column({ type: "date" })
  @IsDate()
  endDate!: Date;

  @Column()
  @IsInt()
  @IsPositive()
  daysRequested!: number;

  @Column({ type: "simple-enum", enum: LeaveType, default: LeaveType.Vacation })
  @IsEnum(LeaveType)
  leaveType!: LeaveType;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  reason!: string | null;

  @Column({
    type: "simple-enum",
    enum: LeaveStatus,
    default: LeaveStatus.Pending,
  })
  @IsEnum(LeaveStatus)
  status!: LeaveStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user: User) => user.leaveRequests, {
    onDelete: "CASCADE",
  })
  user!: User;

  @Column()
  @IsInt()
  @IsPositive()
  userId!: number;

  @ManyToOne(() => User, (user: User) => user.reviewedLeaveRequests, {
    nullable: true,
    onDelete: "SET NULL",
  })
  reviewedBy!: User | null;

  @Column({ nullable: true })
  @IsOptional()
  @IsInt()
  reviewedById!: number | null;

  @Column({ type: "text", nullable: true })
  @IsOptional()
  @IsString()
  managerNote!: string | null;
}
