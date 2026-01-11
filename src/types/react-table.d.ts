import '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends any, TValue> {
    className?: string
    thClassName?: string
    tdClassName?: string
  }
}
