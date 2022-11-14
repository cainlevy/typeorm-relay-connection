import { SelectQueryBuilder } from "typeorm";
import RelayConnection, {
  Args,
  Edge,
  Entity,
  LimitError,
  PageInfo,
} from "./RelayConnection";

export type SortOrder = "ASC" | "DESC";
function invertOrder(order: SortOrder): SortOrder {
  return order === "ASC" ? "DESC" : "ASC";
}

type Config = {
  limit: number;
  cursorKey: string;
  sortingKey: string;
  sortingOrder: SortOrder;
};

/**
 * constrainArgs validates and restricts pagination args within boundaries to prevent
 * overfetching.
 */
function constrainArgs(args: Args, { max }: { max: number }): Args {
  return args.first
    ? { ...args, first: Math.min(args.first, max) }
    : args.last
    ? { ...args, last: Math.min(args.last, max) }
    : args;
}

const DEFAULT_CONFIG: Config = {
  limit: 500,
  cursorKey: "id",
  sortingKey: "created_at",
  sortingOrder: "ASC",
};

/**
 * TypeORMRelayConnection implements RelayConnection functionality from a database scope.
 * The scope is executed lazily to avoid wasted queries when the connection is used
 * for aggregate information not related to any specific page.
 */
export default class TypeORMRelayConnection<T extends Entity> {
  public args: Args;
  public config: Config;

  constructor(
    public scope: SelectQueryBuilder<T>,
    args: Args,
    config: Partial<Config> = {}
  ) {
    if (!scope.expressionMap.mainAlias?.tablePath) {
      throw new Error("scope does not have a mainAlias");
    }

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.args = constrainArgs(args, { max: this.config.limit });
  }

  async pageInfo(): Promise<PageInfo> {
    return (await this.relayConnection()).pageInfo;
  }

  async edges(): Promise<Edge<T>[]> {
    return (await this.relayConnection()).edges;
  }

  private _relayConnection?: RelayConnection<T>;
  private async relayConnection(): Promise<RelayConnection<T>> {
    this._relayConnection ||= new RelayConnection(
      await this.nodes(),
      this.args
    );
    return this._relayConnection;
  }

  private _nodes?: Promise<T[]>;
  private nodes(): Promise<T[]> {
    this._nodes ||= new Promise<T[]>((resolve, reject) => {
      const nodesScope = this.scope.clone();
      // This undefined is eliminated by a constructor guard
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const mainAlias = nodesScope.expressionMap.mainAlias!;
      // This undefined is eliminated by a constructor guard
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const table = mainAlias
        .tablePath!.split(".")
        .map((i) => nodesScope.escape(i))
        .join(".");
      const alias = nodesScope.escape(mainAlias.name);
      const cursorKey = nodesScope.escape(this.config.cursorKey);
      const sortingKey = nodesScope.escape(this.config.sortingKey);
      const sortingOrder = this.config.sortingOrder;

      if (this.args.after) {
        const subselect = `(SELECT ${sortingKey} FROM ${table} WHERE ${cursorKey} = :after)`;
        nodesScope.andWhere(
          `(${alias}.${sortingKey} > ${subselect} OR (${alias}.${sortingKey} = ${subselect} AND ${alias}.${cursorKey} >= :after))`,
          { after: this.args.after }
        );
      }
      if (this.args.before) {
        const subselect = `(SELECT ${sortingKey} FROM ${table} WHERE ${cursorKey} = :before)`;
        nodesScope.andWhere(
          `(${alias}.${sortingKey} < ${subselect} OR (${alias}.${sortingKey} = ${subselect} AND ${alias}.${cursorKey} <= :before))`,
          { before: this.args.before }
        );
      }

      // TypeORM will normally dedupe entities from the results in JavaScript. When this happens,
      // the LIMIT applied in the database will not fetch enough entities to effectively hint at
      // the presence of a next page. We must dedupe in the database instead.
      nodesScope.groupBy(`${alias}.${cursorKey}`);

      // We fetch an extra on each end to detect when additional entries exist.
      // We subsort by the cursor key to resolve potential sorting key collisions.
      if (this.args.first) {
        if (this.args.first < 0) {
          throw new LimitError("first");
        }
        nodesScope
          .orderBy(`${alias}.${sortingKey}`, sortingOrder)
          .addOrderBy(`${alias}.${cursorKey}`, sortingOrder)
          .limit(this.args.first + 2)
          .getMany()
          .then(resolve, reject);
      } else if (this.args.last) {
        if (this.args.last < 0) {
          throw new LimitError("last");
        }
        nodesScope
          .orderBy(`${alias}.${sortingKey}`, invertOrder(sortingOrder))
          .addOrderBy(`${alias}.${cursorKey}`, invertOrder(sortingOrder))
          .limit(this.args.last + 2)
          .getMany()
          .then((nodes) => resolve(nodes.reverse()), reject);
      } else {
        nodesScope
          .orderBy(`${alias}.${sortingKey}`, sortingOrder)
          .addOrderBy(`${alias}.${cursorKey}`, sortingOrder)
          .limit(this.config.limit)
          .getMany()
          .then(resolve, reject);
      }
    });
    return this._nodes;
  }
}
