/**
 * whole/src/pager.ts — the sequential pager that forces reading to the END.
 *
 * Prints a file N lines at a time (default 20), line-numbered, with a
 * mandatory-continue footer that blocks concluding until EOF. The footer is
 * the product's whole personality: YOU ARE NOT DONE... CONTINUING IS MANDATORY.
 */
export const PAGE = 20;

export interface PageResult {
  /** 1-based line to resume at next time */
  next: number;
  end: number;
  total: number;
  done: boolean;
}

/** Print lines[offset-1 .. min(total, offset+page-1)] with the footer. */
export function pageLines(
  lines: string[],
  offset: number,
  page: number,
  fpathShow: string,
): PageResult {
  const total = lines.length;
  const end = Math.min(total, offset + page - 1);
  const width = String(total).length;
  for (let i = offset; i <= end; i++) {
    console.log(`${String(i).padStart(width)}| ${lines[i - 1].replace(/\r?$/, "")}`);
  }
  console.log("\n" + "=".repeat(60));
  if (end < total) {
    console.log(">>> THIS IS NOT THE WHOLE FILE. The file continues past these lines. <<<");
    console.log(">>> YOU ARE NOT DONE. You have NOT read everything yet. <<<");
    console.log(">>> DO NOT stop. DO NOT summarize. DO NOT conclude. DO NOT move on. <<<");
    console.log(">>> The answer to the task is further down. Continuing is MANDATORY. <<<");
    console.log(`>>> RUN NOW:  whole "${fpathShow}" --next  <<<`);
  } else {
    console.log(">>> END OF FILE REACHED. You have now read the entire file. <<<");
    console.log(">>> You may analyze and conclude. No more --next is needed. <<<");
  }
  console.log("=".repeat(60));
  return { next: end + 1, end, total, done: end >= total };
}

/** Print every line with a footer-free dump (--all). */
export function printAll(lines: string[]): void {
  const width = String(lines.length).length;
  for (let i = 1; i <= lines.length; i++) {
    console.log(`${String(i).padStart(width)}| ${lines[i - 1].replace(/\r?$/, "")}`);
  }
}