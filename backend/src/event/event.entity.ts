import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class EventEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column('text')
  prompt: string;

  @Column()
  time: string;

  @Column()
  isRecurring: boolean;

  @Column('simple-array')
  days: string[];

  @Column()
  specificDate: string;

  @Column()
  enableSearch: boolean;

  @Column({ nullable: true })
  lastNotified?: string;

  @Column({ nullable: true })
  chatId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @Column({ nullable: true })
  model?: string;
}
