import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity()
export class ChatEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  timestamp: number;

  @OneToMany(() => MessageEntity, (message) => message.chat, {
    cascade: true,
    eager: true,
  })
  messages: MessageEntity[];
}
