export type Args = {
  first?: number | null;
  last?: number | null;
  after?: string | null;
  before?: string | null;
};

export interface PageInfo {
  startCursor: string;
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Edge<T> {
  cursor: string;
  node: T;
}

export type Entity = { id: string | number };

export class LimitError extends Error {
  constructor(arg: "first" | "last") {
    super(`${arg} must be a positive integer`);
  }
}

/**
 * RelayConnection backed by a sorted array.
 */
export default class RelayConnection<T extends Entity> {
  constructor(private nodes: T[], private args: Args) {}

  get pageInfo(): PageInfo {
    const slice = this.getSlice();
    return {
      startCursor: slice[0]?.id.toString() || "",
      endCursor: slice[slice.length - 1]?.id.toString() || "",
      hasNextPage:
        !!slice.length &&
        slice[slice.length - 1].id !== this.nodes[this.nodes.length - 1].id,
      hasPreviousPage: !!slice.length && slice[0].id !== this.nodes[0].id,
    };
  }

  get edges(): Edge<T>[] {
    return this.getSlice().map((node) => ({
      cursor: node.id.toString(),
      node,
    }));
  }

  private getSlice(): T[] {
    let slice = this.nodes;

    const afterIndex = slice.findIndex(
      (n) => n.id.toString() === this.args.after
    );
    slice = afterIndex !== -1 ? slice.slice(afterIndex + 1) : slice;
    const beforeIndex = slice.findIndex(
      (n) => n.id.toString() === this.args.before
    );
    slice = beforeIndex !== -1 ? slice.slice(0, beforeIndex) : slice;

    if (this.args.first) {
      if (this.args.first < 0) {
        throw new LimitError("first");
      }
      return slice.slice(0, this.args.first);
    } else if (this.args.last) {
      if (this.args.last < 0) {
        throw new LimitError("last");
      }
      return this.args.last < slice.length
        ? slice.slice(-this.args.last)
        : slice;
    }
    return slice;
  }
}
