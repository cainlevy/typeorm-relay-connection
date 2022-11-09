import "dotenv/config";
import {
  Column,
  DataSource,
  Entity,
  EntityManager,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class Author {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Book, (book) => book.author)
  books: Book[];

  @Column({ name: "created_at" })
  createdAt: Date;
}

@Entity()
export class Book {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Author, (author) => author.books)
  author: Author;
}

async function initializeDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    synchronize: true,
    entities: [Book, Author],
  });
  await dataSource.initialize();
  return dataSource;
}

let source: DataSource;
beforeAll(async () => (source = await initializeDataSource()));
afterAll(
  async () => source && source.isInitialized && (await source.destroy())
);

let manager: EntityManager;
beforeEach(async () => {
  const qr = source.createQueryRunner("master");
  await qr.startTransaction();
  manager = qr.manager;
});
afterEach(async () => {
  if (manager?.queryRunner) {
    await manager.queryRunner.rollbackTransaction();
    await manager.queryRunner.release();
  }
});

export { manager };
