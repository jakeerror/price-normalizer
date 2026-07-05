import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { UserRole } from "../../common/enums";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ name: "full_name", length: 255 })
  fullName: string;

  // Never serialized to API responses; excluded from default selects.
  @Column({ name: "password_hash", length: 255, select: false })
  passwordHash: string;

  @Column({ type: "simple-enum", enum: UserRole })
  role: UserRole;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
