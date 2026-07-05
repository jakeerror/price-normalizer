import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { BatchFormat, BatchStatus } from "../../common/enums";
import { Supplier } from "../../suppliers/entities/supplier.entity";
import { User } from "../../users/entities/user.entity";

@Entity("import_batches")
export class ImportBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Supplier, { nullable: false })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column({ name: "supplier_id" })
  supplierId: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "uploaded_by" })
  uploadedBy: User;

  @Column({ name: "uploaded_by" })
  uploadedById: number;

  @Column({ length: 255 })
  filename: string;

  @Column({ type: "simple-enum", enum: BatchFormat })
  format: BatchFormat;

  @Column({ type: "simple-enum", enum: BatchStatus, default: BatchStatus.Uploaded })
  status: BatchStatus;

  @Column({ name: "total_rows", default: 0 })
  totalRows: number;

  @Column({ name: "matched_count", default: 0 })
  matchedCount: number;

  @Column({ name: "review_count", default: 0 })
  reviewCount: number;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
