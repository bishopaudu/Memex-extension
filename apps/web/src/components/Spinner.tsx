export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-8 h-8' }[size]
  return (
    <div className={`${s} border-2 border-primary-500 border-t-transparent
                     rounded-full animate-spin`} />
  )
}
