const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

/** Local wall-clock time as `HH:MM:SS.mmm`. */
const formatClock = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;

/**
 * Returns a stateful transform that prefixes each new line of PTY output with a dim timestamp.
 * Stamps are taken when the chunk arrives, so replayed scrollback keeps the original times.
 * State carries across chunks so a line split over two chunks is stamped once.
 */
export const createLineTimestamper = (): ((data: string) => string) => {
  let atLineStart = true;
  return (data: string): string => {
    if (data.length === 0) {
      return data;
    }
    const stamp = `\x1b[2m${formatClock(new Date())}\x1b[22m `;
    const parts = data.split('\n');
    const out = parts.map((part, index) => {
      const startsLine = index === 0 ? atLineStart : true;
      const blank = part.length === 0 || part === '\r';
      return startsLine && !blank ? stamp + part : part;
    });
    atLineStart = data.endsWith('\n');
    return out.join('\n');
  };
};
