import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { ImportBatch } from "./import-batch.entity";

@Entity("raw_rows")
export class RawRow {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => ImportBatch, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "batch_id" })
  batch: ImportBatch;

  @Column({ name: "batch_id" })
  batchId: number;

  @Column({ name: "row_index" })
  rowIndex: number;

  // Original cells as parsed, before normalization. Portable JSON (text-backed).
  @Column({ name: "raw_data", type: "simple-json" })
  rawData: Record<string, unknown>;

  @Column({ name: "parse_error", type: "text", nullable: true })
  parseError: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
