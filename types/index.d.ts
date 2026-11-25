export type Snow = {
  /** Context fill now, 0 to 100. */
  level: number
  /** Where the pile animates from on this change. */
  from: number
  /** True while the pile is melting after a compaction. */
  isMelting: boolean
  /** When the change began, in $.clock.now() milliseconds. */
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    snowfall: { snow: Shaped<Snow> }
  }
}
