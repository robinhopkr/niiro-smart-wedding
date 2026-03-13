import { cn } from '@/lib/utils/cn'

interface MenuOption {
  value: string
  label: string
  emoji: string
}

interface MenuSelectProps {
  label: string
  options: ReadonlyArray<MenuOption>
  value: string[]
  onChange: (value: string[]) => void
  error?: string | undefined
  helperText?: string | undefined
}

export function MenuSelect({ label, options, value, onChange, error, helperText }: MenuSelectProps) {
  function toggleChoice(nextValue: string) {
    const currentValues = new Set(value)

    if (currentValues.has(nextValue)) {
      currentValues.delete(nextValue)
    } else {
      currentValues.add(nextValue)
    }

    onChange(Array.from(currentValues))
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-charcoal-700">{label}</legend>
      {helperText ? <p className="text-sm text-charcoal-600">{helperText}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2" aria-label={label}>
        {options.map((option) => {
          const checked = value.includes(option.value)

          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-3xl border px-4 py-4 transition',
                checked
                  ? 'border-gold-500 bg-gold-100/80 text-charcoal-900 shadow-gold'
                  : 'border-cream-300 bg-white text-charcoal-700 hover:border-gold-300',
              )}
            >
              <input
                checked={checked}
                className="sr-only"
                type="checkbox"
                value={option.value}
                onChange={() => toggleChoice(option.value)}
              />
              <span className="text-2xl">{option.emoji}</span>
              <span className="font-semibold">{option.label}</span>
            </label>
          )
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </fieldset>
  )
}
